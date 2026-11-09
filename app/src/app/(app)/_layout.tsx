import { router, Stack } from 'expo-router'
import { useEffect } from 'react'

import { useAuth } from '@/features/auth/auth-provider'
import { useMyProfile } from '@/features/profile/api'
import { colors, shape } from '@/theme/tokens'

export default function AppLayout() {
  return (
    <>
      <SessionGuards />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.textPrimary },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ title: 'Editar perfil' }} />
        <Stack.Screen name="experience/[id]/index" options={{ headerShown: false }} />
        <Stack.Screen name="plan/new" options={{ title: 'Publicar plan' }} />
        <Stack.Screen name="plan/[id]/edit" options={{ title: 'Editar plan' }} />
        {/* Bottom sheets (native form sheets): join and filters. */}
        <Stack.Screen
          name="experience/[id]/join"
          options={{
            headerShown: false,
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: shape.sheet,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="explore-filters"
          options={{
            headerShown: false,
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85],
            sheetGrabberVisible: true,
            sheetCornerRadius: shape.sheet,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
    </>
  )
}

/**
 * - Signs out suspended users (the database also rejects all their writes).
 * - Opens profile onboarding once, right after sign-up.
 */
function SessionGuards() {
  const { signOut, setNotice, justSignedUp, consumeJustSignedUp } = useAuth()
  const profile = useMyProfile()
  const isSuspended = profile.data?.is_suspended === true
  // PGRST116: no profile row (account deleted) -> the session is useless.
  const profileMissing = (profile.error as { code?: string } | null)?.code === 'PGRST116'

  useEffect(() => {
    if (isSuspended) {
      setNotice('Tu cuenta está suspendida. Escríbenos si crees que es un error.')
      signOut().catch(() => undefined)
    } else if (profileMissing) {
      signOut().catch(() => undefined)
    }
  }, [isSuspended, profileMissing, setNotice, signOut])

  useEffect(() => {
    if (justSignedUp && profile.data) {
      consumeJustSignedUp()
      router.push({ pathname: '/profile/edit', params: { onboarding: '1' } })
    }
  }, [justSignedUp, profile.data, consumeJustSignedUp])

  return null
}
