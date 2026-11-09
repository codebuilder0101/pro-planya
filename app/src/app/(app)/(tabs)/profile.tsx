import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { TabScreen } from '@/components/navigation/tab-screen'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { Icon, isIconName, type IconName } from '@/components/ui/icon'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/auth-provider'
import { useCategories } from '@/features/categories/api'
import { useUnreadCount } from '@/features/chat/api'
import { useMyProfile } from '@/features/profile/api'
import { colors, elevation, radius, spacing } from '@/theme/tokens'

const ROLE_LABEL = { explorer: 'Explorador', host: 'Anfitrión', admin: 'Administrador' } as const

export default function ProfileScreen() {
  const { signOut } = useAuth()
  const profile = useMyProfile()
  const categories = useCategories()
  const unread = useUnreadCount()
  const [signingOut, setSigningOut] = useState(false)

  const onSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  if (profile.isPending) {
    return (
      <TabScreen>
        <View style={styles.header}>
          <Skeleton width={96} height={96} radius={48} />
          <Skeleton width={180} height={28} />
          <Skeleton width={120} height={20} />
        </View>
      </TabScreen>
    )
  }

  if (profile.isError) {
    return (
      <TabScreen>
        <EmptyState
          icon="cloud-offline-outline"
          title="No pudimos cargar tu perfil"
          description="Revisa tu conexión e inténtalo de nuevo."
          actionLabel="Reintentar"
          onAction={() => profile.refetch()}
        />
      </TabScreen>
    )
  }

  const p = profile.data
  const interests = (categories.data ?? []).filter((c) => p.interests.includes(c.id))

  return (
    <TabScreen>
      <View style={styles.header}>
        <Avatar uri={p.avatar_url} name={p.full_name} size={96} />
        <Text variant="title1" align="center" accessibilityRole="header">
          {p.full_name || 'Sin nombre'}
        </Text>
        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text variant="caption" color="textBrand">
              {ROLE_LABEL[p.role]}
            </Text>
          </View>
          {p.city ? (
            <Text variant="callout" color="textSecondary">
              {p.city}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="headline">Sobre mí</Text>
        <Text variant="body" color={p.bio ? 'textPrimary' : 'textTertiary'}>
          {p.bio || 'Aún no agregas una descripción.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text variant="headline">Intereses</Text>
        {interests.length > 0 ? (
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
        ) : (
          <Text variant="body" color="textTertiary">
            Elige tus intereses para recibir recomendaciones.
          </Text>
        )}
      </View>

      <View style={styles.menu}>
        <MenuRow
          icon="chatbubbles-outline"
          label="Mensajes"
          badge={unread}
          onPress={() => router.push('/chats')}
          testID="profile-messages"
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="heart-outline"
          label="Mis favoritas"
          onPress={() => router.push('/favorites')}
          testID="profile-favorites"
        />
        <View style={styles.menuDivider} />
        <MenuRow
          icon="shield-outline"
          label="Usuarios bloqueados"
          onPress={() => router.push('/blocked')}
          testID="profile-blocked"
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Editar perfil"
          variant="secondary"
          icon="create-outline"
          onPress={() => router.push('/profile/edit')}
          testID="profile-edit"
        />
        <Button
          label="Cerrar sesión"
          variant="ghost"
          onPress={onSignOut}
          loading={signingOut}
          testID="profile-sign-out"
        />
      </View>
    </TabScreen>
  )
}

function MenuRow({
  icon,
  label,
  badge = 0,
  onPress,
  testID,
}: {
  icon: IconName
  label: string
  badge?: number
  onPress: () => void
  testID?: string
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={badge > 0 ? `${label}, ${badge} sin leer` : label}
      style={styles.menuRow}
      testID={testID}
    >
      <Icon name={icon} size={22} color="textBrand" />
      <Text variant="body" style={styles.flex}>
        {label}
      </Text>
      {badge > 0 ? (
        <View style={styles.menuBadge}>
          <Text variant="captionStrong" color="textInverse">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
      <Icon name="chevron-forward" size={18} color="textTertiary" />
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  menu: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...elevation[1],
    marginBottom: spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 22 + spacing.md,
  },
  menuBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
})
