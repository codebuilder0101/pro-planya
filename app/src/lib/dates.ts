/**
 * Date logic in America/Santiago, independent of the device time zone.
 *
 * Intl is only used to read numeric date parts in the target zone; all Spanish
 * names are our own, so output does not depend on the engine's locale data.
 */

export const APP_TIME_ZONE = 'America/Santiago'

/** Local calendar date, 'YYYY-MM-DD'. */
export type DateString = string

export type ZonedParts = {
  year: number
  month: number // 1-12
  day: number
  hour: number // 0-23
  minute: number
  weekday: number // 0 = domingo ... 6 = sábado
}

const WEEKDAYS_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const WEEKDAYS_ES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const MONTHS_ES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

const formatters = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, f)
  }
  return f
}

export function zonedParts(date: Date, timeZone: string = APP_TIME_ZONE): ZonedParts {
  const out: Record<string, string> = {}
  for (const p of partsFormatter(timeZone).formatToParts(date)) out[p.type] = p.value
  const hour = Number(out.hour) % 24 // some engines print "24" for midnight
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour,
    minute: Number(out.minute),
    weekday: Math.max(WEEKDAYS_SHORT_EN.indexOf(out.weekday ?? ''), 0),
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function toDateString(date: Date, timeZone: string = APP_TIME_ZONE): DateString {
  const p = zonedParts(date, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

export function parseDateString(s: DateString): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) throw new Error(`Invalid date string: ${s}`)
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

/** Pure calendar arithmetic on 'YYYY-MM-DD'. */
export function addDays(s: DateString, days: number): DateString {
  const { year, month, day } = parseDateString(s)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** 0 = domingo ... 6 = sábado, for a calendar date. */
export function weekdayOf(s: DateString): number {
  const { year, month, day } = parseDateString(s)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export type DateRange = { from: DateString; to: DateString }

export function todayRange(now: Date = new Date()): DateRange {
  const today = toDateString(now)
  return { from: today, to: today }
}

/**
 * "Este fin de semana": the coming Saturday + Sunday. On Saturday it is today and
 * tomorrow; on Sunday it is just today.
 */
export function weekendRange(now: Date = new Date()): DateRange {
  const today = toDateString(now)
  const wd = weekdayOf(today)
  if (wd === 0) return { from: today, to: today }
  const saturday = addDays(today, 6 - wd)
  return { from: saturday, to: addDays(saturday, 1) }
}

/** The next given weekday including today, e.g. "este sábado" = nextWeekday(now, 6). */
export function nextWeekday(now: Date, weekday: number): DateString {
  const today = toDateString(now)
  const diff = (weekday - weekdayOf(today) + 7) % 7
  return addDays(today, diff)
}

/**
 * Converts a wall-clock time in America/Santiago to an absolute Date, regardless
 * of the device time zone. Handles DST: for a time that does not exist (spring
 * forward gap) it returns the instant after the gap.
 */
export function zonedTimeToDate(date: DateString, time: string, timeZone: string = APP_TIME_ZONE): Date {
  const { year, month, day } = parseDateString(date)
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!tm) throw new Error(`Invalid time: ${time}`)
  const hour = Number(tm[1])
  const minute = Number(tm[2])
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute)

  const offsetAt = (instant: number) => {
    const p = zonedParts(new Date(instant), timeZone)
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - instant
  }

  let guess = wallAsUtc - offsetAt(wallAsUtc)
  const second = wallAsUtc - offsetAt(guess)
  if (second !== guess) guess = second
  return new Date(guess)
}

// ---------------------------------------------------------------- display

/** "07:30" */
export function formatTime(date: Date): string {
  const p = zonedParts(date)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** "07:30 – 10:00" */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** "sábado 8 de noviembre" (adds the year when it differs from `now`). */
export function formatLongDate(date: Date, now: Date = new Date()): string {
  const p = zonedParts(date)
  const base = `${WEEKDAYS_ES[p.weekday]} ${p.day} de ${MONTHS_ES[p.month - 1]}`
  return p.year === zonedParts(now).year ? base : `${base} de ${p.year}`
}

/** "8 nov" */
export function formatShortDate(date: Date): string {
  const p = zonedParts(date)
  return `${p.day} ${MONTHS_ES_SHORT[p.month - 1]}`
}

/**
 * Card date: "Hoy · 19:00", "Mañana · 07:30", "Sáb 8 nov · 10:00".
 */
export function formatPlanDate(start: Date, now: Date = new Date()): string {
  const day = toDateString(start)
  const today = toDateString(now)
  const p = zonedParts(start)
  let label: string
  if (day === today) label = 'Hoy'
  else if (day === addDays(today, 1)) label = 'Mañana'
  else label = `${WEEKDAYS_ES_SHORT[p.weekday]} ${p.day} ${MONTHS_ES_SHORT[p.month - 1]}`
  return `${label} · ${formatTime(start)}`
}

/** "Buenos días" (05–11), "Buenas tardes" (12–19), "Buenas noches" (20–04). */
export function greetingFor(now: Date = new Date()): string {
  const { hour } = zonedParts(now)
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

/** "45 min", "2 h", "2 h 30 min", "3 días" (multi-day plans). */
export function formatDuration(start: Date, end: Date): string {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  if (minutes >= 24 * 60) {
    const days = Math.round(minutes / (24 * 60))
    return days === 1 ? '1 día' : `${days} días`
  }
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** "sábado 8 de noviembre" -> "Sábado 8 de noviembre". */
export function capitalize(s: string): string {
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Date strip label parts for a YYYY-MM-DD day: { weekday: 'Sáb', day: 7, month: 'nov' }. */
export function dayLabel(s: DateString): { weekday: string; day: number; month: string } {
  const { day, month } = parseDateString(s)
  return { weekday: WEEKDAYS_ES_SHORT[weekdayOf(s)] ?? '', day, month: MONTHS_ES_SHORT[month - 1] ?? '' }
}

/** Conversation list time: "14:05" today, "Ayer", "Lun" this week, "8 nov" before. */
export function formatChatListTime(date: Date, now: Date = new Date()): string {
  const day = toDateString(date)
  const today = toDateString(now)
  if (day === today) return formatTime(date)
  if (day === addDays(today, -1)) return 'Ayer'
  if (day > addDays(today, -7)) return WEEKDAYS_ES_SHORT[zonedParts(date).weekday] ?? formatShortDate(date)
  return formatShortDate(date)
}

/** Chat day separator: "Hoy", "Ayer", "Sábado 8 de noviembre". */
export function formatChatDay(date: Date, now: Date = new Date()): string {
  const day = toDateString(date)
  const today = toDateString(now)
  if (day === today) return 'Hoy'
  if (day === addDays(today, -1)) return 'Ayer'
  return capitalize(formatLongDate(date, now))
}
