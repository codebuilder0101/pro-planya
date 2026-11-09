import { Image } from 'expo-image'
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components/ui/text'
import { colors, spacing } from '@/theme/tokens'

import type { Coords } from '@/lib/location'

import { MapPin, PIN_ANCHOR_OFFSET_Y, type PlansMapProps } from './map-pin'

const TILE = 256
const SHOW_TILES = Platform.OS === 'web'

/** Web Mercator: lat/lng -> world pixels at zoom z. */
function project(lat: number, lng: number, z: number) {
  const scale = TILE * 2 ** z
  const sin = Math.sin((lat * Math.PI) / 180)
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  }
}

/** Inverse of project(): world pixels at zoom z -> lat/lng. */
function unproject(x: number, y: number, z: number): Coords {
  const scale = TILE * 2 ** z
  const lng = (x / scale) * 360 - 180
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / scale))) * 180) / Math.PI
  return { lat, lng }
}

/**
 * Static map with the same pins as the native map: OpenStreetMap tiles on web (design
 * previews), a plain background on Android builds without a Google Maps key (react-native-maps
 * would crash there).
 */
export function StaticPlansMap({
  pins,
  center,
  radiusKm = 8,
  selectedId = null,
  onSelectPin,
  bottomInset = 0,
  accessibilityLabel,
  onPressMap,
}: PlansMapProps) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const { width, height } = size
  const visibleHeight = Math.max(height - bottomInset, 1)

  // Zoom so that ~2 * radiusKm fits the smaller visible side.
  const metersPerPxAtZ0 = 156543.03 * Math.cos((center.lat * Math.PI) / 180)
  const fit = Math.max(Math.min(width, visibleHeight), 1)
  const z = Math.max(3, Math.min(16, Math.floor(Math.log2((metersPerPxAtZ0 * fit) / (radiusKm * 2000)))))

  const c = project(center.lat, center.lng, z)
  const originX = c.x - width / 2
  const originY = c.y - visibleHeight / 2

  const tiles: { key: string; x: number; y: number; url: string }[] = []
  // OpenStreetMap only tolerates light browser use; native apps get blocked, so phones without a
  // Google Maps key show the pins on a plain background instead.
  if (SHOW_TILES && width > 0) {
    const n = 2 ** z
    for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + width) / TILE); tx++) {
      for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + height) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue
        const wrapped = ((tx % n) + n) % n
        tiles.push({
          key: `${z}/${tx}/${ty}`,
          x: tx * TILE - originX,
          y: ty * TILE - originY,
          url: `https://tile.openstreetmap.org/${z}/${wrapped}/${ty}.png`,
        })
      }
    }
  }

  return (
    <View
      style={styles.fill}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      accessibilityLabel={accessibilityLabel}
    >
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={{ uri: t.url }}
          style={[styles.tile, { left: t.x, top: t.y }]}
          cachePolicy="memory-disk"
        />
      ))}
      <View style={[styles.fill, styles.tint]} pointerEvents="none" />
      {onPressMap ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Marcar este punto en el mapa"
          onPress={(e) => {
            // Native: locationX/Y. Web: a mouse event, offsetX/Y relative to this layer.
            const ne = e.nativeEvent as unknown as Record<string, number | undefined>
            const lx = Number.isFinite(ne.locationX) ? ne.locationX : ne.offsetX
            const ly = Number.isFinite(ne.locationY) ? ne.locationY : ne.offsetY
            if (lx == null || ly == null || !Number.isFinite(lx) || !Number.isFinite(ly)) return
            onPressMap(unproject(originX + lx, originY + ly, z))
          }}
        />
      ) : null}
      {width > 0
        ? pins.map((pin) => {
            const p = project(pin.lat, pin.lng, z)
            const selected = pin.id === selectedId
            const x = p.x - originX
            const y = p.y - originY
            // Off-screen pins would make the clipped container scrollable on web.
            if (x < 0 || x > width || y < 0 || y > height) return null
            const position = [
              styles.pin,
              { left: x - 60, top: y - PIN_ANCHOR_OFFSET_Y, zIndex: selected ? 2 : 1 },
            ]
            // Static previews (no onSelectPin) render plain views: no nested buttons inside a pressable card.
            if (!onSelectPin) {
              return (
                <View key={pin.id} style={position} pointerEvents="none">
                  <MapPin label={pin.label} selected={selected} />
                </View>
              )
            }
            return (
              <Pressable
                key={pin.id}
                onPress={() => onSelectPin(pin.id)}
                accessibilityRole="button"
                accessibilityLabel={pin.label}
                style={position}
              >
                <MapPin label={pin.label} selected={selected} />
              </Pressable>
            )
          })
        : null}
      {SHOW_TILES ? (
        <Text
          variant="caption"
          color="textSecondary"
          style={[styles.attribution, { bottom: bottomInset + 4 }]}
        >
          © OpenStreetMap
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    backgroundColor: colors.mapPlaceholder,
  },
  tile: { position: 'absolute', width: TILE, height: TILE },
  // Slightly desaturate the raster tiles toward the brand surface.
  tint: { backgroundColor: colors.glassOnImage },
  pin: { position: 'absolute', width: 120, alignItems: 'center' },
  attribution: { position: 'absolute', right: spacing.sm, fontSize: 10 },
})
