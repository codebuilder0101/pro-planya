import { useSyncExternalStore } from 'react'

import { addDays, todayRange, toDateString, weekendRange, type DateRange } from '@/lib/dates'
import type { Coords } from '@/lib/location'
import type { Database } from '@/types/database'

export type DateFilter = 'any' | 'today' | 'weekend' | 'week'
export type SortOption = 'soonest' | 'distance' | 'popular'

export type ExploreFilters = {
  query: string
  categoryIds: string[]
  date: DateFilter
  freeOnly: boolean
  /** null = any distance. */
  radiusKm: number | null
  sort: SortOption
}

export const DEFAULT_FILTERS: ExploreFilters = {
  query: '',
  categoryIds: [],
  date: 'any',
  freeOnly: false,
  radiusKm: null,
  sort: 'soonest',
}

export const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'any', label: 'Cualquier fecha' },
  { value: 'today', label: 'Hoy' },
  { value: 'weekend', label: 'Este finde' },
  { value: 'week', label: 'Próximos 7 días' },
]

export const RADIUS_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Cualquiera' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
]

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'soonest', label: 'Más próximos' },
  { value: 'distance', label: 'Más cerca' },
  { value: 'popular', label: 'Más populares' },
]

export function dateRangeFor(filter: DateFilter, now: Date = new Date()): DateRange | null {
  switch (filter) {
    case 'today':
      return todayRange(now)
    case 'weekend':
      return weekendRange(now)
    case 'week': {
      const today = toDateString(now)
      return { from: today, to: addDays(today, 6) }
    }
    default:
      return null
  }
}

export type SearchArgs = Database['public']['Functions']['search_experiences']['Args']

/** Filters -> search_experiences arguments (without paging). */
export function toSearchArgs(
  filters: ExploreFilters,
  origin: Coords | undefined,
  now = new Date(),
): SearchArgs {
  const range = dateRangeFor(filters.date, now)
  const query = filters.query.trim()
  return {
    p_query: query.length > 0 ? query : null,
    p_category_ids: filters.categoryIds.length > 0 ? [...filters.categoryIds].sort() : null,
    p_lat: origin?.lat ?? null,
    p_lng: origin?.lng ?? null,
    // A radius needs an origin; without one the filter is ignored rather than failing.
    p_radius_km: origin && filters.radiusKm != null ? filters.radiusKm : null,
    p_date_from: range?.from ?? null,
    p_date_to: range?.to ?? null,
    p_free_only: filters.freeOnly,
    p_sort: filters.sort === 'distance' && !origin ? 'soonest' : filters.sort,
  }
}

/** Number of active filters shown on the filter button badge (search text excluded). */
/** Removable summary of the non-category filters (Explore shows them under the category chips). */
export function activeFilterLabels(
  f: ExploreFilters,
): { key: 'date' | 'free' | 'radius'; label: string; clear: Partial<ExploreFilters> }[] {
  const out: { key: 'date' | 'free' | 'radius'; label: string; clear: Partial<ExploreFilters> }[] = []
  if (f.date !== 'any') {
    const label = DATE_OPTIONS.find((o) => o.value === f.date)?.label ?? ''
    out.push({ key: 'date', label, clear: { date: 'any' } })
  }
  if (f.freeOnly) out.push({ key: 'free', label: 'Gratis', clear: { freeOnly: false } })
  if (f.radiusKm != null)
    out.push({ key: 'radius', label: `Hasta ${f.radiusKm} km`, clear: { radiusKm: null } })
  return out
}

export function activeFilterCount(f: ExploreFilters): number {
  return (
    (f.categoryIds.length > 0 ? 1 : 0) +
    (f.date !== 'any' ? 1 : 0) +
    (f.freeOnly ? 1 : 0) +
    (f.radiusKm != null ? 1 : 0) +
    (f.sort !== 'soonest' ? 1 : 0)
  )
}

// ---------------------------------------------------------------- tiny shared store
// Shared by Home (quick chips), Explore and the filters sheet. Session-only on purpose.
let state: ExploreFilters = DEFAULT_FILTERS
const listeners = new Set<() => void>()

export const exploreFilters = {
  get: () => state,
  set(next: Partial<ExploreFilters>) {
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
  reset(next: Partial<ExploreFilters> = {}) {
    state = { ...DEFAULT_FILTERS, ...next }
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useExploreFilters(): ExploreFilters {
  return useSyncExternalStore(exploreFilters.subscribe, exploreFilters.get, exploreFilters.get)
}
