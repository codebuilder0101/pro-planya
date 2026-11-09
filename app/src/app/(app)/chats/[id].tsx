import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Platform, StyleSheet, TextInput, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { InlineError } from '@/components/ui/inline-error'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import {
  draftMessage,
  MAX_MESSAGE_LENGTH,
  useConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  type ConversationInfo,
  type Message,
} from '@/features/chat/api'
import { useUserId } from '@/features/profile/api'
import { useBlockUser } from '@/features/safety/api'
import { openSafetyMenu } from '@/features/safety/safety-menu'
import { formatChatDay, formatTime, toDateString } from '@/lib/dates'
import { colors, radius, screenMargin, spacing, typography } from '@/theme/tokens'

export default function ChatScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const conversation = useConversation(id)
  const block = useBlockUser()
  const info = conversation.data

  const more = () => {
    if (!info) return
    openSafetyMenu({
      report: { type: 'conversation', id: info.id, label: 'Reportar conversación' },
      block: info.other.id ? { userId: info.other.id, name: info.other.fullName } : undefined,
      onBlock: (userId) => block.mutateAsync(userId),
      afterBlock: () => router.back(),
    })
  }

  if (conversation.isError) {
    return (
      <EmptyState
        icon="chatbubble-ellipses-outline"
        title="Conversación no disponible"
        description="Puede que el plan ya no exista o que no puedas escribirle a esta persona."
        actionLabel="Volver"
        onAction={() => router.back()}
      />
    )
  }

  return (
    <>
      <Stack.Screen
        options={
          info
            ? {
                headerTitle: () => <ChatHeader info={info} />,
                headerRight: () => (
                  <IconButton
                    icon="ellipsis-horizontal"
                    variant="plain"
                    accessibilityLabel="Más opciones"
                    onPress={more}
                    testID="chat-more"
                  />
                ),
              }
            : {}
        }
      />
      <ChatBody conversationId={id} />
    </>
  )
}

function ChatHeader({ info }: { info: ConversationInfo }) {
  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/experience/[id]', params: { id: info.experienceId } })}
      accessibilityRole="button"
      accessibilityLabel={`${info.other.fullName}, ver el plan ${info.experienceTitle ?? ''}`}
      style={styles.header}
    >
      <Avatar uri={info.other.avatarUrl} name={info.other.fullName} size={36} />
      <View style={styles.headerText}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {info.other.fullName || 'Usuario'}
        </Text>
        <Text variant="caption" color="textBrand" numberOfLines={1}>
          {info.experienceTitle ?? 'Plan no disponible'}
        </Text>
      </View>
    </PressableScale>
  )
}

function ChatBody({ conversationId }: { conversationId: string }) {
  const insets = useSafeAreaInsets()
  const userId = useUserId()
  const messages = useMessages(conversationId)
  const send = useSendMessage(conversationId)
  const markRead = useMarkConversationRead()
  const [text, setText] = useState('')
  const list = messages.data?.pages.flat() ?? []

  // Mark as read on open and whenever a new message from the other person arrives.
  const newestIncoming = list.find((m) => m.sender_id !== userId && m.read_at == null)?.id
  const { mutate: markReadMutate } = markRead
  useEffect(() => {
    if (conversationId) markReadMutate(conversationId)
  }, [conversationId, newestIncoming, markReadMutate])

  const onSend = () => {
    const body = text.trim()
    if (!body) return
    setText('')
    send.mutate(draftMessage(conversationId, userId, body))
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={insets.top + HEADER_HEIGHT}
    >
      {messages.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : messages.isError && list.length === 0 ? (
        <View style={styles.center}>
          <InlineError error={messages.error} onRetry={() => messages.refetch()} />
        </View>
      ) : (
        <FlatList
          inverted={list.length > 0}
          data={list}
          keyExtractor={(m) => m.id}
          renderItem={({ item, index }) => (
            <MessageBubble
              message={item}
              mine={item.sender_id === userId}
              showDay={dayChanges(item, list[index + 1])}
              onRetry={() => send.mutate(item)}
            />
          )}
          contentContainerStyle={styles.messages}
          keyboardShouldPersistTaps="handled"
          onEndReached={() => {
            if (messages.hasNextPage && !messages.isFetchingNextPage) messages.fetchNextPage()
          }}
          ListFooterComponent={
            messages.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : undefined
          }
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="Escribe el primer mensaje"
              description="Pregunta lo que necesites saber antes de sumarte al plan."
            />
          }
        />
      )}

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_MESSAGE_LENGTH}
          style={styles.input}
          accessibilityLabel="Mensaje"
          testID="chat-input"
        />
        <IconButton
          icon="send"
          variant="brand"
          size={44}
          accessibilityLabel="Enviar mensaje"
          onPress={onSend}
          disabled={text.trim().length === 0}
          haptic
          testID="chat-send"
        />
      </View>
    </KeyboardAvoidingView>
  )
}

/** Native stack header height (below the status bar), used to offset the keyboard. */
const HEADER_HEIGHT = Platform.OS === 'ios' ? 44 : 64

/** In the inverted list `older` is the next item; show the day label when it changes. */
function dayChanges(message: Message, older: Message | undefined): boolean {
  if (!older) return true
  return toDateString(new Date(message.created_at)) !== toDateString(new Date(older.created_at))
}

function MessageBubble({
  message: m,
  mine,
  showDay,
  onRetry,
}: {
  message: Message
  mine: boolean
  showDay: boolean
  onRetry: () => void
}) {
  const date = new Date(m.created_at)
  return (
    <View>
      {showDay ? (
        <Text variant="caption" color="textTertiary" align="center" style={styles.day}>
          {formatChatDay(date)}
        </Text>
      ) : null}
      <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text variant="body" color={mine ? 'textInverse' : 'textPrimary'} selectable>
            {m.body}
          </Text>
          <View style={styles.meta}>
            <Text variant="caption" color={mine ? 'textInverse' : 'textTertiary'} style={styles.time}>
              {formatTime(date)}
            </Text>
            {mine && m.pending ? <Icon name="time-outline" size={12} color="textInverse" /> : null}
            {mine && !m.pending && !m.failed ? <Icon name="checkmark" size={14} color="textInverse" /> : null}
          </View>
        </View>
        {m.failed ? (
          <PressableScale
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="No se envió. Toca para reintentar"
            style={styles.retry}
          >
            <Icon name="alert-circle" size={16} color="danger" />
            <Text variant="caption" color="danger">
              No se envió · Reintentar
            </Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', paddingTop: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, maxWidth: 260 },
  headerText: { flexShrink: 1 },
  messages: { paddingHorizontal: screenMargin, paddingVertical: spacing.md, gap: spacing.xs, flexGrow: 1 },
  day: { marginVertical: spacing.md },
  bubbleRow: { marginVertical: 2, maxWidth: '82%', gap: spacing.xxs },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderRadius: radius.lg,
  },
  bubbleMine: { backgroundColor: colors.primary, borderBottomRightRadius: radius.xs },
  bubbleTheirs: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.xs },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  time: { opacity: 0.8 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: screenMargin,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    ...typography.body,
    color: colors.textPrimary,
  },
})
