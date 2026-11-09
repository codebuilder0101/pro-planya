import { router } from 'expo-router'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useConversations, type ConversationRow } from '@/features/chat/api'
import { useUserId } from '@/features/profile/api'
import { formatChatListTime } from '@/lib/dates'
import { colors, radius, screenMargin, spacing } from '@/theme/tokens'

export default function ConversationsScreen() {
  const insets = useSafeAreaInsets()
  const conversations = useConversations()
  const rows = conversations.data?.pages.flat() ?? []

  if (conversations.isPending) {
    return (
      <View style={styles.skeletons}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.row}>
            <Skeleton width={52} height={52} radius={26} />
            <View style={styles.flex}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="90%" height={16} />
            </View>
          </View>
        ))}
      </View>
    )
  }

  if (conversations.isError && rows.length === 0) {
    return (
      <View style={styles.errorBox}>
        <InlineError error={conversations.error} onRetry={() => conversations.refetch()} />
      </View>
    )
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => <ConversationItem conversation={item} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
      onEndReached={() => {
        if (conversations.hasNextPage && !conversations.isFetchingNextPage) conversations.fetchNextPage()
      }}
      refreshControl={
        <RefreshControl
          refreshing={conversations.isRefetching && !conversations.isFetchingNextPage}
          onRefresh={() => void conversations.refetch()}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        <EmptyState
          icon="chatbubbles-outline"
          title="Aún no tienes conversaciones"
          description="Escríbele al anfitrión desde el detalle de un plan para resolver tus dudas."
          actionLabel="Explorar planes"
          onAction={() => router.navigate('/explore')}
        />
      }
    />
  )
}

function ConversationItem({ conversation: c }: { conversation: ConversationRow }) {
  const userId = useUserId()
  const unread = c.unread_count > 0
  const preview = c.last_message_body
    ? `${c.last_message_sender_id === userId ? 'Tú: ' : ''}${c.last_message_body}`
    : 'Nueva conversación'

  return (
    <PressableScale
      onPress={() => router.push({ pathname: '/chats/[id]', params: { id: c.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Conversación con ${c.other_full_name || 'usuario'} sobre ${c.experience_title ?? 'un plan'}${unread ? `, ${c.unread_count} sin leer` : ''}`}
      style={styles.row}
    >
      <Avatar uri={c.other_avatar_url} name={c.other_full_name} size={52} />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {c.other_full_name || 'Usuario'}
          </Text>
          <Text variant="caption" color={unread ? 'textBrand' : 'textTertiary'}>
            {formatChatListTime(new Date(c.last_message_at))}
          </Text>
        </View>
        <Text variant="caption" color="textBrand" numberOfLines={1}>
          {c.experience_title ?? 'Plan no disponible'}
        </Text>
        <View style={styles.titleRow}>
          <Text
            variant={unread ? 'subhead' : 'footnote'}
            color={unread ? 'textPrimary' : 'textSecondary'}
            numberOfLines={1}
            style={styles.flex}
          >
            {preview}
          </Text>
          {unread ? (
            <View style={styles.badge}>
              <Text variant="captionStrong" color="textInverse">
                {c.unread_count > 99 ? '99+' : c.unread_count}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: screenMargin, paddingTop: spacing.sm, flexGrow: 1 },
  skeletons: { paddingHorizontal: screenMargin, paddingTop: spacing.sm, gap: spacing.lg },
  errorBox: { paddingTop: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  flex: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 52 + spacing.md,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
