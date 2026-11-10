import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { compressImage, storagePathFromPublicUrl, uploadImage, type PickedImage } from '@/lib/images'
import { logUnexpected } from '@/lib/errors'
import { queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesUpdate } from '@/types/database'

import { useAuth } from '../auth/auth-provider'

/**
 * The signed-in user id, or '' for the brief moment after sign-out before the route
 * guard unmounts signed-in screens. Never throw during render.
 */
export function useUserId(): string {
  return useAuth().user?.id ?? ''
}

function requireUserId(userId: string): string {
  if (!userId) throw Object.assign(new Error('not_authenticated'), { code: 'P0001' })
  return userId
}

export type Profile = Tables<'profiles'>

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}

export function useMyProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => fetchProfile(userId),
    enabled: userId !== '',
  })
}

type EditableProfile = Pick<TablesUpdate<'profiles'>, 'full_name' | 'bio' | 'city' | 'interests'>

export function useUpdateProfile() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: EditableProfile) => {
      const id = requireUserId(userId)
      const { data, error } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile(profile.id), profile),
  })
}

/** Compresses + uploads a new avatar, saves it on the profile and removes the old file. */
export function useUploadAvatar() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (image: PickedImage) => {
      const id = requireUserId(userId)
      const previous = queryClient.getQueryData<Profile>(queryKeys.profile(id))?.avatar_url ?? null
      const compressed = await compressImage(image)
      const uploaded = await uploadImage('avatars', id, compressed)
      const { data, error } = await supabase
        .from('profiles')
        .update({ avatar_url: uploaded.publicUrl })
        .eq('id', id)
        .select('*')
        .single()
      if (error) {
        await supabase.storage.from('avatars').remove([uploaded.path])
        throw error
      }
      const oldPath = storagePathFromPublicUrl('avatars', previous)
      if (oldPath) {
        // Best effort: an orphaned old avatar is harmless.
        supabase.storage
          .from('avatars')
          .remove([oldPath])
          .then(({ error: removeError }) => {
            if (removeError) logUnexpected(removeError)
          })
          .catch(logUnexpected)
      }
      return data
    },
    onSuccess: (profile) => queryClient.setQueryData(queryKeys.profile(profile.id), profile),
  })
}

/** "Quiero ser anfitrión": explorer -> host (the database only allows this one change). */
export function useBecomeHost() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('become_host')
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
  })
}

/** How the role reads on the profile (a host account can also explore). */
export const ROLE_LABEL = {
  explorer: 'Explorador',
  host: 'Explorador y anfitrión',
  admin: 'Administrador',
} as const
