import type { Database } from '@/types/database'

type ExperienceStatus = Database['public']['Enums']['experience_status']

export type MyBooking = {
  id: string
  seats: number
  createdAt: string
  experience: {
    id: string
    title: string
    category_id: string
    comuna: string
    starts_at: string
    ends_at: string
    cover_url: string | null
    status: ExperienceStatus
    is_free: boolean
    price_clp: number | null
    host_id: string
  }
}

/** Upcoming (soonest first) and past (most recent first), split by the plan's end time. */
export function splitBookings(bookings: MyBooking[], now: number) {
  const upcoming: MyBooking[] = []
  const past: MyBooking[] = []
  for (const b of bookings) {
    const ended = new Date(b.experience.ends_at).getTime() <= now
    ;(ended ? past : upcoming).push(b)
  }
  const start = (b: MyBooking) => new Date(b.experience.starts_at).getTime()
  upcoming.sort((a, b) => start(a) - start(b))
  past.sort((a, b) => start(b) - start(a))
  return { upcoming, past }
}
