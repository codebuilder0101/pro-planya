import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useUserId } from '@/features/profile/api'
import { queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'

export const MAX_REVIEW_COMMENT = 1000

/** Labels for 1..5 stars. */
export const RATING_LABELS = ['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'] as const

export type Review = {
  id: string
  rating: number
  comment: string
  createdAt: string
  author: { fullName: string; avatarUrl: string | null }
}

/** Ratings the user already gave, keyed by plan id. */
export function useMyReviews() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.myReviews(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('experience_id, rating')
        .eq('author_id', userId)
      if (error) throw error
      return new Map(data.map((r) => [r.experience_id, r.rating]))
    },
    enabled: userId !== '',
  })
}

/** Latest reviews of a plan, newest first. */
export function useExperienceReviews(experienceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.reviews(experienceId),
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          'id, rating, comment, created_at, author:profiles!reviews_author_id_fkey(full_name, avatar_url)',
        )
        .eq('experience_id', experienceId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
        author: { fullName: r.author?.full_name ?? '', avatarUrl: r.author?.avatar_url ?? null },
      }))
    },
    enabled: enabled && experienceId !== '',
  })
}

/** Rates a plan once (the database checks the booking and that the plan ended). */
export function useCreateReview() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { experienceId: string; rating: number; comment: string }) => {
      const { error } = await supabase.from('reviews').insert({
        experience_id: input.experienceId,
        author_id: userId,
        rating: input.rating,
        comment: input.comment.trim(),
      })
      if (error) throw error
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.experiences }),
        queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      ]),
  })
}
