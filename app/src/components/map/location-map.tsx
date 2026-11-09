import { useEffect, useRef } from 'react'
import { StyleSheet } from 'react-native'
import MapView, { Marker } from 'react-native-maps'

import { colors } from '@/theme/tokens'

import { canUseNativeMap } from './plans-map'
import { StaticLocationMap, type LocationMapProps } from './static-location-map'

export type { LocationMapProps } from './static-location-map'

const DELTA = 0.035 // ~4 km across: street level around the comuna center

/** Tap the map to choose a point (publish form). Static fallback on Android without a Maps key. */
export function LocationMap(props: LocationMapProps) {
  return canUseNativeMap ? <NativeLocationMap {...props} /> : <StaticLocationMap {...props} />
}

function NativeLocationMap({ value, center, onChange }: LocationMapProps) {
  const mapRef = useRef<MapView>(null)
  const { lat, lng } = center
  useEffect(() => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: DELTA, longitudeDelta: DELTA },
      400,
    )
  }, [lat, lng])

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: DELTA, longitudeDelta: DELTA }}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      showsPointsOfInterests={false}
      onPress={(e) =>
        onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })
      }
      accessibilityLabel="Mapa: toca para marcar el punto de encuentro"
    >
      {value ? (
        <Marker
          coordinate={{ latitude: value.lat, longitude: value.lng }}
          pinColor={colors.primary}
          draggable
          onDragEnd={(e) =>
            onChange({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })
          }
        />
      ) : null}
    </MapView>
  )
}
