import {
  bookableDays,
  emptyPlanValues,
  formatPriceInput,
  makePlanSchema,
  parsePrice,
  planValuesFrom,
  START_TIMES,
  toExperienceFields,
  toPoint,
  type PlanFormValues,
} from './plan-form'

// Wednesday 4 Nov 2026, 15:00 in Santiago (UTC-3).
const now = new Date('2026-11-04T15:00:00-03:00')

const valid: PlanFormValues = {
  ...emptyPlanValues('Temuco'),
  photos: [{ key: 'p1', uri: 'file:///a.jpg' }],
  title: '  Caminata al Ñielol  ',
  description: 'Subimos juntos al cerro para ver el amanecer.',
  categoryId: 'c1',
  location: { lat: -38.7255, lng: -72.5843 },
  date: '2026-11-07',
  startTime: '07:30',
  durationMin: 150,
  capacity: 15,
}

const errorsOf = (values: PlanFormValues, opts = {}) => {
  const result = makePlanSchema({ now, ...opts }).safeParse(values)
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('makePlanSchema', () => {
  it('accepts a complete free plan', () => {
    expect(errorsOf(valid)).toEqual({})
  })

  it('reports every missing field with a Spanish message', () => {
    const errors = errorsOf(emptyPlanValues(''))
    expect(errors).toMatchObject({
      photos: 'Agrega al menos una foto. La primera será la portada.',
      title: 'El título debe tener al menos 3 caracteres.',
      categoryId: 'Elige una categoría.',
      comuna: 'Indica la comuna.',
      location: 'Marca el punto de encuentro en el mapa.',
      date: 'Elige la fecha.',
      startTime: 'Elige la hora de inicio.',
    })
  })

  it('requires a price for paid plans, up to $10.000.000', () => {
    expect(errorsOf({ ...valid, isFree: false, price: '' }).price).toBe('Ingresa el precio en pesos.')
    expect(errorsOf({ ...valid, isFree: false, price: '0' }).price).toBe('Ingresa el precio en pesos.')
    expect(errorsOf({ ...valid, isFree: false, price: '10.000.001' }).price).toBe(
      'El precio máximo es $10.000.000.',
    )
    expect(errorsOf({ ...valid, isFree: false, price: '25.000' })).toEqual({})
  })

  it('rejects past start times, except an unchanged start when editing', () => {
    const past = { ...valid, date: '2026-11-04', startTime: '14:30' }
    expect(errorsOf(past).startTime).toBe('Esa fecha y hora ya pasaron. Elige un horario futuro.')
    expect(errorsOf(past, { originalStartsAt: '2026-11-04T17:30:00.000Z' })).toEqual({})
  })

  it('validates the optional source link and limits photos to 8', () => {
    expect(errorsOf({ ...valid, sourceUrl: 'instagram.com/x' }).sourceUrl).toBe(
      'Ingresa un enlace válido (https://…).',
    )
    expect(errorsOf({ ...valid, sourceUrl: 'https://instagram.com/x' })).toEqual({})
    const nine = Array.from({ length: 9 }, (_, i) => ({ key: String(i), uri: `file:///${i}.jpg` }))
    expect(errorsOf({ ...valid, photos: nine }).photos).toBe('Puedes subir hasta 8 fotos.')
  })
})

describe('toExperienceFields', () => {
  it('builds the row: Santiago wall time to UTC, duration, EWKT point, trimmed text', () => {
    const out = makePlanSchema({ now }).parse({
      ...valid,
      sourceName: ' Muni ',
      isFree: false,
      price: '12.500',
    })
    expect(toExperienceFields(out)).toEqual({
      title: 'Caminata al Ñielol',
      description: 'Subimos juntos al cerro para ver el amanecer.',
      category_id: 'c1',
      comuna: 'Temuco',
      location: 'SRID=4326;POINT(-72.584300 -38.725500)',
      starts_at: '2026-11-07T10:30:00.000Z',
      ends_at: '2026-11-07T13:00:00.000Z',
      capacity: 15,
      is_free: false,
      price_clp: 12500,
      source_name: 'Muni',
      source_url: null,
    })
  })
})

describe('planValuesFrom', () => {
  it('round-trips a saved plan into the form', () => {
    const values = planValuesFrom(
      {
        title: 'Kayak',
        description: 'Atardecer en el lago.',
        category_id: 'c2',
        comuna: 'Pucón',
        lat: -39.28,
        lng: -71.95,
        starts_at: '2026-11-07T22:00:00.000Z',
        ends_at: '2026-11-08T00:30:00.000Z',
        capacity: 12,
        is_free: false,
        price_clp: 20000,
        source_name: null,
        source_url: null,
      },
      [{ id: 'ph1', url: 'https://x/1.jpg', storage_path: 'u/e/1.jpg' }],
    )
    expect(values).toMatchObject({
      photos: [{ key: 'ph1', uri: 'https://x/1.jpg', existingId: 'ph1', storagePath: 'u/e/1.jpg' }],
      date: '2026-11-07',
      startTime: '19:00',
      durationMin: 150,
      price: '20.000',
      location: { lat: -39.28, lng: -71.95 },
    })
  })
})

describe('helpers', () => {
  it('parses and formats CLP prices', () => {
    expect(parsePrice('$ 25.000')).toBe(25000)
    expect(parsePrice('abc')).toBeNull()
    expect(formatPriceInput('0025000')).toBe('25.000')
    expect(formatPriceInput('1234567890')).toBe('123.456.789')
  })

  it('offers start times every 30 minutes and days from today in Santiago', () => {
    expect(START_TIMES[0]).toBe('05:00')
    expect(START_TIMES.at(-1)).toBe('23:30')
    expect(START_TIMES).toContain('07:30')
    const days = bookableDays(new Date('2026-11-05T01:00:00Z')) // 22:00 on Nov 4 in Santiago
    expect(days[0]).toBe('2026-11-04')
    expect(days[1]).toBe('2026-11-05')
  })

  it('writes points longitude first', () => {
    expect(toPoint({ lat: -39.1, lng: -71.2 })).toBe('SRID=4326;POINT(-71.200000 -39.100000)')
  })
})
