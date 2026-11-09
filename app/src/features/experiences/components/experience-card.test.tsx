import { fireEvent, render } from '@testing-library/react-native'

import { flattenPages, type ExperienceCard as Experience } from '../api'

import { ExperienceCard, statusBadge } from './experience-card'
import { ExperienceRowCard } from './experience-row-card'

// The card is presentational; the data layer it shares a module with must not create a real client.
jest.mock('@/lib/supabase', () => ({ supabase: {} }))

const base: Experience = {
  id: 'e1',
  host_id: 'h1',
  title: 'Rafting en el río Trancura',
  category_id: 'c1',
  comuna: 'Pucón',
  starts_at: '2026-11-07T13:00:00-03:00',
  ends_at: '2026-11-07T16:00:00-03:00',
  capacity: 10,
  seats_taken: 3,
  is_free: false,
  price_clp: 25000,
  cover_url: null,
  is_featured: false,
  rating_avg: 4.8,
  rating_count: 24,
  lat: -39.28,
  lng: -71.95,
  distance_km: 2.4,
}
const category = { id: 'c1', name: 'Aventura', icon: 'compass-outline', color: '#D9622B', sort_order: 1 }

describe('statusBadge', () => {
  it('shows one badge by priority: sold out > featured > last seats', () => {
    expect(statusBadge({ ...base, seats_taken: 10, is_featured: true })?.label).toBe('Agotado')
    expect(statusBadge({ ...base, is_featured: true })?.label).toBe('Destacado')
    expect(statusBadge({ ...base, seats_taken: 8 })?.label).toBe('Quedan 2 cupos')
    expect(statusBadge(base)).toBeNull()
  })
})

describe('ExperienceCard', () => {
  it('renders price, rating, distance and opens / saves independently', async () => {
    const onPress = jest.fn()
    const onToggleSave = jest.fn()
    const screen = await render(
      <ExperienceCard
        item={base}
        category={category}
        saved={false}
        onPress={onPress}
        onToggleSave={onToggleSave}
      />,
    )
    expect(screen.getByText('Rafting en el río Trancura')).toBeTruthy()
    expect(screen.getByText('$25.000')).toBeTruthy()
    expect(screen.getByText('AVENTURA')).toBeTruthy()
    expect(screen.getByText('2,4 km')).toBeTruthy()

    await fireEvent.press(screen.getByLabelText('Guardar plan'))
    expect(onToggleSave).toHaveBeenCalledWith(true)
    expect(onPress).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByLabelText(/^Rafting en el río Trancura, Aventura/))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows "Gratis" without "/ persona" and "Nuevo" without reviews', async () => {
    const screen = await render(
      <ExperienceCard
        item={{ ...base, is_free: true, price_clp: null, rating_count: 0 }}
        category={category}
        saved
        onPress={jest.fn()}
        onToggleSave={jest.fn()}
      />,
    )
    expect(screen.getByText('Gratis')).toBeTruthy()
    expect(screen.queryByText('/ persona')).toBeNull()
    expect(screen.getByText('Nuevo')).toBeTruthy()
    expect(screen.getByLabelText('Quitar de guardados')).toBeTruthy()
  })
})

describe('flattenPages', () => {
  it('keeps order and drops duplicates that shifted between pages', () => {
    const a = { ...base, id: 'a' }
    const b = { ...base, id: 'b' }
    const c = { ...base, id: 'c' }
    const out = flattenPages({
      pages: [
        [a, b],
        [b, c],
      ],
      pageParams: [0, 20],
    })
    expect(out.map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(flattenPages(undefined)).toEqual([])
  })
})

describe('ExperienceRowCard', () => {
  it('shows category, place with distance, seats and price; heart does not open the plan', async () => {
    const onPress = jest.fn()
    const onToggleSave = jest.fn()
    const screen = await render(
      <ExperienceRowCard
        item={base}
        category={category}
        saved={false}
        onPress={onPress}
        onToggleSave={onToggleSave}
      />,
    )
    expect(screen.getByText('Aventura')).toBeTruthy()
    expect(screen.getByText('Pucón · 2,4 km')).toBeTruthy()
    expect(screen.getByText('3/10 cupos')).toBeTruthy()
    expect(screen.getByText('$25.000')).toBeTruthy()

    await fireEvent.press(screen.getByLabelText('Guardar plan'))
    expect(onToggleSave).toHaveBeenCalledWith(true)
    expect(onPress).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByLabelText(/^Rafting en el río Trancura, Aventura/))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows Gratis, the place without distance and a sold-out badge', async () => {
    const screen = await render(
      <ExperienceRowCard
        item={{ ...base, is_free: true, price_clp: null, distance_km: null, seats_taken: 10 }}
        category={category}
        saved
        onPress={jest.fn()}
        onToggleSave={jest.fn()}
      />,
    )
    expect(screen.getByText('Gratis')).toBeTruthy()
    expect(screen.getByText('Pucón')).toBeTruthy()
    expect(screen.getByText('Agotado')).toBeTruthy()
    expect(screen.getByLabelText('Quitar de guardados')).toBeTruthy()
  })

  it('uses a short last-seats badge on the narrow photo', async () => {
    const screen = await render(
      <ExperienceRowCard
        item={{ ...base, seats_taken: 7 }}
        category={category}
        saved={false}
        onPress={jest.fn()}
        onToggleSave={jest.fn()}
      />,
    )
    expect(screen.getByText('Últimos 3')).toBeTruthy()
  })
})
