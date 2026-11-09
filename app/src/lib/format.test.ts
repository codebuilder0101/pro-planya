import {
  formatCLP,
  formatDistanceKm,
  formatPrice,
  formatRating,
  formatSeatsLeft,
  formatSeatsTaken,
  initials,
  seatsLeft,
} from './format'

describe('formatCLP', () => {
  it.each([
    [0, '$0'],
    [990, '$990'],
    [1000, '$1.000'],
    [25000, '$25.000'],
    [120000, '$120.000'],
    [1234567, '$1.234.567'],
    [-1500, '-$1.500'],
    [24999.6, '$25.000'],
    [Number.NaN, '$0'],
  ])('%p -> %p', (input, expected) => {
    expect(formatCLP(input)).toBe(expected)
  })
})

describe('formatPrice', () => {
  it('shows "Gratis" for free plans or missing prices', () => {
    expect(formatPrice(true, null)).toBe('Gratis')
    expect(formatPrice(true, 5000)).toBe('Gratis')
    expect(formatPrice(false, null)).toBe('Gratis')
  })
  it('formats paid plans in CLP', () => {
    expect(formatPrice(false, 25000)).toBe('$25.000')
  })
})

describe('seats', () => {
  it('never goes negative', () => {
    expect(seatsLeft(10, 12)).toBe(0)
  })
  it.each([
    [10, 0, 'Quedan 10 cupos'],
    [10, 8, 'Quedan 2 cupos'],
    [10, 9, 'Queda 1 cupo'],
    [10, 10, 'Sin cupos'],
  ])('capacity %p taken %p -> %p', (capacity, taken, expected) => {
    expect(formatSeatsLeft(capacity, taken)).toBe(expected)
  })
})

describe('formatDistanceKm', () => {
  it.each([
    [0.004, '10 m'],
    [0.85, '850 m'],
    [1.42, '1,4 km'],
    [9.96, '10,0 km'],
    [12.3, '12 km'],
    [1234.5, '1.235 km'],
  ])('%p -> %p', (km, expected) => {
    expect(formatDistanceKm(km)).toBe(expected)
  })
  it('returns empty for missing values', () => {
    expect(formatDistanceKm(null)).toBe('')
    expect(formatDistanceKm(undefined)).toBe('')
    expect(formatDistanceKm(-1)).toBe('')
  })
})

describe('formatRating / initials', () => {
  it('formats ratings with a decimal comma', () => {
    expect(formatRating(4.5)).toBe('4,5')
    expect(formatRating('4.25')).toBe('4,3')
    expect(formatRating(null)).toBe('0,0')
  })
  it('builds initials', () => {
    expect(initials('Camila Rivas')).toBe('CR')
    expect(initials('  matías   de la   Huenchumán ')).toBe('MH')
    expect(initials('Ana')).toBe('A')
    expect(initials('')).toBe('?')
    expect(initials(null)).toBe('?')
  })
})

describe('formatSeatsTaken', () => {
  it('shows joined/capacity, or only the capacity while nobody has joined', () => {
    expect(formatSeatsTaken(12, 8)).toBe('8/12 cupos')
    expect(formatSeatsTaken(15, 0)).toBe('15 cupos')
    expect(formatSeatsTaken(10, 12)).toBe('10/10 cupos')
    expect(formatSeatsTaken(10, -1)).toBe('10 cupos')
  })
})
