import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderRouter } from 'expo-router/testing-library'
import { act, fireEvent, waitFor } from '@testing-library/react-native'
import type { ReactNode } from 'react'

import SignInScreen from '@/app/(auth)/sign-in'

import { AuthProvider } from './auth-provider'

const mockSignIn = jest.fn()
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: (event: string, session: null) => void) => {
        cb('INITIAL_SESSION', null)
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      },
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
    },
  },
}))

function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

async function renderSignIn() {
  return renderRouter(
    {
      index: () => (
        <Providers>
          <SignInScreen />
        </Providers>
      ),
    },
    { initialUrl: '/' },
  )
}

describe('Sign-in screen', () => {
  let current: Awaited<ReturnType<typeof renderSignIn>> | null = null
  beforeEach(() => mockSignIn.mockReset())
  afterEach(async () => {
    // Flush pending form updates, then unmount so the next render starts clean.
    await act(async () => {})
    current?.unmount()
    current = null
  })

  it('shows Spanish validation errors and does not call Supabase', async () => {
    const screen = (current = await renderSignIn())
    await act(async () => {
      fireEvent.press(screen.getByTestId('sign-in-submit'))
    })
    expect(await screen.findByText('Ingresa tu correo.')).toBeTruthy()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeTruthy()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('signs in with a normalised email and shows a friendly error on bad credentials', async () => {
    mockSignIn.mockResolvedValue({
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    })
    const screen = (current = await renderSignIn())
    fireEvent.changeText(screen.getByTestId('sign-in-email'), '  Ana@Correo.CL ')
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'clave1234')
    await act(async () => {
      fireEvent.press(screen.getByTestId('sign-in-submit'))
    })
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith({ email: 'ana@correo.cl', password: 'clave1234' }),
    )
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy()
  })
})
