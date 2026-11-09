import { splitBookings, type MyBooking } from './split'

const booking = (id: string, starts: string, ends: string): MyBooking => ({
  id,
  seats: 1,
  createdAt: '2026-11-01T12:00:00Z',
  experience: {
    id: `e-${id}`,
    title: id,
    category_id: 'c',
    comuna: 'Temuco',
    starts_at: starts,
    ends_at: ends,
    cover_url: null,
    status: 'published',
    is_free: true,
    price_clp: null,
    host_id: 'h',
  },
})

describe('splitBookings', () => {
  const now = new Date('2026-11-10T12:00:00Z').getTime()

  it('moves a plan to past once it has ended, not when it starts', () => {
    const running = booking('running', '2026-11-10T11:00:00Z', '2026-11-10T13:00:00Z')
    const ended = booking('ended', '2026-11-10T09:00:00Z', '2026-11-10T11:00:00Z')
    const { upcoming, past } = splitBookings([running, ended], now)
    expect(upcoming.map((b) => b.id)).toEqual(['running'])
    expect(past.map((b) => b.id)).toEqual(['ended'])
  })

  it('sorts upcoming soonest first and past most recent first', () => {
    const list = [
      booking('later', '2026-11-20T10:00:00Z', '2026-11-20T12:00:00Z'),
      booking('sooner', '2026-11-12T10:00:00Z', '2026-11-12T12:00:00Z'),
      booking('old', '2026-10-01T10:00:00Z', '2026-10-01T12:00:00Z'),
      booking('recent', '2026-11-05T10:00:00Z', '2026-11-05T12:00:00Z'),
    ]
    const { upcoming, past } = splitBookings(list, now)
    expect(upcoming.map((b) => b.id)).toEqual(['sooner', 'later'])
    expect(past.map((b) => b.id)).toEqual(['recent', 'old'])
  })
})
