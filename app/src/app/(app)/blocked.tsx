import { FlatList, StyleSheet, View, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { InlineError } from '@/components/ui/inline-error'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useBlockedUsers, useUnblockUser, type BlockedUser } from '@/features/safety/api'
import { confirmAction } from '@/lib/dialogs'
import { toUserMessage } from '@/lib/errors'
import { colors, screenMargin, spacing } from '@/theme/tokens'

/** People the user blocked, with an option to unblock. */
export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets()
  const blocked = useBlockedUsers()
  const unblock = useUnblockUser()

  const onUnblock = async (user: BlockedUser) => {
    const ok = await confirmAction({
      title: `¿Desbloquear a ${user.fullName || 'este usuario'}?`,
      message: 'Podrá volver a escribirte y verás sus planes otra vez.',
      confirmLabel: 'Desbloquear',
    })
    if (!ok) return
    unblock.mutate(user.id, {
      onError: (error) => Alert.alert('No pudimos desbloquear', toUserMessage(error)),
    })
  }

  if (blocked.isPending) {
    return (
      <View style={styles.padded}>
        <Skeleton height={64} />
        <Skeleton height={64} />
      </View>
    )
  }

  if (blocked.isError) {
    return (
      <View style={styles.padded}>
        <InlineError error={blocked.error} onRetry={() => void blocked.refetch()} inset={0} />
      </View>
    )
  }

  return (
    <FlatList
      data={blocked.data}
      keyExtractor={(u) => u.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar uri={item.avatarUrl} name={item.fullName} size={48} />
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {item.fullName || 'Usuario'}
          </Text>
          <Button
            label="Desbloquear"
            variant="secondary"
            size="md"
            fullWidth={false}
            loading={unblock.isPending && unblock.variables === item.id}
            onPress={() => void onUnblock(item)}
          />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
      ListHeaderComponent={
        <Text variant="footnote" color="textSecondary" style={styles.note}>
          Las personas bloqueadas no pueden escribirte y no ves sus planes. No les avisamos.
        </Text>
      }
      ListEmptyComponent={
        <EmptyState
          icon="shield-checkmark-outline"
          title="No has bloqueado a nadie"
          description="Puedes bloquear a alguien desde un plan o una conversación."
        />
      }
    />
  )
}

const styles = StyleSheet.create({
  padded: { paddingHorizontal: screenMargin, paddingTop: spacing.md, gap: spacing.md },
  list: { paddingHorizontal: screenMargin, paddingTop: spacing.md, flexGrow: 1 },
  note: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  flex: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
})
