import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useUserId } from '@/features/profile/api'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type ReportTarget = Database['public']['Enums']['report_target']
export type ReportReason = Database['public']['Enums']['report_reason']

export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'spam', label: 'Spam', hint: 'Publicidad o mensajes repetidos' },
  { value: 'offensive', label: 'Contenido ofensivo', hint: 'Insultos, acoso o contenido inapropiado' },
  { value: 'fraud', label: 'Fraude o estafa', hint: 'Pide dinero o datos de forma sospechosa' },
  { value: 'other', label: 'Otro motivo', hint: 'Cuéntanos qué pasó en el comentario' },
]

export const MAX_REPORT_COMMENT = 1000

const blockedKey = (userId: string) => ['blocks', userId] as const

/** Sends a report to the moderation queue (the DB resolves who is reported). */
export function useReport() {
  const userId = useUserId()
  return useMutation({
    mutationFn: async (input: {
      targetType: ReportTarget
      targetId: string
      reason: ReportReason
      comment: string
    }) => {
      const { error } = await supabase.from('reports').insert({
        reporter_id: userId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        comment: input.comment.trim(),
      })
      // 23505: this user already has an open report on the same target; that is fine.
      if (error && error.code !== '23505') throw error
    },
  })
}

/**
 * Blocks a user. The database then hides each other's plans and conversations,
 * so every cached list is refreshed.
 */
export function useBlockUser() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: blockedId })
      if (error && error.code !== '23505') throw error
    },
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export function useUnblockUser() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', userId)
        .eq('blocked_id', blockedId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries(),
  })
}

export type BlockedUser = { id: string; fullName: string; avatarUrl: string | null; since: string }

export function useBlockedUsers() {
  const userId = useUserId()
  return useQuery({
    queryKey: blockedKey(userId),
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data, error } = await supabase
        .from('blocks')
        .select('created_at, blocked:profiles!blocks_blocked_id_fkey(id, full_name, avatar_url)')
        .eq('blocker_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data.flatMap((b) =>
        b.blocked
          ? [
              {
                id: b.blocked.id,
                fullName: b.blocked.full_name,
                avatarUrl: b.blocked.avatar_url,
                since: b.created_at,
              },
            ]
          : [],
      )
    },
    enabled: userId !== '',
  })
}
