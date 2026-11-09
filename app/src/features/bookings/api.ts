import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useUserId } from '@/features/profile/api'
import { queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { MyBooking } from './split'

export { splitBookings, type MyBooking } from './split'

/** Upper bound for one user's active bookings; plenty for the MVP. */
const MAX_BOOKINGS = 200

/** The user's confirmed bookings with their plan (RLS: own bookings only). */
export function useMyBookings() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.myBookings(userId),
    queryFn: async (): Promise<MyBooking[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select(
          'id, seats, created_at, experience:experiences(id, title, category_id, comuna, starts_at, ends_at, cover_url, status, is_free, price_clp, host_id)',
        )
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false })
        .limit(MAX_BOOKINGS)
      if (error) throw error
      // A plan removed by moderation is no longer readable: its booking has no plan.
      return data.flatMap((b) =>
        b.experience ? [{ id: b.id, seats: b.seats, createdAt: b.created_at, experience: b.experience }] : [],
      )
    },
    enabled: userId !== '',
  })
}

/** Cancelling from the list (the detail screen uses useCancelBooking). */
export function useCancelMyBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.rpc('cancel_booking', { p_booking_id: bookingId })
      if (error) throw error
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.experiences }),
      ]),
  })
}
