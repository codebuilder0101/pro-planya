import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'

import { EmptyState } from '@/components/ui/empty-state'
import { Screen } from '@/components/ui/screen'
import { Skeleton } from '@/components/ui/skeleton'
import { useExperience } from '@/features/experiences/api'
import { usePlanPhotosForEdit } from '@/features/host/api'
import { PlanFormView } from '@/features/host/components/plan-form-view'
import { planValuesFrom } from '@/features/host/plan-form'
import { useUserId } from '@/features/profile/api'

function leave() {
  if (router.canGoBack()) router.back()
  else router.replace('/publish')
}

export default function EditPlanScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>()
  const userId = useUserId()
  const experience = useExperience(id, undefined)
  const photos = usePlanPhotosForEdit(id || undefined)
  // Read the clock once per mount (render must stay pure).
  const [mountedAt] = useState(() => Date.now())

  if (experience.isPending || photos.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={140} />
        <Skeleton height={320} />
      </Screen>
    )
  }
  if (experience.isError || photos.isError) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="cloud-offline-outline"
          title="No pudimos cargar el plan"
          actionLabel="Reintentar"
          onAction={() => {
            void experience.refetch()
            void photos.refetch()
          }}
        />
      </Screen>
    )
  }

  const e = experience.data
  const editable =
    e != null &&
    e.host_id === userId &&
    (e.status === 'published' || e.status === 'hidden') &&
    new Date(e.ends_at).getTime() > mountedAt
  if (!e || !editable) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="lock-closed-outline"
          title="Este plan no se puede editar"
          description="Solo puedes editar tus planes publicados u ocultos que aún no terminan."
          actionLabel="Volver"
          onAction={leave}
        />
      </Screen>
    )
  }

  return (
    <PlanFormView
      initialValues={planValuesFrom(e, photos.data)}
      experienceId={e.id}
      originalStartsAt={e.starts_at}
      seatsTaken={e.seats_taken}
      onSaved={leave}
    />
  )
}
