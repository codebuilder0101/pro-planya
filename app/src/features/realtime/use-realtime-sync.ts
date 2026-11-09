import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppState } from 'react-native'

import { upsertMessage, type Message } from '@/features/chat/api'
import { useUserId } from '@/features/profile/api'
import { queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'

const IS_DESIGN_PREVIEW = __DEV__ && process.env.EXPO_PUBLIC_DESIGN_PREVIEW === '1'

/**
 * Live updates for the signed-in user (Supabase Realtime respects RLS, so each
 * user only receives rows they can read):
 *   - messages:    new chat messages appear without refreshing
 *   - experiences: published / edited plans and seat counts refresh on every phone
 *   - bookings:    the booker's and host's lists refresh
 * A plan that becomes hidden is no longer readable, so Realtime cannot announce it;
 * a light periodic refresh of the visible lists covers that case.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const userId = useUserId()

  useEffect(() => {
    if (!userId || IS_DESIGN_PREVIEW) return

    let timer: ReturnType<typeof setTimeout> | null = null
    // Coalesce bursts (a booking updates the plan and the booking at once).
    const refreshPlans = () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = null
        queryClient.invalidateQueries({ queryKey: queryKeys.experiences })
        queryClient.invalidateQueries({ queryKey: ['bookings'] })
      }, 400)
    }

    const channel = supabase
      .channel(`sync:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        upsertMessage(queryClient, payload.new as Message)
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations(userId) })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'experiences' }, refreshPlans)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refreshPlans)
      .subscribe()

    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        queryClient.invalidateQueries({ queryKey: queryKeys.experiences })
      }
    }, 45_000)

    return () => {
      if (timer) clearTimeout(timer)
      clearInterval(interval)
      supabase.removeChannel(channel).catch(() => undefined)
    }
  }, [queryClient, userId])
}
