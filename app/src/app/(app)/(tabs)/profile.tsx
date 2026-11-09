import { router } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { TabScreen } from '@/components/navigation/tab-screen'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { EmptyState } from '@/components/ui/empty-state'
import { isIconName } from '@/components/ui/icon'
import { Skeleton } from '@/components/ui/skeleton'
import { Text } from '@/components/ui/text'
import { useAuth } from '@/features/auth/auth-provider'
import { useCategories } from '@/features/categories/api'
import { useMyProfile } from '@/features/profile/api'
import { colors, radius, spacing } from '@/theme/tokens'

const ROLE_LABEL = { explorer: 'Explorador', host: 'Anfitrión', admin: 'Administrador' } as const

export default function ProfileScreen() {
  const { signOut } = useAuth()
  const profile = useMyProfile()
  const categories = useCategories()
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

      <View style={styles.actions}>
        <Button
          label="Mensajes"
          variant="secondary"
          icon="chatbubbles-outline"
          onPress={() => router.push('/chats')}
          testID="profile-messages"
        />
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

const styles = StyleSheet.create({
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
