/**
 * DESIGN PREVIEW MODE (development only).
 *
 * Enabled with EXPO_PUBLIC_DESIGN_PREVIEW=1 in a dev build or `expo start --web`. The real screens run
 * unchanged, but the Supabase client talks to this in-memory fake instead of the network:
 *   - a signed-in demo explorer ("Catalina", Temuco), or a demo host ("Camila", owner of 5 seed plans)
 *     with EXPO_PUBLIC_DESIGN_PREVIEW_ROLE=host (`npm run preview -- --host`),
 *   - plans / places / categories generated from the REAL migrations + seed
 *     (supabase/tests/export-preview-fixtures.mjs -> preview-fixtures.json), dates shifted to stay upcoming,
 *   - placeholder photos (Picsum) and simulated seats, ratings and participants for the design review.
 *
 * It is never bundled in release builds: supabase.ts only requires this file when __DEV__ and the flag
 * are both set. It does not implement security (RLS is tested in supabase/tests), only the shapes the
 * app reads.
 */

import type { Database } from '@/types/database'

import fixturesJson from './preview-fixtures.json'

type Json = Record<string, unknown>
type Fns = Database['public']['Functions']
type Experience = Fns['get_experience']['Returns'][number]
type Place = Fns['list_places']['Returns'][number]
// JSON imports infer literal null types; the fixtures follow the RPC row shapes.
const fixtureExperiences = fixturesJson.experiences as unknown as Experience[]
const fixturePlaces = fixturesJson.places as unknown as Place[]

export const PREVIEW_URL = 'https://preview.supabase.co'
export const PREVIEW_KEY = 'design-preview-anon-key'

const AS_HOST = process.env.EXPO_PUBLIC_DESIGN_PREVIEW_ROLE === 'host'
const HOST_ID = 'a0000000-0000-4000-8000-000000000001' // Camila in the seed
const USER_ID = AS_HOST ? HOST_ID : 'b0000000-0000-4000-8000-0000000000aa'
const CAT = (n: number) => `c0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`

// ---------------------------------------------------------------- demo data
// Picsum photos picked to match each seed plan (same order as the fixtures): cover first, then gallery.
const PLAN_PHOTOS: number[][] = [
  [28, 1018, 910], // Cerro Ñielol al amanecer
  [1011, 1051, 916], // Kayak lago Villarrica
  [292, 1080, 342], // Feria Pinto
  [1044, 1053, 938], // Rafting río Trancura
  [1039, 573, 15], // Ojos del Caburgua
  [490, 999], // Taller de cerámica
  [839, 17], // Cicletada Isla Cautín
  [512, 506], // Termas
  [686, 158], // Feria artesanal y música mapuche
  [676, 235, 1036], // Volcán Villarrica
  [453, 1082], // Jazz en vivo
  [434, 980, 1015], // Trekking Huerquehue
  [665, 1001], // Yoga en el Ñielol
  [1083, 124], // Stand up paddle
  [193, 782], // Museo Regional
  [75, 674], // Quesos y vinos
  [395, 1060], // Cervezas artesanales
  [431, 835], // Juegos de mesa
  [548, 903, 683], // Fogata en Curarrehue
  [916, 1043, 29], // Laguna Captrén
]
const planPhotos = (i: number) => PLAN_PHOTOS[i % PLAN_PHOTOS.length] ?? [28]
// Same order as the fixture places (alphabetical): Feria Pinto, Ñielol, Museo, Caburgua, Conguillío, Huerquehue, Playa Grande, Volcán.
const PLACE_PHOTO_IDS = [1080, 10, 193, 573, 1043, 980, 1051, 235]
const photo = (id: number, w = 1200, h = 800) => `https://picsum.photos/id/${id}/${w}/${h}`

// Whole days, so plan times keep their seeded wall-clock values (07:30, 19:00...).
const DAY = 86_400_000
const shiftMs = Math.round((Date.now() - new Date(fixturesJson.generatedAt).getTime()) / DAY) * DAY
const shift = (iso: string) => new Date(new Date(iso).getTime() + shiftMs).toISOString()

