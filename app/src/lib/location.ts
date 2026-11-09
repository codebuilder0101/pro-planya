import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as Location from 'expo-location'
import { useCallback } from 'react'

import { queryKeys } from './query-client'

export type Coords = { lat: number; lng: number }

export type ViewerLocation = Coords & {
  /** 'device' = GPS (permission granted); 'city' = the profile city center (no permission yet). */
  source: 'device' | 'city'
  /** False when the user denied permission and the OS will not show the prompt again. */
  canAsk: boolean
}

/** City centers for the launch region (fallback when location is off). */
const CITY_CENTERS: Record<string, Coords> = {
  temuco: { lat: -38.7359, lng: -72.5904 },
  pucon: { lat: -39.282, lng: -71.9545 },
  villarrica: { lat: -39.2857, lng: -72.2279 },
  'padre las casas': { lat: -38.7652, lng: -72.5957 },
  lautaro: { lat: -38.5306, lng: -72.4353 },
  curarrehue: { lat: -39.3594, lng: -71.5883 },
  curacautin: { lat: -38.4366, lng: -71.8897 },
}

/** Comunas offered as quick picks in the publish form (launch region first). */
export const COMUNAS = [
  'Temuco',
  'Padre Las Casas',
  'Pucón',
  'Villarrica',
  'Curarrehue',
  'Curacautín',
  'Lautaro',
] as const
export const DEFAULT_CENTER: Coords = { lat: -38.7359, lng: -72.5904 }

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

export function cityCenter(city: string | null | undefined): Coords {
  return (city && CITY_CENTERS[normalize(city)]) || DEFAULT_CENTER
}

/** ~110 m precision: keeps query keys stable while walking around, and is enough for "near me". */
export function roundCoords(c: Coords): Coords {
  return { lat: Math.round(c.lat * 1000) / 1000, lng: Math.round(c.lng * 1000) / 1000 }
}

async function readLocation(city: string | null | undefined): Promise<ViewerLocation> {
  const fallback = (canAsk: boolean): ViewerLocation => ({ ...cityCenter(city), source: 'city', canAsk })
  try {
    const permission = await Location.getForegroundPermissionsAsync()
    if (!permission.granted) return fallback(permission.canAskAgain)
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 })
    const position =
      last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
    return {
      ...roundCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
      source: 'device',
      canAsk: true,
    }
  } catch {
    // Location services off, timeout, web without geolocation...: never block discovery.
    return fallback(false)
  }
}

/**
 * Where to search from. Never prompts by itself (permissions only on a user action):
 * uses the device location if already granted, otherwise the profile city center.
 * `requestPermission()` shows the OS prompt (call it from a button).
 */
export function useViewerLocation(city: string | null | undefined) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.viewerLocation(city ?? ''),
    queryFn: () => readLocation(city),
    staleTime: 5 * 60_000,
    retry: false,
  })

  const requestPermission = useCallback(async () => {
    try {
      await Location.requestForegroundPermissionsAsync()
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['viewer-location'] })
    }
  }, [queryClient])

  return { location: query.data, isPending: query.isPending, requestPermission }
}

/** Straight-line distance in km (haversine). */
export function distanceKm(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Asks for permission (call it from a button) and returns the precise device position,
 * or null when permission is denied or the position is unavailable.
 */
export async function getDevicePosition(): Promise<Coords | null> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (!permission.granted) return null
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
    return { lat: p.coords.latitude, lng: p.coords.longitude }
  } catch {
    return null
  }
}
