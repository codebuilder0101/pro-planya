import { router } from 'expo-router'
import { useState } from 'react'

import { EmptyState } from '@/components/ui/empty-state'
import { Screen } from '@/components/ui/screen'
import { Skeleton } from '@/components/ui/skeleton'
import { PlanFormView } from '@/features/host/components/plan-form-view'
import { emptyPlanValues } from '@/features/host/plan-form'
import { useMyProfile } from '@/features/profile/api'
import { COMUNAS } from '@/lib/location'

export default function NewPlanScreen() {
  const profile = useMyProfile()
  const city = profile.data?.city ?? ''
  const [initial] = useState(() => emptyPlanValues(''))

  if (profile.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Skeleton height={320} />
      </Screen>
    )
  }
  const role = profile.data?.role
  if (role !== 'host' && role !== 'admin') {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="megaphone-outline"
          title="Publicar es para anfitriones"
          description="Tu cuenta es de explorador. Para publicar planes necesitas una cuenta de anfitrión."
        />
      </Screen>
    )
  }

  const comuna = (COMUNAS as readonly string[]).includes(city) ? city : ''
  return (
    <PlanFormView
      initialValues={{ ...initial, comuna }}
      onSaved={(id) => router.replace({ pathname: '/experience/[id]', params: { id, published: '1' } })}
    />
  )
}
