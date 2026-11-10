import { router, useLocalSearchParams } from 'expo-router'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { isIconName } from '@/components/ui/icon'
import { IconButton } from '@/components/ui/icon-button'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useCategories } from '@/features/categories/api'
import { useProfile, useUserId, type Profile } from '@/features/profile/api'
import { COVER_HEIGHT, ProfileHeader, useLightStatusBar } from '@/features/profile/profile-header'
import { useBlockUser } from '@/features/safety/api'
import { openSafetyMenu } from '@/features/safety/safety-menu'
import { colors, screenMargin, spacing } from '@/theme/tokens'

function goBack() {
  if (router.canGoBack()) router.back()
  else router.replace('/')
}

/** Public profile: what everyone sees (cover, photo, name, bio, interests). */
export default function UserProfileScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const userId = useUserId()
  const profile = useProfile(id)
  const block = useBlockUser()
  useLightStatusBar()

  const p = profile.data
  const isMe = id === userId
  // PGRST116: no row (unknown or deleted account).
  const notFound = (profile.error as { code?: string } | null)?.code === 'PGRST116'

  const more = (target: Profile) =>
    openSafetyMenu({
      report: { type: 'profile', id: target.id, label: 'Reportar usuario' },
      block: { userId: target.id, name: target.full_name },
      onBlock: (blockedId) => block.mutateAsync(blockedId),
      afterBlock: goBack,
    })

  return (
    <View style={styles.root}>
      {profile.isPending ? (
        <View>
          <Skeleton height={insets.top + COVER_HEIGHT} radius={0} />
          <View style={styles.loading}>
            <Skeleton width={112} height={112} radius={56} style={styles.loadingAvatar} />
            <Skeleton width={180} height={28} />
            <Skeleton width={120} height={20} />
          </View>
        </View>
      ) : !p ? (
        <View style={[styles.center, { paddingTop: insets.top + 56 }]}>
          {notFound ? (
            <EmptyState
              icon="person-outline"
              title="Este perfil no está disponible"
              actionLabel="Volver"
              onAction={goBack}
            />
          ) : (
            <EmptyState
              icon="cloud-offline-outline"
              title="No pudimos cargar el perfil"
              description="Revisa tu conexión e inténtalo de nuevo."
              actionLabel="Reintentar"
              onAction={() => void profile.refetch()}
            />
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        >
          <ProfileHeader profile={p} topInset={insets.top} />
          <ProfileBody profile={p} isMe={isMe} />
        </ScrollView>
      )}

      {/* Floating actions over the banner */}
      <View style={[styles.topBar, { top: insets.top + spacing.xs }]} pointerEvents="box-none">
        <IconButton icon="chevron-back" variant="glass" accessibilityLabel="Volver" onPress={goBack} />
        {p && !isMe ? (
          <IconButton
            icon="ellipsis-horizontal"
            variant="glass"
            accessibilityLabel="Más opciones"
            onPress={() => more(p)}
            testID="user-more"
          />
        ) : null}
      </View>
    </View>
  )
}

function ProfileBody({ profile: p, isMe }: { profile: Profile; isMe: boolean }) {
  const categories = useCategories()
  const interests = (categories.data ?? []).filter((c) => p.interests.includes(c.id))

  return (
    <View style={styles.body}>
      {isMe ? (
        <Text variant="footnote" color="textSecondary" align="center">
          Así ven tu perfil las demás personas.
        </Text>
      ) : null}

      <View style={styles.section}>
        <Text variant="headline">Sobre mí</Text>
        <Text variant="body" color={p.bio ? 'textPrimary' : 'textTertiary'}>
          {p.bio || 'Todavía no agrega una descripción.'}
        </Text>
      </View>

      {interests.length > 0 ? (
        <View style={styles.section}>
          <Text variant="headline">Intereses</Text>
          <View style={styles.chips}>
            {interests.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                icon={isIconName(c.icon) ? c.icon : undefined}
                iconColor={c.color}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1 },
  loading: { alignItems: 'center', gap: spacing.sm },
  loadingAvatar: { marginTop: -56 },
  topBar: {
    position: 'absolute',
    left: screenMargin,
    right: screenMargin,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  body: { paddingHorizontal: screenMargin, paddingTop: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
})
