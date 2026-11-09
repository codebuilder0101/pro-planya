import { useQuery } from '@tanstack/react-query'

import type { Coords } from '@/lib/location'
import { queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Place = Database['public']['Functions']['list_places']['Returns'][number]

/** Recommended places (admin-curated), nearest first when we know where the viewer is. */
export function usePlaces(origin: Coords | undefined, limit = 10) {
  const args = { p_lat: origin?.lat ?? null, p_lng: origin?.lng ?? null, p_limit: limit }
  return useQuery({
    queryKey: queryKeys.places(args),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_places', args)
      if (error) throw error
      return data
    },
    staleTime: 10 * 60_000,
  })
}
