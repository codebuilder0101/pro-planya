import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { TabScreen } from '@/components/navigation/tab-screen'
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
import { useBecomeHostFlow } from '@/features/profile/become-host'
import { COVER_HEIGHT, ProfileHeader, useLightStatusBar } from '@/features/profile/profile-header'
import { useChangeAvatar, useChangeCover } from '@/features/profile/use-change-avatar'
import { FormMessage } from '@/components/ui/form-message'
import { colors, elevation, radius, screenMargin, spacing } from '@/theme/tokens'

export default function ProfileScreen() {
  const { signOut } = useAuth()
  const profile = useMyProfile()
  const categories = useCategories()
  const unread = useUnreadCount()
  const insets = useSafeAreaInsets()
  const photo = useChangeAvatar()
  const cover = useChangeCover(profile.data?.cover_url != null)
  const becomeHost = useBecomeHostFlow()
  useLightStatusBar()
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
        <View style={[styles.bleed, { marginTop: -(insets.top + spacing.lg) }]}>
          <Skeleton height={insets.top + COVER_HEIGHT} radius={0} />
        </View>
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
      <View style={[styles.bleed, { marginTop: -(insets.top + spacing.lg) }]}>
        <ProfileHeader profile={p} topInset={insets.top} avatar={photo} cover={cover} />
      </View>
      <View style={styles.headerGap}>
        <FormMessage tone="error" message={photo.error ?? cover.error} />
      </View>

      {!p.avatar_url ? (
        <View style={styles.photoCard}>
          <View style={styles.photoCardRow}>
            <View style={styles.photoCardIcon}>
              <Icon name="person-circle-outline" size={28} color="textBrand" />
            </View>
            <View style={styles.photoCardText}>
              <Text variant="bodyStrong">Agrega una foto de perfil</Text>
              <Text variant="footnote" color="textSecondary">
                Así las personas saben con quién van a compartir el plan y se sienten más seguras.
              </Text>
            </View>
          </View>
          <Button
            label="Agregar foto"
            icon="camera-outline"
            size="md"
            onPress={photo.open}
            loading={photo.uploading}
            testID="profile-add-photo"
          />
        </View>
      ) : null}

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
          icon="eye-outline"
          label="Ver mi perfil público"
          onPress={() => router.push({ pathname: '/user/[id]', params: { id: p.id } })}
          testID="profile-public"
        />
        <View style={styles.menuDivider} />
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
        {p.role === 'explorer' ? (
          <>
            <View style={styles.menuDivider} />
            <MenuRow
              icon="megaphone-outline"
              label="Quiero ser anfitrión"
              onPress={() => void becomeHost.start()}
              disabled={becomeHost.pending}
              testID="profile-become-host"
            />
          </>
        ) : null}
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
  disabled = false,
  testID,
}: {
  icon: IconName
  label: string
  badge?: number
  onPress: () => void
  disabled?: boolean
  testID?: string
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
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
  bleed: { marginHorizontal: -screenMargin },
  headerGap: { paddingTop: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },

  photoCard: {
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryTint,
  },
  photoCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoCardText: { flex: 1, gap: 2 },
  photoCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  section: { gap: spacing.sm, marginBottom: spacing.xl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
})
