import { cityCenter, DEFAULT_CENTER, distanceKm, roundCoords } from './location'

describe('location helpers', () => {
  it('finds city centers ignoring case and accents, defaulting to Temuco', () => {
    expect(cityCenter('Pucón')).toEqual({ lat: -39.282, lng: -71.9545 })
    expect(cityCenter('  PUCON ')).toEqual({ lat: -39.282, lng: -71.9545 })
    expect(cityCenter('Santiago')).toEqual(DEFAULT_CENTER)
    expect(cityCenter(null)).toEqual(DEFAULT_CENTER)
  })

  it('rounds coordinates to ~110 m', () => {
    expect(roundCoords({ lat: -38.73594, lng: -72.59046 })).toEqual({ lat: -38.736, lng: -72.59 })
  })

  it('computes straight-line distances (Temuco–Pucón ≈ 80 km)', () => {
    const d = distanceKm(cityCenter('Temuco'), cityCenter('Pucón'))
    expect(d).toBeGreaterThan(75)
    expect(d).toBeLessThan(90)
    expect(distanceKm(DEFAULT_CENTER, DEFAULT_CENTER)).toBe(0)
  })
})
