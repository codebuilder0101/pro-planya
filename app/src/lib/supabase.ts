import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClientOptions } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

import type { Database } from '@/types/database'

// EXPO_PUBLIC_* values are inlined at build time; they must be read statically.
let supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
let supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const options: SupabaseClientOptions<'public'> = {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}

// Design preview (dev only, src/dev/design-preview.ts): fake data, no network. The `__DEV__ &&` guard
// lets the bundler drop the require (and the fixtures) from release builds.
if (__DEV__ && process.env.EXPO_PUBLIC_DESIGN_PREVIEW === '1') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional dev-only module
  const preview = require('@/dev/design-preview') as typeof import('@/dev/design-preview')
  supabaseUrl = preview.PREVIEW_URL
  supabaseAnonKey = preview.PREVIEW_KEY
  options.global = { fetch: preview.previewFetch }
  options.auth = { ...options.auth, storage: preview.previewStorage, autoRefreshToken: false }
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy app/.env.example to app/.env.',
  )
}

/** The only Supabase client in the app. Uses the anon key; RLS protects all data. */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, options)

// Refresh the session only while the app is in the foreground (Supabase RN guidance).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh()
    else supabase.auth.stopAutoRefresh()
  })
}
