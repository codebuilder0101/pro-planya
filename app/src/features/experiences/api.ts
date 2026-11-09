import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'

import type { SearchArgs } from '@/features/explore/filters'
import { useUserId } from '@/features/profile/api'
import type { Coords } from '@/lib/location'
import { PAGE_SIZE, queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Fns = Database['public']['Functions']
export type ExperienceCard = Fns['search_experiences']['Returns'][number]
export type ExperienceDetail = Fns['get_experience']['Returns'][number]
export type Participant = Fns['experience_participants']['Returns'][number]

async function search(args: SearchArgs): Promise<ExperienceCard[]> {
  const { data, error } = await supabase.rpc('search_experiences', args)
  if (error) throw error
  return data
}

/** A short horizontal list (Home carousels). */
export function useExperienceList(name: string, args: SearchArgs, options: { enabled?: boolean } = {}) {
  const full: SearchArgs = { p_limit: 10, p_offset: 0, ...args }
  return useQuery({
    queryKey: queryKeys.experienceList(name, full),
    queryFn: () => search(full),
    enabled: options.enabled ?? true,
  })
}

/** Paginated results (Explore list + map), 20 per page. */
export function useExperienceSearch(args: SearchArgs, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: queryKeys.experienceList('search', args),
    queryFn: ({ pageParam }) => search({ ...args, p_limit: PAGE_SIZE, p_offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.length < PAGE_SIZE ? undefined : pages.reduce((n, p) => n + p.length, 0),
    enabled: options.enabled ?? true,
  })
}

/** Plans within `radiusKm` of the viewer, nearest first. */
export function useNearbyExperiences(origin: Coords | undefined, radiusKm = 10) {
  const args = origin ? { p_lat: origin.lat, p_lng: origin.lng, p_radius_km: radiusKm, p_limit: 10 } : null
  return useQuery({
    queryKey: queryKeys.experienceList('nearby', args),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('nearby_experiences', args as NonNullable<typeof args>)
      if (error) throw error
      return data
    },
    enabled: args != null,
  })
}

export function useExperience(id: string, origin: Coords | undefined) {
  return useQuery({
    queryKey: [...queryKeys.experience(id), origin ?? null],
    queryFn: async (): Promise<ExperienceDetail | null> => {
      const { data, error } = await supabase.rpc('get_experience', {
        p_experience_id: id,
        p_lat: origin?.lat ?? null,
        p_lng: origin?.lng ?? null,
      })
      if (error) throw error
      return data[0] ?? null
    },
    enabled: id.length > 0,
  })
}

export function useParticipants(id: string) {
  return useQuery({
    queryKey: queryKeys.participants(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('experience_participants', { p_experience_id: id })
      if (error) throw error
      return data
    },
    enabled: id.length > 0,
  })
}

// ---------------------------------------------------------------- join / cancel
function useInvalidateExperience() {
  const queryClient = useQueryClient()
  return (id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.experience(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.participants(id) }),
      queryClient.invalidateQueries({ queryKey: ['experiences', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
    ])
}

/** Join through the row-locking RPC (never writes seats directly). */
export function useJoinExperience(id: string) {
  const invalidate = useInvalidateExperience()
  return useMutation({
    mutationFn: async (seats: number) => {
      const { data, error } = await supabase.rpc('join_experience', { p_experience_id: id, p_seats: seats })
      if (error) throw error
      return data
    },
    // Refresh also on failure: "not_enough_seats" means our seat count is stale.
    onSettled: () => invalidate(id),
  })
}

export function useCancelBooking(experienceId: string) {
  const invalidate = useInvalidateExperience()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
      if (error) throw error
      return data
    },
    onSettled: () => invalidate(experienceId),
  })
}

// ---------------------------------------------------------------- favorites
/** Ids of the plans the user saved (one small query shared by every card). */
export function useFavoriteIds() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.favoriteIds(userId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from('favorites').select('experience_id').eq('user_id', userId)
      if (error) throw error
      return data.map((r) => r.experience_id)
    },
    enabled: userId.length > 0,
    staleTime: 5 * 60_000,
  })
}

/** Optimistic heart toggle; rolls back and reports on failure. */
export function useToggleFavorite() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  const key = queryKeys.favoriteIds(userId)

  return useMutation({
    mutationFn: async ({ experienceId, save }: { experienceId: string; save: boolean }) => {
      const { error } = save
        ? await supabase.from('favorites').insert({ user_id: userId, experience_id: experienceId })
        : await supabase.from('favorites').delete().eq('user_id', userId).eq('experience_id', experienceId)
      // 23505 = already saved (double tap on two devices): the end state is what the user wanted.
      if (error && error.code !== '23505') throw error
    },
    onMutate: async ({ experienceId, save }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key)
      queryClient.setQueryData<string[]>(key, (ids = []) =>
        save ? [...new Set([...ids, experienceId])] : ids.filter((id) => id !== experienceId),
      )
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: (_data, _error, { experienceId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: key }),
        queryClient.invalidateQueries({ queryKey: queryKeys.experience(experienceId) }),
      ]),
  })
}

/** Flattens infinite pages, dropping duplicates (a plan can shift pages while new ones are published). */
export function flattenPages(data: InfiniteData<ExperienceCard[]> | undefined): ExperienceCard[] {
  if (!data) return []
  const seen = new Set<string>()
  const out: ExperienceCard[] = []
  for (const page of data.pages) {
    for (const item of page) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        out.push(item)
      }
    }
  }
  return out
}

/** Gallery photos in host-defined order (max 8). */
export function useExperiencePhotos(id: string) {
  return useQuery({
    queryKey: [...queryKeys.experience(id), 'photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experience_photos')
        .select('id, url')
        .eq('experience_id', id)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: id.length > 0,
  })
}

// ---------------------------------------------------------------- "Mis favoritas"
export type FavoritePlan = Omit<ExperienceCard, 'lat' | 'lng'>

const FAVORITE_PLAN_COLUMNS =
  'id, host_id, title, category_id, comuna, starts_at, ends_at, capacity, seats_taken, is_free, price_clp, cover_url, is_featured, rating_avg, rating_count, status'

/**
 * Saved plans that can still be joined (published and not ended), soonest first.
 * Keyed under favoriteIds, so toggling a heart refreshes it.
 */
export function useFavoritePlans() {
  const userId = useUserId()
  return useQuery({
    queryKey: [...queryKeys.favoriteIds(userId), 'plans'],
    queryFn: async (): Promise<FavoritePlan[]> => {
      const { data, error } = await supabase
        .from('favorites')
        .select(`created_at, experience:experiences(${FAVORITE_PLAN_COLUMNS})`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      const now = Date.now()
      return data
        .flatMap((f) => (f.experience ? [f.experience] : []))
        .filter((e) => e.status === 'published' && new Date(e.ends_at).getTime() > now)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
        .map(({ status: _status, ...e }) => ({ ...e, distance_km: null }))
    },
    enabled: userId.length > 0,
  })
}
