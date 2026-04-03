import type { Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '@/services/supabase/client'
import { addBreadcrumb, captureError } from '@/utils/sentry'

interface UseSessionManagementResult {
  session: Session | null
  user: User | null
  loading: boolean
  sessionExpired: boolean
  signOut: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    tenantId?: string
  ) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<void>
}

const AUTH_KEYS = [
  'activeTenantId',
  'pendingInviteToken',
  'pendingJoinCode',
  'pendingInviteRetryCount',
]

/**
 * Hook untuk mengelola Supabase session.
 * Mendengarkan perubahan auth state (login, logout, token refresh).
 */
export function useSessionManagement(): UseSessionManagementResult {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const wasAuthenticatedRef = useRef(false)

  const signOut = useCallback(async () => {
    addBreadcrumb('User signing out', 'auth')
    const { clearSentryUser } = await import('@/utils/sentry')
    clearSentryUser()

    AUTH_KEYS.forEach((key) => localStorage.removeItem(key))
    Object.keys(localStorage)
      .filter((k) => k.startsWith('ai_tutor_session_'))
      .forEach((k) => localStorage.removeItem(k))

    setUser(null)
    setSession(null)

    try {
      await supabase.auth.signOut()
    } catch (err) {
      captureError(err, { context: 'AuthContext.signOut' })
      if (import.meta.env.DEV) console.error('[Auth] signOut error (state already cleared):', err)
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setSessionExpired(false)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      signUpTenantId?: string
    ) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            ...(signUpTenantId ? { tenant_id: signUpTenantId } : {}),
          },
        },
      })
      return { error: error as Error | null }
    },
    []
  )

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/#/auth/callback`,
      },
    })
  }, [])

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          wasAuthenticatedRef.current = true
          addBreadcrumb('Session restored', 'auth', { userId: s.user.id })
        }
        setLoading(false)
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.error('[Auth] getSession failed:', err)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        wasAuthenticatedRef.current = true
        addBreadcrumb(`Auth state changed: ${_event}`, 'auth', { userId: s.user.id })
      } else {
        if (wasAuthenticatedRef.current && _event === 'SIGNED_OUT') {
          setSessionExpired(true)
        }
        wasAuthenticatedRef.current = false
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return

    const INTERVAL_MS = 60_000
    const REFRESH_THRESHOLD_S = 5 * 60

    const checkAndRefresh = async () => {
      const currentSession = (await supabase.auth.getSession()).data.session
      if (!currentSession) return

      const expiresAt = currentSession.expires_at
      if (!expiresAt) return

      const nowS = Math.floor(Date.now() / 1000)
      const remainingS = expiresAt - nowS

      if (remainingS <= REFRESH_THRESHOLD_S) {
        if (import.meta.env.DEV)
          console.info(`[Auth] Token expires in ${remainingS}s, refreshing...`)

        const { error } = await supabase.auth.refreshSession()
        if (error) {
          console.error('[Auth] Proactive token refresh failed:', error)
          captureError(error, { context: 'proactiveTokenRefresh' })
          addBreadcrumb('Proactive token refresh failed — signing out', 'auth', {
            error: error.message,
          })
          const { useToast } = await import('@/hooks/useToast')
          useToast.getState().addToast({
            type: 'error',
            message: 'Sesi Anda telah berakhir',
            description: 'Silakan masuk kembali untuk melanjutkan.',
          })
          setSessionExpired(true)
          await signOut()
        }
      }
    }

    const interval = setInterval(checkAndRefresh, INTERVAL_MS)
    return () => clearInterval(interval)
  }, [session?.access_token, signOut])

  return { session, user, loading, sessionExpired, signOut, signIn, signUp, signInWithGoogle }
}