const experiences: Experience[] = fixtureExperiences.map((e, i) => {
  // Deterministic "activity" so cards show realistic seats and ratings.
  const taken = Math.min(e.capacity - (i % 5 === 1 ? 2 : 0), Math.round((e.capacity * ((i * 37) % 80)) / 100))
  return {
    ...e,
    starts_at: shift(e.starts_at),
    ends_at: shift(e.ends_at),
    seats_taken: Math.max(0, taken),
    cover_url: photo(planPhotos(i)[0] ?? 28),
    rating_avg: i % 4 === 3 ? 0 : Number((4.5 + ((i * 7) % 5) / 10).toFixed(1)),
    rating_count: i % 4 === 3 ? 0 : 8 + ((i * 13) % 90),
    host_bio:
      e.host_bio ||
      'Guía local en La Araucanía. Me encanta compartir los rincones que más quiero de la región.',
  }
})

const places: Place[] = fixturePlaces.map((p, i) => ({
  ...p,
  photo_url: photo(PLACE_PHOTO_IDS[i % PLACE_PHOTO_IDS.length] ?? 10, 900, 600),
}))

const profile = {
  id: USER_ID,
  role: AS_HOST ? 'host' : 'explorer',
  full_name: AS_HOST
    ? (experiences.find((e) => e.host_id === HOST_ID)?.host_full_name ?? 'Camila Fernández')
    : 'Catalina Rojas',
  avatar_url: null,
  bio: AS_HOST
    ? 'Guía local en Temuco. Organizo caminatas y panoramas al aire libre.'
    : 'Amo el trekking y los cafés de especialidad.',
  interests: [CAT(1), CAT(2), CAT(3)],
  city: 'Temuco',
  is_suspended: false,
  created_at: fixturesJson.generatedAt,
  updated_at: fixturesJson.generatedAt,
}

const PEOPLE = [
  'Javiera Muñoz',
  'Tomás Soto',
  'Antonia Pérez',
  'Benjamín Díaz',
  'Martina Silva',
  'Diego Fuentes',
]
const favorites = new Set<string>([experiences[3]?.id ?? ''])
const bookings = new Map<string, { id: string; seats: number }>()

// ---------------------------------------------------------------- helpers
const toRad = (d: number) => (d * Math.PI) / 180
function km(lat1: number, lng1: number, lat2: number, lng2: number) {
  const h =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2
  return Math.round(6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h))) * 100) / 100
}

const strip = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Local (America/Santiago) date of an instant, as YYYY-MM-DD. */
function localDate(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date(iso))
}

function card(e: Experience, origin: { lat: number; lng: number } | null) {
  return {
    id: e.id,
    host_id: e.host_id,
    title: e.title,
    category_id: e.category_id,
    comuna: e.comuna,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    capacity: e.capacity,
    seats_taken: e.seats_taken,
    is_free: e.is_free,
    price_clp: e.price_clp,
    cover_url: e.cover_url,
    is_featured: e.is_featured,
    rating_avg: e.rating_avg,
    rating_count: e.rating_count,
    lat: e.lat,
    lng: e.lng,
    distance_km: origin ? km(origin.lat, origin.lng, e.lat, e.lng) : null,
  }
}

function search(a: Json) {
  const origin =
    typeof a.p_lat === 'number' && typeof a.p_lng === 'number' ? { lat: a.p_lat, lng: a.p_lng } : null
  const q = typeof a.p_query === 'string' && a.p_query.trim() ? strip(a.p_query.trim()) : null
  const cats = Array.isArray(a.p_category_ids) && a.p_category_ids.length > 0 ? a.p_category_ids : null
  const radius = typeof a.p_radius_km === 'number' ? a.p_radius_km : null
  const now = Date.now()
  let rows = experiences
    .filter((e) => e.status === 'published' && new Date(e.starts_at).getTime() > now)
    .filter((e) => !q || [e.title, e.description, e.comuna].some((s) => strip(s).includes(q)))
    .filter((e) => !cats || cats.includes(e.category_id))
    .filter((e) => !a.p_free_only || e.is_free)
    .filter((e) => !a.p_featured_only || e.is_featured)
    .filter((e) => typeof a.p_date_from !== 'string' || localDate(e.starts_at) >= a.p_date_from)
    .filter((e) => typeof a.p_date_to !== 'string' || localDate(e.starts_at) <= a.p_date_to)
    .map((e) => card(e, origin))
    .filter((c) => radius == null || (c.distance_km ?? Infinity) <= radius)
  const sort = a.p_sort ?? 'soonest'
  rows = rows.sort((x, y) =>
    sort === 'distance'
      ? (x.distance_km ?? 0) - (y.distance_km ?? 0)
      : sort === 'popular'
        ? y.seats_taken - x.seats_taken || x.starts_at.localeCompare(y.starts_at)
        : x.starts_at.localeCompare(y.starts_at),
  )
  const offset = typeof a.p_offset === 'number' ? a.p_offset : 0
  const limit = typeof a.p_limit === 'number' ? a.p_limit : 20
  return rows.slice(offset, offset + limit)
}

