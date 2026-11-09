import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter'
import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { AuthProvider, useAuth } from '@/features/auth/auth-provider'
import { queryClient } from '@/lib/query-client'
import { colors } from '@/theme/tokens'

SplashScreen.preventAutoHideAsync().catch(() => undefined)

// Inter is needed on Android (and web previews); iOS uses the system font (SF Pro).
const FONTS =
  Platform.OS !== 'ios' ? { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } : {}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS)

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator fontsReady={fontsLoaded || fontError != null} />
          </AuthProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { isLoading, isSignedIn } = useAuth()
  const ready = fontsReady && !isLoading

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined)
  }, [ready])

  // Keep the native splash screen until the session is restored.
  if (!ready) return null

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
})
