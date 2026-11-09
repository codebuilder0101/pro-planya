import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { supabase } from '@/lib/supabase'
import type { SignUpValues } from '@/lib/validation'

type SignUpResult = { needsEmailConfirmation: boolean }

type AuthContextValue = {
  session: Session | null
  user: User | null
  /** True until the persisted session has been restored on launch. */
  isLoading: boolean
  /** Signed in and not in the middle of a password reset. Drives the route guards. */
  isSignedIn: boolean
  /** Set right after a sign-up that produced a session; used to show profile onboarding once. */
  justSignedUp: boolean
  consumeJustSignedUp: () => void
  /** One-off message for the sign-in screen (e.g. account suspended). */
  notice: string | null
  setNotice: (notice: string | null) => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (values: {
    fullName: string
    email: string
    password: string
    role: SignUpValues['role']
  }) => Promise<SignUpResult>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  completePasswordReset: (email: string, code: string, newPassword: string) => Promise<void>
  abandonPasswordReset: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRecovering, setIsRecovering] = useState(false)
  const [justSignedUp, setJustSignedUp] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  // Email whose recovery code was already verified (a session exists, password not yet changed).
  const verifiedRecoveryEmail = useRef<string | null>(null)

  useEffect(() => {
    // INITIAL_SESSION fires first with the restored session (or null).
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      setIsLoading(false)
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        setJustSignedUp(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setNotice(null)
  }, [])

  const signUp = useCallback<AuthContextValue['signUp']>(async ({ fullName, email, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) throw error
    if (data.session) {
      setJustSignedUp(true)
      return { needsEmailConfirmation: false }
    }
    return { needsEmailConfirmation: true }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    // Even if the server call fails (offline), the local session is cleared.
    if (error) setSession(null)
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }, [])

  const completePasswordReset = useCallback(async (email: string, code: string, newPassword: string) => {
    setIsRecovering(true)
    try {
      if (verifiedRecoveryEmail.current !== email) {
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
        if (error) throw error
        verifiedRecoveryEmail.current = email
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      verifiedRecoveryEmail.current = null
      setNotice(null)
      setIsRecovering(false) // now signed in with the new password
    } catch (error) {
      // If the code was never verified there is no session: leave recovery mode.
      if (verifiedRecoveryEmail.current === null) setIsRecovering(false)
      throw error
    }
  }, [])

  const abandonPasswordReset = useCallback(async () => {
    if (verifiedRecoveryEmail.current !== null) {
      verifiedRecoveryEmail.current = null
      await supabase.auth.signOut()
    }
    setIsRecovering(false)
  }, [])

  const consumeJustSignedUp = useCallback(() => setJustSignedUp(false), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isSignedIn: Boolean(session) && !isRecovering,
      justSignedUp,
      consumeJustSignedUp,
      notice,
      setNotice,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      completePasswordReset,
      abandonPasswordReset,
    }),
    [
      session,
      isLoading,
      isRecovering,
      justSignedUp,
      consumeJustSignedUp,
      notice,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      completePasswordReset,
      abandonPasswordReset,
    ],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
