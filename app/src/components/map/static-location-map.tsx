import type { Coords } from '@/lib/location'

import { StaticPlansMap } from './static-map'

export type LocationMapProps = {
  /** Chosen point, or null before the first tap. */
  value: Coords | null
  /** Where the map is centered (comuna center or the device location). */
  center: Coords
  onChange: (coords: Coords) => void
}

/** Static tile map (web previews, Android builds without a Maps key): tap to place the pin. */
export function StaticLocationMap({ value, center, onChange }: LocationMapProps) {
  return (
    <StaticPlansMap
      pins={value ? [{ id: 'meeting-point', label: 'Punto de encuentro', ...value }] : []}
      center={center}
      radiusKm={1.6}
      onPressMap={onChange}
      accessibilityLabel="Mapa: toca para marcar el punto de encuentro"
    />
  )
}
