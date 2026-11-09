import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { randomUUID } from 'expo-crypto'

import { useUserId } from '@/features/profile/api'
import { PAGE_SIZE, queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type ConversationRow = Database['public']['Functions']['list_my_conversations']['Returns'][number]
export type Message = Database['public']['Tables']['messages']['Row'] & {
  /** Local-only state while a message is being sent. */
  pending?: boolean
  failed?: boolean
}
type MessagePages = InfiniteData<Message[], string | null>

export const MESSAGE_PAGE_SIZE = 30
export const MAX_MESSAGE_LENGTH = 2000

// ---------------------------------------------------------------- conversation list

export function useConversations() {
  const userId = useUserId()
  return useInfiniteQuery({
    queryKey: queryKeys.conversations(userId),
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc('list_my_conversations', {
        p_limit: PAGE_SIZE,
        p_offset: pageParam,
      })
      if (error) throw error
      return data
    },
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length < PAGE_SIZE ? undefined : pages.reduce((n, p) => n + p.length, 0),
    enabled: userId !== '',
  })
}

/** Total unread messages across the first page of conversations (badge). */
export function useUnreadCount(): number {
  const conversations = useConversations()
  return (conversations.data?.pages[0] ?? []).reduce((n, c) => n + c.unread_count, 0)
}

// ---------------------------------------------------------------- one conversation

export type ConversationInfo = {
  id: string
  experienceId: string
  experienceTitle: string | null
  experienceCoverUrl: string | null
  other: { id: string; fullName: string; avatarUrl: string | null }
  /** True when the viewer is the host of the plan. */
  viewerIsHost: boolean
}

export function useConversation(id: string) {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: async (): Promise<ConversationInfo> => {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          'id, experience_id, explorer_id, host_id, experience:experiences(title, cover_url), explorer:profiles!conversations_explorer_id_fkey(id, full_name, avatar_url), host:profiles!conversations_host_id_fkey(id, full_name, avatar_url)',
        )
        .eq('id', id)
        .single()
      if (error) throw error
      const viewerIsHost = data.host_id === userId
      const other = viewerIsHost ? data.explorer : data.host
      return {
        id: data.id,
        experienceId: data.experience_id,
        experienceTitle: data.experience?.title ?? null,
        experienceCoverUrl: data.experience?.cover_url ?? null,
        other: {
          id: other?.id ?? '',
          fullName: other?.full_name ?? '',
          avatarUrl: other?.avatar_url ?? null,
        },
        viewerIsHost,
      }
    },
    enabled: userId !== '' && id !== '',
  })
}

/** Opens (or creates) the explorer's conversation with the host of a plan. */
export function useStartConversation() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: async (experienceId: string) => {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_experience_id: experienceId,
      })
      if (error) throw error
      return data.id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) }),
  })
}

// ---------------------------------------------------------------- messages

/** Newest first; each page goes further back in time. */
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: async ({ pageParam }): Promise<Message[]> => {
      let query = supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(MESSAGE_PAGE_SIZE)
      if (pageParam) query = query.lt('created_at', pageParam)
      const { data, error } = await query
      if (error) throw error
      return data
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.length < MESSAGE_PAGE_SIZE ? undefined : (last[last.length - 1]?.created_at ?? undefined),
    enabled: conversationId !== '',
  })
}

/** Adds or replaces a message (by id) in the cached pages, keeping newest first. */
export function upsertMessage(queryClient: QueryClient, message: Message) {
  queryClient.setQueryData<MessagePages>(queryKeys.messages(message.conversation_id), (old) => {
    if (!old) return old
    const exists = old.pages.some((page) => page.some((m) => m.id === message.id))
    if (exists) {
      return {
        ...old,
        pages: old.pages.map((page) => page.map((m) => (m.id === message.id ? message : m))),
      }
    }
    const [first = [], ...rest] = old.pages
    return { ...old, pages: [[message, ...first], ...rest] }
  })
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: async (message: Message) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({ id: message.id, conversation_id: conversationId, sender_id: userId, body: message.body })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onMutate: (message) => upsertMessage(queryClient, { ...message, pending: true, failed: false }),
    onSuccess: (saved) => {
      upsertMessage(queryClient, saved)
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) })
    },
    onError: (_error, message) => upsertMessage(queryClient, { ...message, pending: false, failed: true }),
  })
}

/** Builds the local copy of a message before it is sent (shown immediately). */
export function draftMessage(conversationId: string, senderId: string, body: string): Message {
  return {
    id: randomUUID(),
    conversation_id: conversationId,
    sender_id: senderId,
    body: body.trim(),
    created_at: new Date().toISOString(),
    read_at: null,
  }
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
      if (error) throw error
    },
    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<InfiniteData<ConversationRow[], number>>(
        queryKeys.conversations(userId),
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) =>
              page.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c)),
            ),
          },
      )
    },
    // Read receipts are best effort; a failure must not bother the user.
    onError: () => undefined,
  })
}
