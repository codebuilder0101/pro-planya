import {
  activeFilterCount,
  activeFilterLabels,
  DEFAULT_FILTERS,
  dateRangeFor,
  exploreFilters,
  toSearchArgs,
} from './filters'

// Wednesday 4 Nov 2026, 15:00 in Santiago (UTC-3).
const now = new Date('2026-11-04T15:00:00-03:00')
const temuco = { lat: -38.7359, lng: -72.5904 }

describe('dateRangeFor', () => {
  it('maps quick date filters to Santiago local ranges', () => {
    expect(dateRangeFor('any', now)).toBeNull()
    expect(dateRangeFor('today', now)).toEqual({ from: '2026-11-04', to: '2026-11-04' })
    expect(dateRangeFor('weekend', now)).toEqual({ from: '2026-11-07', to: '2026-11-08' })
    expect(dateRangeFor('week', now)).toEqual({ from: '2026-11-04', to: '2026-11-10' })
  })
})

describe('toSearchArgs', () => {
  it('defaults: no filters, origin passed, soonest first', () => {
    expect(toSearchArgs(DEFAULT_FILTERS, temuco, now)).toEqual({
      p_query: null,
      p_category_ids: null,
      p_lat: temuco.lat,
      p_lng: temuco.lng,
      p_radius_km: null,
      p_date_from: null,
      p_date_to: null,
      p_free_only: false,
      p_sort: 'soonest',
    })
  })

  it('trims the query, sorts category ids (stable cache keys) and applies date/radius', () => {
    const args = toSearchArgs(
      {
        ...DEFAULT_FILTERS,
        query: '  kayak ',
        categoryIds: ['b', 'a'],
        date: 'today',
        radiusKm: 10,
        freeOnly: true,
      },
      temuco,
      now,
    )
    expect(args).toMatchObject({
      p_query: 'kayak',
      p_category_ids: ['a', 'b'],
      p_radius_km: 10,
      p_date_from: '2026-11-04',
      p_date_to: '2026-11-04',
      p_free_only: true,
    })
  })

  it('never sends a radius or distance sort without an origin (the RPC would reject it)', () => {
    const args = toSearchArgs({ ...DEFAULT_FILTERS, radiusKm: 10, sort: 'distance' }, undefined, now)
    expect(args.p_radius_km).toBeNull()
    expect(args.p_sort).toBe('soonest')
    expect(args.p_lat).toBeNull()
  })
})

describe('activeFilterCount', () => {
  it('counts filter groups, not the search text', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0)
    expect(activeFilterCount({ ...DEFAULT_FILTERS, query: 'x' })).toBe(0)
    expect(
      activeFilterCount({
        ...DEFAULT_FILTERS,
        categoryIds: ['a', 'b'],
        date: 'weekend',
        freeOnly: true,
        radiusKm: 5,
        sort: 'popular',
      }),
    ).toBe(5)
  })
})

describe('exploreFilters store', () => {
  afterEach(() => exploreFilters.reset())

  it('merges updates, resets with overrides and notifies subscribers', () => {
    const listener = jest.fn()
    const unsubscribe = exploreFilters.subscribe(listener)
    exploreFilters.set({ freeOnly: true })
    expect(exploreFilters.get()).toEqual({ ...DEFAULT_FILTERS, freeOnly: true })
    exploreFilters.reset({ date: 'today' })
    expect(exploreFilters.get()).toEqual({ ...DEFAULT_FILTERS, date: 'today' })
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    exploreFilters.set({ sort: 'popular' })
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('activeFilterLabels', () => {
  it('lists date, free and distance filters (not categories) with how to clear each', () => {
    expect(activeFilterLabels(DEFAULT_FILTERS)).toEqual([])
    expect(
      activeFilterLabels({
        ...DEFAULT_FILTERS,
        categoryIds: ['c1'],
        date: 'weekend',
        freeOnly: true,
        radiusKm: 10,
      }),
    ).toEqual([
      { key: 'date', label: 'Este finde', clear: { date: 'any' } },
      { key: 'free', label: 'Gratis', clear: { freeOnly: false } },
      { key: 'radius', label: 'Hasta 10 km', clear: { radiusKm: null } },
    ])
  })
})
