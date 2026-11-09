import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

import { dbErrorCode, logUnexpected } from './errors'

export const PAGE_SIZE = 20

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      // Business errors (P0001) are final; retry only transient failures.
      retry: (failureCount, error) => dbErrorCode(error) === null && failureCount < 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
      onError: (error) => {
        if (dbErrorCode(error) === null) logUnexpected(error)
      },
    },
  },
})

// React Native has no window focus: refetch stale queries when the app returns to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active')
  })
}

// Assume online; fetch errors surface as friendly "Sin conexión" messages.
onlineManager.setOnline(true)

/** Centralised query keys so invalidation stays consistent. */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  categories: ['categories'] as const,
  viewerLocation: (city: string) => ['viewer-location', city] as const,
  weather: (cell: string) => ['weather', cell] as const,
  experiences: ['experiences'] as const,
  experienceList: (name: string, args: unknown) => ['experiences', 'list', name, args] as const,
  experience: (id: string) => ['experiences', 'detail', id] as const,
  participants: (id: string) => ['experiences', 'participants', id] as const,
  favoriteIds: (userId: string) => ['favorites', userId] as const,
  places: (args: unknown) => ['places', args] as const,
  /** Host "Mis planes" (under 'experiences' so any plan change refreshes it). */
  myExperiences: (userId: string) => ['experiences', 'mine', userId] as const,
  conversations: (userId: string) => ['conversations', 'list', userId] as const,
  conversation: (id: string) => ['conversations', 'detail', id] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
}
