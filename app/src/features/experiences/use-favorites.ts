import { useMemo } from 'react'
import { Alert } from 'react-native'

import { toUserMessage } from '@/lib/errors'

import { useFavoriteIds, useToggleFavorite } from './api'

/** Saved-plan ids as a Set + an optimistic toggle that explains failures in Spanish. */
export function useFavorites() {
  const ids = useFavoriteIds()
  const toggle = useToggleFavorite()
  const set = useMemo(() => new Set(ids.data ?? []), [ids.data])

  const setSaved = (experienceId: string, save: boolean) => {
    toggle.mutate(
      { experienceId, save },
      { onError: (error) => Alert.alert('No pudimos guardar el plan', toUserMessage(error)) },
    )
  }

  return { ids: set, setSaved }
}
