import Constants from 'expo-constants'
import { useEffect, useRef, useState } from 'react'
import { Platform, StyleSheet } from 'react-native'
import MapView, { Marker, type Region } from 'react-native-maps'

import type { Coords } from '@/lib/location'

import { MapPin, type PlansMapProps } from './map-pin'
import { StaticPlansMap } from './static-map'

export type { MapPinData, PlansMapProps } from './map-pin'

function regionFor(center: Coords, radiusKm: number): Region {
  const latitudeDelta = (radiusKm * 2) / 111
  const longitudeDelta = latitudeDelta / Math.max(Math.cos((center.lat * Math.PI) / 180), 0.2)
  return { latitude: center.lat, longitude: center.lng, latitudeDelta, longitudeDelta }
}

/** Google Maps on Android needs an API key; without one (local/dev builds) the SDK crashes the app. */
export const canUseNativeMap =
  Platform.OS !== 'android' || Constants.expoConfig?.extra?.googleMapsConfigured === true

/**
 * Plans on a map: Google Maps on Android (when GOOGLE_MAPS_ANDROID_API_KEY is set at build time),
 * Apple Maps on iOS, otherwise the static tile map. Web uses plans-map.web.tsx.
 */
export function PlansMap(props: PlansMapProps) {
  return canUseNativeMap ? <NativePlansMap {...props} /> : <StaticPlansMap {...props} />
}

function NativePlansMap({
  pins,
  center,
  radiusKm = 8,
  interactive = true,
  selectedId = null,
  onSelectPin,
  showsUser = false,
  bottomInset = 0,
  accessibilityLabel,
}: PlansMapProps) {
  const mapRef = useRef<MapView>(null)

  // Custom marker views: track changes briefly after pins change so Android draws them, then freeze
  // the bitmaps for smooth panning.
  const pinsKey = pins.map((p) => p.id).join(',') + '|' + (selectedId ?? '')
  const [frozenKey, setFrozenKey] = useState<string | null>(null)
  const tracksChanges = frozenKey !== pinsKey
  useEffect(() => {
    const t = setTimeout(() => setFrozenKey(pinsKey), 600)
    return () => clearTimeout(t)
  }, [pinsKey])

  // Recenter when the search origin changes (e.g. the user enables location).
  const { lat, lng } = center
  useEffect(() => {
    mapRef.current?.animateToRegion(regionFor({ lat, lng }, radiusKm), 400)
  }, [lat, lng, radiusKm])

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={regionFor(center, radiusKm)}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      liteMode={!interactive}
      showsUserLocation={showsUser}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      moveOnMarkerPress={false}
      mapPadding={{ top: 0, right: 0, bottom: bottomInset, left: 0 }}
      accessibilityLabel={accessibilityLabel}
    >
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.lat, longitude: pin.lng }}
          anchor={{ x: 0.5, y: 1 }}
          onPress={() => onSelectPin?.(pin.id)}
          tracksViewChanges={tracksChanges}
          zIndex={pin.id === selectedId ? 10 : 1}
          accessibilityLabel={pin.label}
        >
          <MapPin label={pin.label} selected={pin.id === selectedId} />
        </Marker>
      ))}
    </MapView>
  )
}
