import {
  addDays,
  capitalize,
  formatDuration,
  formatLongDate,
  formatPlanDate,
  formatTime,
  formatTimeRange,
  greetingFor,
  nextWeekday,
  toDateString,
  todayRange,
  weekdayOf,
  weekendRange,
  zonedParts,
  zonedTimeToDate,
} from './dates'

// Chile: UTC-3 in summer (Sep–Apr), UTC-4 in winter (Apr–Sep).
const summer = (iso: string) => new Date(`${iso}-03:00`)
const winter = (iso: string) => new Date(`${iso}-04:00`)

describe('zoned parts in America/Santiago', () => {
  it('reads local time regardless of the machine time zone', () => {
    // 2026-11-07 02:30 UTC is still Friday Nov 6, 23:30 in Santiago (UTC-3).
    const p = zonedParts(new Date('2026-11-07T02:30:00Z'))
    expect(p).toMatchObject({ year: 2026, month: 11, day: 6, hour: 23, minute: 30, weekday: 5 })
    expect(toDateString(new Date('2026-11-07T02:30:00Z'))).toBe('2026-11-06')
  })
  it('handles midnight as hour 0', () => {
    expect(zonedParts(summer('2026-11-07T00:00:00')).hour).toBe(0)
  })
})

describe('calendar helpers', () => {
  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('knows weekdays', () => {
    expect(weekdayOf('2026-11-07')).toBe(6) // Saturday
    expect(weekdayOf('2026-11-08')).toBe(0) // Sunday
  })
})

describe('date filter ranges', () => {
  it('today', () => {
    expect(todayRange(summer('2026-11-04T10:00:00'))).toEqual({ from: '2026-11-04', to: '2026-11-04' })
  })
  it('this weekend from a weekday is next Saturday + Sunday', () => {
    expect(weekendRange(summer('2026-11-04T10:00:00'))).toEqual({ from: '2026-11-07', to: '2026-11-08' })
  })
  it('this weekend on Saturday is today + tomorrow', () => {
    expect(weekendRange(summer('2026-11-07T10:00:00'))).toEqual({ from: '2026-11-07', to: '2026-11-08' })
  })
  it('this weekend on Sunday is just today', () => {
    expect(weekendRange(summer('2026-11-08T10:00:00'))).toEqual({ from: '2026-11-08', to: '2026-11-08' })
  })
  it('uses the Santiago date late at night (UTC already next day)', () => {
    // Friday 23:30 local = Saturday 02:30 UTC; the weekend is still tomorrow.
    expect(weekendRange(new Date('2026-11-07T02:30:00Z'))).toEqual({ from: '2026-11-07', to: '2026-11-08' })
  })
  it('"este sábado"', () => {
    expect(nextWeekday(summer('2026-11-04T10:00:00'), 6)).toBe('2026-11-07')
    expect(nextWeekday(summer('2026-11-07T10:00:00'), 6)).toBe('2026-11-07')
    expect(nextWeekday(summer('2026-11-08T10:00:00'), 6)).toBe('2026-11-14')
  })
})

describe('zonedTimeToDate', () => {
  it('converts summer wall time (UTC-3)', () => {
    expect(zonedTimeToDate('2026-12-12', '19:30').toISOString()).toBe('2026-12-12T22:30:00.000Z')
  })
  it('converts winter wall time (UTC-4)', () => {
    expect(zonedTimeToDate('2026-07-15', '07:00').toISOString()).toBe('2026-07-15T11:00:00.000Z')
  })
  it('round-trips through zonedParts', () => {
    for (const [d, t] of [
      ['2026-01-01', '00:00'],
      ['2026-04-04', '23:59'],
      ['2026-09-05', '12:00'],
      ['2026-11-20', '08:15'],
    ] as const) {
      const p = zonedParts(zonedTimeToDate(d, t))
      expect(
        `${toDateString(zonedTimeToDate(d, t))} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`,
      ).toBe(`${d} ${t}`)
    }
  })
  it('rejects malformed input', () => {
    expect(() => zonedTimeToDate('2026-1-1', '10:00')).toThrow()
    expect(() => zonedTimeToDate('2026-01-01', '10h')).toThrow()
  })
})

describe('display', () => {
  const now = summer('2026-11-04T10:00:00') // Wednesday

  it('times and ranges', () => {
    expect(formatTime(summer('2026-11-04T07:05:00'))).toBe('07:05')
    expect(formatTimeRange(summer('2026-11-04T07:30:00'), summer('2026-11-04T10:00:00'))).toBe(
      '07:30 – 10:00',
    )
  })
  it('card dates: Hoy / Mañana / weekday', () => {
    expect(formatPlanDate(summer('2026-11-04T19:00:00'), now)).toBe('Hoy · 19:00')
    expect(formatPlanDate(summer('2026-11-05T07:30:00'), now)).toBe('Mañana · 07:30')
    expect(formatPlanDate(summer('2026-11-07T10:00:00'), now)).toBe('Sáb 7 nov · 10:00')
  })
  it('long dates add the year only when different', () => {
    expect(formatLongDate(summer('2026-11-07T10:00:00'), now)).toBe('sábado 7 de noviembre')
    expect(formatLongDate(summer('2027-01-02T10:00:00'), now)).toBe('sábado 2 de enero de 2027')
  })
  it('greets by Santiago time of day', () => {
    expect(greetingFor(summer('2026-11-04T08:00:00'))).toBe('Buenos días')
    expect(greetingFor(summer('2026-11-04T15:00:00'))).toBe('Buenas tardes')
    expect(greetingFor(summer('2026-11-04T22:00:00'))).toBe('Buenas noches')
    expect(greetingFor(winter('2026-07-15T04:59:00'))).toBe('Buenas noches')
  })
})

describe('formatDuration / capitalize', () => {
  const at = (iso: string) => new Date(iso)
  it('formats minutes, hours and days', () => {
    expect(formatDuration(at('2026-11-04T10:00:00Z'), at('2026-11-04T10:45:00Z'))).toBe('45 min')
    expect(formatDuration(at('2026-11-04T10:00:00Z'), at('2026-11-04T12:00:00Z'))).toBe('2 h')
    expect(formatDuration(at('2026-11-04T10:00:00Z'), at('2026-11-04T12:30:00Z'))).toBe('2 h 30 min')
    expect(formatDuration(at('2026-11-04T10:00:00Z'), at('2026-11-05T10:00:00Z'))).toBe('1 día')
    expect(formatDuration(at('2026-11-04T10:00:00Z'), at('2026-11-07T09:00:00Z'))).toBe('3 días')
    expect(formatDuration(at('2026-11-04T10:00:00Z'), at('2026-11-04T09:00:00Z'))).toBe('0 min')
  })
  it('capitalizes the first letter only', () => {
    expect(capitalize('sábado 8 de noviembre')).toBe('Sábado 8 de noviembre')
    expect(capitalize('')).toBe('')
  })
})
