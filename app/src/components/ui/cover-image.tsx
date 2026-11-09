import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { colors, motion } from '@/theme/tokens'

import { Icon, type IconName } from './icon'

type Props = {
  uri: string | null | undefined
  /** Shown large and faint when there is no photo (the category icon). */
  fallbackIcon?: IconName
  /** Bottom gradient so white text on the photo stays readable. */
  scrim?: 'none' | 'bottom' | 'strong'
  style?: StyleProp<ViewStyle>
  /** Overlays (badges, buttons, titles) positioned by the caller. */
  children?: ReactNode
  /** Recycling key for lists (avoids showing the previous photo while the new one loads). */
  recyclingKey?: string
  accessibilityLabel?: string
}

const SCRIMS = {
  bottom: {
    colors: [colors.imageScrimTop, colors.imageScrimMid, colors.imageScrimBottom] as const,
    locations: [0.45, 0.7, 1] as const,
  },
  strong: {
    colors: [colors.imageScrimTop, colors.imageScrimMid, colors.imageScrimBottom] as const,
    locations: [0.2, 0.5, 1] as const,
  },
}

/** Edge-to-edge photo with a brand fallback and an optional gradient overlay. */
export function CoverImage({
  uri,
  fallbackIcon = 'image-outline',
  scrim = 'none',
  style,
  children,
  recyclingKey,
  accessibilityLabel,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.fill}
          contentFit="cover"
          transition={motion.duration.normal}
          cachePolicy="memory-disk"
          recyclingKey={recyclingKey}
          accessible={accessibilityLabel != null}
          accessibilityLabel={accessibilityLabel}
        />
      ) : (
        <View style={[styles.fill, styles.fallback]}>
          <View style={styles.fallbackIcon}>
            <Icon name={fallbackIcon} size={56} color="textOnImage" />
          </View>
        </View>
      )}
      {scrim !== 'none' ? (
        <LinearGradient
          pointerEvents="none"
          colors={SCRIMS[scrim].colors}
          locations={SCRIMS[scrim].locations}
          style={styles.fill}
        />
      ) : null}
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden', backgroundColor: colors.mapPlaceholder },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  fallback: { backgroundColor: colors.surfaceBrandStrong, alignItems: 'center', justifyContent: 'center' },
  fallbackIcon: { opacity: 0.35, marginBottom: 24 },
})
