import { useCallback, useEffect, useRef, useState } from 'react'

import {
  clearOAuthRedirectPending,
  clearPostAuthRedirect,
  isOAuthRedirectPending,
  markOAuthRedirectPending,
} from '@/features/auth/utils/authFlow'
import { getAuthProvider } from '@/services/auth'
import { logger } from '@/utils/logger'
import { addBreadcrumb, captureError } from '@/utils/sentry'

interface AuthSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: AuthUser
}

interface AuthUser {
  id: string
  email?: string
  email_confirmed_at?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export type AuthStatus =
  | 'initializing'
  | 'callback_processing'
  | 'authenticated'
  | 'unauthenticated'
  | 'auth_error'

interface UseSessionManagementResult {
  session: AuthSession | null
  user: AuthUser | null
  loading: boolean
  authStatus: AuthStatus
  authError: string | null
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
  clearAuthError: () => void
}

const AUTH_KEYS = [
  'activeTenantId',
  'pendingInviteToken',
  'pendingJoinCode',
  'pendingInviteRetryCount',
]

/**
 * Hook untuk mengelola session.
 * Mendengarkan perubahan auth state (login, logout, token refresh).
 */
export function useSessionManagement(): UseSessionManagementResult {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    window.location.pathname === '/auth/callback' ? 'callback_processing' : 'initializing'
  )
  const [sessionExpired, setSessionExpired] = useState(false)
  const wasAuthenticatedRef = useRef(false)
  const clearAuthError = useCallback(() => setAuthError(null), [])

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
    setAuthError(null)
    setAuthStatus('unauthenticated')
    clearPostAuthRedirect()
    clearOAuthRedirectPending()

    try {
      await getAuthProvider().signOut()
    } catch (err) {
      captureError(err, { context: 'AuthContext.signOut' })
      if (import.meta.env.DEV) {
        logger.error('[Auth] signOut error (state already cleared):', err)
      }
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setSessionExpired(false)
    setAuthError(null)
    const { error } = await getAuthProvider().signInWithPassword({ email, password })
    if (error) {
      setAuthError(error.message)
      setAuthStatus('auth_error')
    }
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
      setAuthError(null)
      const { error } = await getAuthProvider().signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            first_name: firstName,
            last_name: lastName,
            ...(signUpTenantId ? { tenant_id: signUpTenantId } : {}),
          },
        },
      })
      if (error) {
        setAuthError(error.message)
        setAuthStatus('auth_error')
      }
      return { error: error as Error | null }
    },
    []
  )

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null)
    setAuthStatus('callback_processing')
    markOAuthRedirectPending()
    addBreadcrumb('OAuth redirect started', 'auth', { provider: 'google' })
    try {
      await getAuthProvider().signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    } catch (error) {
      clearOAuthRedirectPending()
      captureError(error, { context: 'AuthContext.signInWithGoogle' })
      setAuthError(error instanceof Error ? error.message : 'Gagal memulai login Google.')
      setAuthStatus('auth_error')
      throw error
    }
  }, [])

  useEffect(() => {
    getAuthProvider()
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          wasAuthenticatedRef.current = true
          addBreadcrumb('Session restored', 'auth', { userId: s.user.id })
          clearOAuthRedirectPending()
          setAuthStatus('authenticated')
        } else if (window.location.pathname === '/auth/callback' || isOAuthRedirectPending()) {
          setAuthStatus('callback_processing')
        } else {
          setAuthStatus('unauthenticated')
        }
        setLoading(false)
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          logger.error('[Auth] getSession failed:', err)
        }
        setAuthError(err instanceof Error ? err.message : 'Gagal memulihkan sesi login.')
        setAuthStatus('auth_error')
        setLoading(false)
      })

    const {
      data: { subscription },
    } = getAuthProvider().onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        wasAuthenticatedRef.current = true
        addBreadcrumb(`Auth state changed: ${_event}`, 'auth', { userId: s.user.id })
        clearOAuthRedirectPending()
        setAuthError(null)
        setAuthStatus('authenticated')
      } else {
        if (wasAuthenticatedRef.current && _event === 'SIGNED_OUT') {
          setSessionExpired(true)
        }
        wasAuthenticatedRef.current = false
        if (_event === 'SIGNED_OUT') {
          setAuthStatus('unauthenticated')
        } else if (window.location.pathname === '/auth/callback' || isOAuthRedirectPending()) {
          setAuthStatus('callback_processing')
        } else {
          setAuthStatus('unauthenticated')
        }
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
      const currentSession = (await getAuthProvider().getSession()).data.session
      if (!currentSession) return

      const expiresAt = currentSession.expires_at
      if (!expiresAt) return

      const nowS = Math.floor(Date.now() / 1000)
      const remainingS = expiresAt - nowS

      if (remainingS <= REFRESH_THRESHOLD_S) {
        if (import.meta.env.DEV) {
          logger.warn(`[Auth] Token expires in ${remainingS}s, refreshing...`)
        }

        try {
          const { error } = await getAuthProvider().refreshSession()
          if (error) {
            if (import.meta.env.DEV) {
              logger.error('[Auth] Proactive token refresh failed:', error)
            }
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
        } catch (err) {
          if (import.meta.env.DEV) {
            logger.error('[Auth] Proactive token refresh exception:', err)
          }
          captureError(err, { context: 'proactiveTokenRefreshException' })
          addBreadcrumb('Proactive token refresh exception — signing out', 'auth', {
            error: err instanceof Error ? err.message : 'Unknown error',
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
  }, [session, signOut])

  return {
    session,
    user,
    loading,
    authStatus,
    authError,
    sessionExpired,
    signOut,
    signIn,
    signUp,
    signInWithGoogle,
    clearAuthError,
  }
}