function detail(a: Json) {
  const e = experiences.find((x) => x.id === a.p_experience_id)
  if (!e) return []
  if (e.status !== 'published' && e.host_id !== USER_ID && !bookings.has(e.id)) return []
  const origin =
    typeof a.p_lat === 'number' && typeof a.p_lng === 'number' ? { lat: a.p_lat, lng: a.p_lng } : null
  const booking = bookings.get(e.id)
  return [
    {
      ...e,
      distance_km: origin ? km(origin.lat, origin.lng, e.lat, e.lng) : null,
      my_booking_id: booking?.id ?? null,
      my_booking_seats: booking?.seats ?? null,
      is_favorite: favorites.has(e.id),
    },
  ]
}

function participants(a: Json) {
  const e = experiences.find((x) => x.id === a.p_experience_id)
  if (!e) return []
  const list = PEOPLE.slice(0, Math.min(PEOPLE.length, e.seats_taken)).map((name, i) => ({
    user_id: `p-${i}`,
    full_name: name,
    avatar_url: null,
    seats: 1,
  }))
  const extra = e.seats_taken - list.length
  if (extra > 0 && list[0]) list[0] = { ...list[0], seats: 1 + extra }
  const mine = bookings.get(e.id)
  return mine
    ? [{ user_id: USER_ID, full_name: profile.full_name, avatar_url: null, seats: mine.seats }, ...list]
    : list
}

// ---------------------------------------------------------------- host: plans, photos, storage
type PhotoRow = {
  id: string
  experience_id: string
  url: string
  storage_path: string | null
  sort_order: number
}
const photoStore = new Map<string, PhotoRow[]>()
/** Uploaded files (web previews): public URL -> blob URL the browser can show. */
const uploads = new Map<string, string>()
let photoSeq = 0

function photosOf(experienceId: string): PhotoRow[] {
  let rows = photoStore.get(experienceId)
  if (!rows) {
    const i = experiences.findIndex((x) => x.id === experienceId)
    rows =
      i === -1
        ? []
        : planPhotos(i).map((pid, n) => ({
            id: `${experienceId}-${n}`,
            experience_id: experienceId,
            url: photo(pid),
            storage_path: null,
            sort_order: n,
          }))
    photoStore.set(experienceId, rows)
  }
  return rows
}

function syncCover(experienceId: string) {
  const e = experiences.find((x) => x.id === experienceId)
  const first = [...photosOf(experienceId)].sort((x, y) => x.sort_order - y.sort_order)[0]
  if (e) e.cover_url = first?.url ?? null
}

/** 'SRID=4326;POINT(lng lat)' -> { lat, lng } */
function parsePoint(value: unknown): { lat: number; lng: number } | null {
  const m = typeof value === 'string' ? /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(value) : null
  return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null
}

const PLAN_COLUMNS = [
  'title',
  'description',
  'category_id',
  'comuna',
  'starts_at',
  'ends_at',
  'capacity',
  'is_free',
  'price_clp',
  'source_name',
  'source_url',
  'status',
] as const

function applyPlanFields(e: Experience, row: Json) {
  const target = e as unknown as Json
  for (const key of PLAN_COLUMNS) if (key in row) target[key] = row[key]
  const point = parsePoint(row.location)
  if (point) Object.assign(e, point)
}

function myPlans() {
  const now = Date.now()
  return experiences
    .filter((e) => e.host_id === USER_ID)
    .sort((x, y) => {
      const xp = new Date(x.ends_at).getTime() < now
      const yp = new Date(y.ends_at).getTime() < now
      if (xp !== yp) return xp ? 1 : -1
      return xp ? y.starts_at.localeCompare(x.starts_at) : x.starts_at.localeCompare(y.starts_at)
    })
    .map((e) => ({ ...card(e, null), status: e.status }))
}

