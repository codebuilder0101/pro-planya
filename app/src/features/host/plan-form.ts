/**
 * Publish / edit plan form: values, validation (Spanish messages) and the
 * conversion to an `experiences` row. Pure (no React, no network) so it is unit tested.
 */
import { z } from 'zod'

import { addDays, formatTime, toDateString, zonedTimeToDate, type DateString } from '@/lib/dates'
import type { Coords } from '@/lib/location'

export const MAX_PHOTOS = 8
export const MIN_DURATION_MIN = 30
export const MAX_DURATION_MIN = 24 * 60
export const DURATION_STEP_MIN = 30
export const MAX_CAPACITY = 500
export const MAX_PRICE_CLP = 10_000_000
/** How far ahead the date strip goes. */
export const BOOKABLE_DAYS = 120

/** A photo in the form: already uploaded (`existingId`) or picked from the device. */
export type FormPhoto = {
  key: string
  uri: string
  existingId?: string
  storagePath?: string | null
  width?: number
  height?: number
}

const URL_RE = /^https?:\/\/\S+$/i

/** "25.000" / "$ 25000" -> 25000; anything without digits -> null. */
export function parsePrice(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isSafeInteger(n) ? n : null
}

/** 25000 -> "25.000" (for the price input). */
export function formatPriceInput(text: string): string {
  const digits = text
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 9)
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Start times offered in the form: every 30 minutes from 05:00 to 23:30. */
export const START_TIMES: string[] = Array.from({ length: 38 }, (_, i) => {
  const minutes = 5 * 60 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

/** Days shown in the date strip, starting today (Santiago time). */
export function bookableDays(now: Date = new Date()): DateString[] {
  const today = toDateString(now)
  return Array.from({ length: BOOKABLE_DAYS }, (_, i) => addDays(today, i))
}

type SchemaOptions = {
  now?: Date
  /** Editing: the saved start. An unchanged start may already be in the past (ongoing plan). */
  originalStartsAt?: string | null
}

export function makePlanSchema({ now, originalStartsAt = null }: SchemaOptions = {}) {
  return z
    .object({
      photos: z
        .array(z.custom<FormPhoto>())
        .min(1, 'Agrega al menos una foto. La primera será la portada.')
        .max(MAX_PHOTOS, `Puedes subir hasta ${MAX_PHOTOS} fotos.`),
      title: z
        .string()
        .trim()
        .min(3, 'El título debe tener al menos 3 caracteres.')
        .max(100, 'El título puede tener hasta 100 caracteres.'),
      description: z
        .string()
        .trim()
        .min(10, 'Cuenta un poco más del plan (mínimo 10 caracteres).')
        .max(4000, 'La descripción puede tener hasta 4000 caracteres.'),
      categoryId: z.string().min(1, 'Elige una categoría.'),
      comuna: z
        .string()
        .trim()
        .min(1, 'Indica la comuna.')
        .max(60, 'La comuna puede tener hasta 60 caracteres.'),
      location: z.custom<Coords | null>().refine((v) => v != null, 'Marca el punto de encuentro en el mapa.'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elige la fecha.'),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Elige la hora de inicio.'),
      durationMin: z.number().int().min(MIN_DURATION_MIN).max(MAX_DURATION_MIN),
      capacity: z
        .number()
        .int()
        .min(1, 'Debe haber al menos 1 cupo.')
        .max(MAX_CAPACITY, `Máximo ${MAX_CAPACITY} cupos.`),
      isFree: z.boolean(),
      price: z.string(),
      sourceName: z.string().trim().max(80, 'La fuente puede tener hasta 80 caracteres.'),
      sourceUrl: z
        .string()
        .trim()
        .max(500, 'El enlace es muy largo.')
        .refine((v) => v === '' || URL_RE.test(v), 'Ingresa un enlace válido (https://…).'),
    })
    .superRefine((v, ctx) => {
      if (!v.isFree) {
        const price = parsePrice(v.price)
        if (price == null || price < 1)
          ctx.addIssue({ code: 'custom', path: ['price'], message: 'Ingresa el precio en pesos.' })
        else if (price > MAX_PRICE_CLP)
          ctx.addIssue({ code: 'custom', path: ['price'], message: 'El precio máximo es $10.000.000.' })
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(v.date) && /^\d{2}:\d{2}$/.test(v.startTime)) {
        const start = zonedTimeToDate(v.date, v.startTime)
        const unchanged = originalStartsAt != null && start.getTime() === new Date(originalStartsAt).getTime()
        if (!unchanged && start.getTime() <= (now ?? new Date()).getTime())
          ctx.addIssue({
            code: 'custom',
            path: ['startTime'],
            message: 'Esa fecha y hora ya pasaron. Elige un horario futuro.',
          })
      }
    })
}

export type PlanFormValues = z.input<ReturnType<typeof makePlanSchema>>
export type PlanFormOutput = z.output<ReturnType<typeof makePlanSchema>>

/** Columns written to public.experiences (insert or update). */
export type ExperienceFields = {
  title: string
  description: string
  category_id: string
  comuna: string
  location: string
  starts_at: string
  ends_at: string
  capacity: number
  is_free: boolean
  price_clp: number | null
  source_name: string | null
  source_url: string | null
}

/** PostGIS point as EWKT (PostgREST casts it to geography). Longitude first. */
export function toPoint({ lat, lng }: Coords): string {
  return `SRID=4326;POINT(${lng.toFixed(6)} ${lat.toFixed(6)})`
}

export function toExperienceFields(v: PlanFormOutput): ExperienceFields {
  const location = v.location
  if (!location) throw new Error('location_required')
  const start = zonedTimeToDate(v.date, v.startTime)
  const end = new Date(start.getTime() + v.durationMin * 60_000)
  return {
    title: v.title,
    description: v.description,
    category_id: v.categoryId,
    comuna: v.comuna,
    location: toPoint(location),
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    capacity: v.capacity,
    is_free: v.isFree,
    price_clp: v.isFree ? null : parsePrice(v.price),
    source_name: v.sourceName || null,
    source_url: v.sourceUrl || null,
  }
}

export function emptyPlanValues(comuna: string): PlanFormValues {
  return {
    photos: [],
    title: '',
    description: '',
    categoryId: '',
    comuna,
    location: null,
    date: '',
    startTime: '',
    durationMin: 120,
    capacity: 10,
    isFree: true,
    price: '',
    sourceName: '',
    sourceUrl: '',
  }
}

/** Form values for editing a saved plan. */
export function planValuesFrom(
  e: {
    title: string
    description: string
    category_id: string
    comuna: string
    lat: number
    lng: number
    starts_at: string
    ends_at: string
    capacity: number
    is_free: boolean
    price_clp: number | null
    source_name: string | null
    source_url: string | null
  },
  photos: { id: string; url: string; storage_path?: string | null }[],
): PlanFormValues {
  const start = new Date(e.starts_at)
  const minutes = Math.round((new Date(e.ends_at).getTime() - start.getTime()) / 60_000)
  return {
    photos: photos.map((p) => ({
      key: p.id,
      uri: p.url,
      existingId: p.id,
      storagePath: p.storage_path ?? null,
    })),
    title: e.title,
    description: e.description,
    categoryId: e.category_id,
    comuna: e.comuna,
    location: { lat: e.lat, lng: e.lng },
    date: toDateString(start),
    startTime: formatTime(start),
    durationMin: Math.min(Math.max(minutes, MIN_DURATION_MIN), MAX_DURATION_MIN),
    capacity: e.capacity,
    isFree: e.is_free,
    price: e.price_clp != null ? formatPriceInput(String(e.price_clp)) : '',
    sourceName: e.source_name ?? '',
    sourceUrl: e.source_url ?? '',
  }
}
