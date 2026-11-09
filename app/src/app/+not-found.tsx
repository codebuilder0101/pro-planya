import { Redirect, router } from 'expo-router'

import { EmptyState } from '@/components/ui/empty-state'
import { Screen } from '@/components/ui/screen'
import { useAuth } from '@/features/auth/auth-provider'

/**
 * Signed-out users land on routes that only exist for signed-in users (the app
 * opens at "/", which is Home). Send them to sign-in instead of an error page.
 */
export default function NotFound() {
  const { isSignedIn } = useAuth()

  if (!isSignedIn) return <Redirect href="/sign-in" />

  return (
    <Screen>
      <EmptyState
        icon="compass-outline"
        title="No encontramos esta página"
        description="Puede que el enlace esté mal o que el plan ya no exista."
        actionLabel="Ir al inicio"
        onAction={() => router.replace('/')}
      />
    </Screen>
  )
}