const idFilter = (params: URLSearchParams) => params.get('id')?.replace(/^eq\./, '') ?? null
const idList = (params: URLSearchParams) =>
  /^in\.\((.*)\)$/
    .exec(params.get('id') ?? '')?.[1]
    ?.split(',')
    .map((x) => x.replace(/"/g, '')) ?? []

function businessError(code: string) {
  return { status: 400, body: { code: 'P0001', message: code, details: null, hint: null } }
}

function rpc(name: string, a: Json): { status: number; body: unknown } {
  switch (name) {
    case 'search_experiences':
      return { status: 200, body: search(a) }
    case 'nearby_experiences':
      return { status: 200, body: search({ ...a, p_sort: 'distance' }) }
    case 'get_experience':
      return { status: 200, body: detail(a) }
    case 'list_my_experiences':
      return { status: 200, body: myPlans() }
    case 'experience_participants':
      return { status: 200, body: participants(a) }
    case 'list_places': {
      const origin =
        typeof a.p_lat === 'number' && typeof a.p_lng === 'number' ? { lat: a.p_lat, lng: a.p_lng } : null
      const rows = places
        .map((p) => ({ ...p, distance_km: origin ? km(origin.lat, origin.lng, p.lat, p.lng) : null }))
        .sort((x, y) => (x.distance_km ?? 0) - (y.distance_km ?? 0))
      return { status: 200, body: rows.slice(0, typeof a.p_limit === 'number' ? a.p_limit : 20) }
    }
    case 'join_experience': {
      const e = experiences.find((x) => x.id === a.p_experience_id)
      const seats = typeof a.p_seats === 'number' ? a.p_seats : 1
      if (!e) return businessError('experience_not_found')
      if (bookings.has(e.id)) return businessError('already_joined')
      if (e.capacity - e.seats_taken < seats) return businessError('not_enough_seats')
      e.seats_taken += seats
      const booking = { id: `bk-${e.id}`, seats }
      bookings.set(e.id, booking)
      return {
        status: 200,
        body: {
          ...booking,
          experience_id: e.id,
          user_id: USER_ID,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          cancelled_at: null,
        },
      }
    }
    case 'cancel_booking': {
      const entry = [...bookings.entries()].find(([, b]) => b.id === a.p_booking_id)
      if (!entry) return businessError('booking_not_found')
      const [experienceId, b] = entry
      const e = experiences.find((x) => x.id === experienceId)
      if (e) e.seats_taken -= b.seats
      bookings.delete(experienceId)
      return {
        status: 200,
        body: {
          ...b,
          experience_id: experienceId,
          user_id: USER_ID,
          status: 'cancelled',
          created_at: '',
          cancelled_at: new Date().toISOString(),
        },
      }
    }
    default:
      return { status: 404, body: { message: `preview: rpc ${name} not mocked` } }
  }
}

function table(method: string, name: string, params: URLSearchParams, body: unknown) {
  const wantsObject = false
  switch (name) {
    case 'profiles':
      return { status: 200, body: [profile], wantsObject }
    case 'categories':
      return { status: 200, body: fixturesJson.categories }
    case 'experiences': {
      if (method === 'POST') {
        const row = (Array.isArray(body) ? body[0] : body) as Json
        const e = {
          ...(experiences[0] as Experience),
          id: String(row.id),
          host_id: USER_ID,
          seats_taken: 0,
          is_featured: false,
          cover_url: null,
          rating_avg: 0,
          rating_count: 0,
          host_full_name: profile.full_name,
          host_avatar_url: null,
          host_bio: profile.bio,
          my_booking_id: null,
          my_booking_seats: null,
          is_favorite: false,
        } as Experience
        applyPlanFields(e, row)
        experiences.push(e)
        photoStore.set(e.id, [])
        return { status: 201, body: null }
      }
      if (method === 'PATCH') {
        const e = experiences.find((x) => x.id === idFilter(params) && x.host_id === USER_ID)
        if (!e) return { status: 200, body: [] }
        if (e.status === 'cancelled') return businessError('experience_cancelled')
        applyPlanFields(e, (body ?? {}) as Json)
        return { status: 204, body: null }
      }
      return { status: 405, body: null }
    }
    case 'experience_photos': {
      if (method === 'GET') {
        const id = params.get('experience_id')?.replace(/^eq\./, '') ?? ''
        if (!experiences.some((x) => x.id === id)) return { status: 200, body: [] }
        return { status: 200, body: [...photosOf(id)].sort((x, y) => x.sort_order - y.sort_order) }
      }
      if (method === 'POST') {
        const rows = (Array.isArray(body) ? body : [body]) as PhotoRow[]
        for (const r of rows) {
          photosOf(r.experience_id).push({
            id: `photo-${++photoSeq}`,
            experience_id: r.experience_id,
            url: uploads.get(r.url) ?? r.url,
            storage_path: r.storage_path ?? null,
            sort_order: r.sort_order ?? 0,
          })
          syncCover(r.experience_id)
        }
        return { status: 201, body: null }
      }
      if (method === 'PATCH' || method === 'DELETE') {
        const ids = method === 'DELETE' ? idList(params) : [idFilter(params) ?? '']
        for (const [experienceId, rows] of photoStore) {
          const next =
            method === 'DELETE'
              ? rows.filter((r) => !ids.includes(r.id))
              : rows.map((r) => (ids.includes(r.id) ? { ...r, ...(body as Partial<PhotoRow>) } : r))
          photoStore.set(experienceId, next)
          syncCover(experienceId)
        }
        return { status: 204, body: null }
      }
      return { status: 405, body: null }
    }
    case 'favorites': {
      if (method === 'GET')
        return { status: 200, body: [...favorites].map((experience_id) => ({ experience_id })) }
      if (method === 'POST') {
        const row = (Array.isArray(body) ? body[0] : body) as { experience_id?: string } | undefined
        if (row?.experience_id) favorites.add(row.experience_id)
        return { status: 201, body: null }
      }
      if (method === 'DELETE') {
        const id = params.get('experience_id')?.replace(/^eq\./, '')
        if (id) favorites.delete(id)
        return { status: 204, body: null }
      }
      return { status: 405, body: null }
    }
    default:
      return { status: 404, body: { message: `preview: table ${name} not mocked` } }
  }
}

const respond = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(status === 204 || body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })

/** fetch() replacement for the Supabase client in preview mode. */
export async function previewFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  if (url.origin !== PREVIEW_URL) return fetch(input, init)
  const method = (init?.method ?? 'GET').toUpperCase()
  const raw = typeof init?.body === 'string' ? init.body : null
  let body: unknown = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = null
  }
  // Small latency so skeletons and transitions are visible.
  await new Promise((r) => setTimeout(r, 250))

  if (url.pathname.startsWith('/auth/v1/user')) return respond(200, session.user)
  if (url.pathname.startsWith('/auth/v1/logout')) return respond(204, null)
  if (url.pathname.startsWith('/storage/v1/object/')) {
    const path = url.pathname.slice('/storage/v1/object/'.length)
    if (method === 'POST' && init?.body != null && typeof URL.createObjectURL === 'function') {
      const blob = init.body instanceof Blob ? init.body : new Blob([init.body as BlobPart])
      uploads.set(`${PREVIEW_URL}/storage/v1/object/public/${path}`, URL.createObjectURL(blob))
    }
    return respond(200, method === 'DELETE' ? [] : { Key: path, Id: path })
  }
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const { status, body: out } = rpc(url.pathname.slice('/rest/v1/rpc/'.length), (body ?? {}) as Json)
    return respond(status, out)
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    const name = url.pathname.slice('/rest/v1/'.length)
    const result = table(method, name, url.searchParams, body)
    const accept = new Headers(init?.headers).get('accept') ?? ''
    // .single() asks for one object.
    if (accept.includes('vnd.pgrst.object') && Array.isArray(result.body)) {
      return respond(result.status, result.body[0] ?? null)
    }
    return respond(result.status, result.body)
  }
  return respond(404, { message: 'preview: not mocked' })
}

// ---------------------------------------------------------------- session
const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const EXPIRES_AT = 4_102_444_800 // 2100-01-01
const session = {
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: USER_ID, role: 'authenticated', exp: EXPIRES_AT, aud: 'authenticated' })}.preview`,
  token_type: 'bearer',
  expires_in: EXPIRES_AT - Math.floor(Date.now() / 1000),
  expires_at: EXPIRES_AT,
  refresh_token: 'preview-refresh-token',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'catalina@preview.local',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: profile.full_name, role: profile.role },
    created_at: fixturesJson.generatedAt,
  },
}

/** Auth storage that always holds the demo session. */
export const previewStorage = {
  getItem: async (_key: string) => JSON.stringify(session),
  setItem: async (_key: string, _value: string) => undefined,
  removeItem: async (_key: string) => undefined,
}
