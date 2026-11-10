import { useFocusEffect } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { CoverImage } from '@/components/ui/cover-image'
import { Icon } from '@/components/ui/icon'
import { PressableScale } from '@/components/ui/pressable-scale'
import { Text } from '@/components/ui/text'
import { colors, elevation, radius, spacing } from '@/theme/tokens'

import { ROLE_LABEL, type Profile } from './api'

/** Banner height below the status bar (the banner also fills the status bar area). */
export const COVER_HEIGHT = 170
const AVATAR_SIZE = 104
const RING = 4

type Editable = { open: () => void; uploading: boolean }

type Props = {
  profile: Profile
  /** Safe-area top: the banner extends under the status bar. */
  topInset: number
  /** Own profile: tap to change the photo / the cover. */
  avatar?: Editable
  cover?: Editable
}

/** Light status bar icons while a screen with a banner is focused. */
export function useLightStatusBar() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light')
      return () => setStatusBarStyle('dark')
    }, []),
  )
}

/** Profile top: full-width cover banner, round photo overlapping it, name, role and city. */
export function ProfileHeader({ profile: p, topInset, avatar, cover }: Props) {
  const bannerHeight = topInset + COVER_HEIGHT

  const banner = (
    <View style={{ height: bannerHeight }}>
      {p.cover_url ? (
        <CoverImage
          uri={p.cover_url}
          style={StyleSheet.absoluteFill}
          accessibilityLabel={`Portada de ${p.full_name || 'este perfil'}`}
        />
      ) : (
        <LinearGradient
          colors={[colors.primary, colors.surfaceBrandStrong]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Keeps the status bar icons readable over any photo. */}
      <LinearGradient
        pointerEvents="none"
        colors={[colors.imageScrimStatusBar, colors.imageScrimTop]}
        style={[styles.topScrim, { height: topInset + 56 }]}
      />
      {cover ? (
        <View style={[styles.coverAction, { top: topInset + spacing.sm }]} pointerEvents="none">
          {cover.uploading ? (
            <ActivityIndicator color={colors.textPrimary} size="small" />
          ) : (
            <Icon name="camera-outline" size={16} color="textPrimary" />
          )}
          <Text variant="captionStrong">{p.cover_url ? 'Cambiar portada' : 'Agregar portada'}</Text>
        </View>
      ) : null}
    </View>
  )

  return (
    <View>
      {cover ? (
        <PressableScale
          onPress={cover.open}
          disabled={cover.uploading}
          accessibilityRole="button"
          accessibilityLabel={p.cover_url ? 'Cambiar foto de portada' : 'Agregar foto de portada'}
          testID="profile-cover"
          scaleTo={1}
        >
          {banner}
        </PressableScale>
      ) : (
        banner
      )}

      <View style={styles.identity}>
        <View style={styles.avatarSlot}>
          {avatar ? (
            <PressableScale
              onPress={avatar.open}
              disabled={avatar.uploading}
              accessibilityRole="button"
              accessibilityLabel={p.avatar_url ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
              testID="profile-avatar"
            >
              <AvatarRing profile={p} />
              {avatar.uploading ? (
                <View style={styles.avatarBusy}>
                  <ActivityIndicator color={colors.onPrimary} />
                </View>
              ) : null}
              <View style={styles.cameraBadge}>
                <Icon name="camera" size={16} color="onPrimary" />
              </View>
            </PressableScale>
          ) : (
            <AvatarRing profile={p} />
          )}
        </View>

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
            <View style={styles.city}>
              <Icon name="location-outline" size={14} color="textSecondary" />
              <Text variant="callout" color="textSecondary">
                {p.city}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function AvatarRing({ profile: p }: { profile: Profile }) {
  return (
    <View style={styles.ring}>
      <Avatar uri={p.avatar_url} name={p.full_name} size={AVATAR_SIZE} />
    </View>
  )
}

const RING_SIZE = AVATAR_SIZE + RING * 2

const styles = StyleSheet.create({
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0 },
  coverAction: {
    position: 'absolute',
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    ...elevation[1],
  },
  identity: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  avatarSlot: { marginTop: -RING_SIZE / 2, marginBottom: spacing.xxs },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    padding: RING,
    backgroundColor: colors.background,
    ...elevation[1],
  },
  avatarBusy: {
    position: 'absolute',
    top: RING,
    left: RING,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    right: RING,
    bottom: RING,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  city: { flexDirection: 'row', alignItems: 'center', gap: 2 },
})
