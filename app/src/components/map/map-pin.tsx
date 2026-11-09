import { StyleSheet, View } from 'react-native'

import { Text } from '@/components/ui/text'
import type { Coords } from '@/lib/location'
import { colors, elevation, radius, spacing } from '@/theme/tokens'

export type MapPinData = Coords & { id: string; label: string }

export type PlansMapProps = {
  pins: MapPinData[]
  center: Coords
  /** Approximate visible radius around the center. */
  radiusKm?: number
  interactive?: boolean
  selectedId?: string | null
  onSelectPin?: (id: string) => void
  /** Blue dot for the viewer (only when the device location is used). */
  showsUser?: boolean
  /** Bottom space covered by overlays (cards), so pins stay visible. */
  bottomInset?: number
  accessibilityLabel: string
  /** Location picker: tap anywhere on the map to choose a point. */
  onPressMap?: (coords: Coords) => void
}

/** Price pill with a small pointer; inverts when selected. Shared by the native and web maps. */
export function MapPin({ label, selected }: { label: string; selected: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, selected ? styles.pillSelected : null]}>
        <Text variant="captionStrong" color={selected ? 'onPrimary' : 'textPrimary'} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <View style={[styles.pointer, selected ? styles.pointerSelected : null]} />
    </View>
  )
}

/** Map pin size, used by the web fallback to anchor the pointer tip on the coordinate. */
export const PIN_ANCHOR_OFFSET_Y = 34

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...elevation[3],
  },
  pillSelected: { backgroundColor: colors.primary },
  pointer: {
    width: 10,
    height: 10,
    marginTop: -5,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  pointerSelected: { backgroundColor: colors.primary },
})
