import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { randomUUID } from 'expo-crypto'

import { useUserId } from '@/features/profile/api'
import { logUnexpected } from '@/lib/errors'
import { compressImage, uploadImage, type UploadedImage } from '@/lib/images'
import { queryKeys } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

import { toExperienceFields, type FormPhoto, type PlanFormOutput } from './plan-form'

export type MyExperience = Database['public']['Functions']['list_my_experiences']['Returns'][number]
type Status = Database['public']['Enums']['experience_status']

const BUCKET = 'experience-photos'

/** The host's own plans (any status): upcoming first, then past. */
export function useMyExperiences() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.myExperiences(userId ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_my_experiences', { p_limit: 100 })
      if (error) throw error
      return data
    },
    enabled: userId != null,
  })
}

/** Photos with their storage path (the edit form needs it to delete removed files). */
export function usePlanPhotosForEdit(experienceId: string | undefined) {
  return useQuery({
    queryKey: ['experiences', 'detail', experienceId ?? '', 'photos-edit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('experience_photos')
        .select('id, url, storage_path, sort_order')
        .eq('experience_id', experienceId ?? '')
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: experienceId != null,
    // Always start the edit form from fresh data.
    staleTime: 0,
  })
}

function removeFiles(paths: string[]) {
  if (paths.length === 0) return
  // Best effort: orphaned files are harmless and can be cleaned up later.
  supabase.storage
    .from(BUCKET)
    .remove(paths)
    .then(({ error }) => {
      if (error) logUnexpected(error)
    })
    .catch(logUnexpected)
}

async function uploadNewPhotos(hostId: string, experienceId: string, photos: FormPhoto[]) {
  const uploaded = new Map<string, UploadedImage>()
  try {
    for (const photo of photos) {
      if (photo.existingId) continue
      const compressed = await compressImage({
        uri: photo.uri,
        width: photo.width ?? 0,
        height: photo.height ?? 0,
      })
      uploaded.set(photo.key, await uploadImage(BUCKET, `${hostId}/${experienceId}`, compressed))
    }
  } catch (error) {
    removeFiles([...uploaded.values()].map((u) => u.path))
    throw error
  }
  return uploaded
}

type SaveInput = { values: PlanFormOutput; experienceId?: string; originalPhotos?: FormPhoto[] }

/**
 * Publishes a new plan or saves an edited one.
 * New plan: photos are uploaded first, the plan is created hidden, photo rows are added, then it is
 * published, so nobody ever sees a plan without its photos. If anything fails, uploaded files are
 * removed and a half-created plan stays hidden in "Mis planes".
 */
export function useSavePlan() {
  const userId = useUserId()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, experienceId, originalPhotos = [] }: SaveInput): Promise<string> => {
      if (!userId) throw new Error('not_authenticated')
      const fields = toExperienceFields(values)
      const isNew = experienceId == null
      const id = experienceId ?? randomUUID()

      const uploaded = await uploadNewPhotos(userId, id, values.photos)
      const newRows = values.photos.flatMap((p, sortOrder) => {
        const file = uploaded.get(p.key)
        return file
          ? [{ experience_id: id, url: file.publicUrl, storage_path: file.path, sort_order: sortOrder }]
          : []
      })

      try {
        if (isNew) {
          const { error } = await supabase
            .from('experiences')
            .insert({ ...fields, id, host_id: userId, status: 'hidden' })
          if (error) throw error
        } else {
          const { error } = await supabase.from('experiences').update(fields).eq('id', id)
          if (error) throw error

          // Removed photos first (the database allows at most 8 per plan).
          const keptIds = new Set(values.photos.flatMap((p) => (p.existingId ? [p.existingId] : [])))
          const removed = originalPhotos.filter((p) => p.existingId && !keptIds.has(p.existingId))
          if (removed.length > 0) {
            const { error: deleteError } = await supabase
              .from('experience_photos')
              .delete()
              .in(
                'id',
                removed.map((p) => p.existingId as string),
              )
            if (deleteError) throw deleteError
            removeFiles(removed.flatMap((p) => (p.storagePath ? [p.storagePath] : [])))
          }
          // Keep the order chosen in the form (the first photo is the cover).
          for (const [sortOrder, p] of values.photos.entries()) {
            if (!p.existingId) continue
            const original = originalPhotos.findIndex((o) => o.existingId === p.existingId)
            if (original === sortOrder) continue
            const { error: orderError } = await supabase
              .from('experience_photos')
              .update({ sort_order: sortOrder })
              .eq('id', p.existingId)
            if (orderError) throw orderError
          }
        }

        if (newRows.length > 0) {
          const { error } = await supabase.from('experience_photos').insert(newRows)
          if (error) throw error
        }
      } catch (error) {
        removeFiles(newRows.map((r) => r.storage_path))
        throw error
      }

      if (isNew) {
        const { error } = await supabase.from('experiences').update({ status: 'published' }).eq('id', id)
        if (error) throw error
      }
      return id
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.experiences }),
  })
}

/** Hide, show again or cancel a plan (cancelling is final). */
export function useSetPlanStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string
      status: Extract<Status, 'published' | 'hidden' | 'cancelled'>
    }) => {
      const { error } = await supabase.from('experiences').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.experiences }),
  })
}
