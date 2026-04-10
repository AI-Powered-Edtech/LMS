import type { AuthBootstrap, AuthProvider, AuthSession } from './types'

const NOT_IMPLEMENTED_ERROR = {
  message: 'VilAuthProvider: Not implemented',
  name: 'NotImplemented',
  status: 501,
}

const SESSION_STORAGE_KEY = 'vil_auth_session'

function readSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function createVilAuthProvider(_baseUrl = 'http://localhost:8080'): AuthProvider {
  return {
    getSession: async () => ({ data: { session: readSession() }, error: null }),
    getUser: async () => ({ data: { user: null }, error: NOT_IMPLEMENTED_ERROR }),
    getAuthBootstrap: async () => {
      try {
        const token = readSession()?.access_token
        if (!token) return { data: null, error: { message: 'Not authenticated' } }

        const res = await fetch(`${_baseUrl}/api/v1/auth/bootstrap`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          return {
            data: null,
            error: { message: `HTTP ${res.status}`, status: res.status },
          }
        }

        const data = (await res.json()) as AuthBootstrap
        return { data, error: null }
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : String(error) },
        }
      }
    },
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({
      data: { session: null, user: null },
      error: NOT_IMPLEMENTED_ERROR,
    }),
    signUp: async () => ({ data: { session: null, user: null }, error: NOT_IMPLEMENTED_ERROR }),
    signInWithOAuth: async () => ({ error: NOT_IMPLEMENTED_ERROR }),
    signOut: async () => ({ error: NOT_IMPLEMENTED_ERROR }),
    refreshSession: async () => ({ data: { session: null }, error: NOT_IMPLEMENTED_ERROR }),
    exchangeCodeForSession: async () => ({
      data: { session: null, user: null },
      error: NOT_IMPLEMENTED_ERROR,
    }),
    verifyOtp: async () => ({ error: NOT_IMPLEMENTED_ERROR }),
    resend: async () => ({ error: NOT_IMPLEMENTED_ERROR }),
    resetPasswordForEmail: async () => ({ error: NOT_IMPLEMENTED_ERROR }),
    updateUser: async () => ({ data: { user: null }, error: NOT_IMPLEMENTED_ERROR }),
    mfa: {
      enroll: async () => ({
        data: { id: '', totp: { qr_code: '', secret: '' } },
        error: NOT_IMPLEMENTED_ERROR,
      }),
      challenge: async () => ({ data: { id: '', expires_at: 0 }, error: NOT_IMPLEMENTED_ERROR }),
      verify: async () => ({ data: { valid: false }, error: NOT_IMPLEMENTED_ERROR }),
      challengeAndVerify: async () => ({ data: { valid: false }, error: NOT_IMPLEMENTED_ERROR }),
      unenroll: async () => ({ error: NOT_IMPLEMENTED_ERROR }),
      listFactors: async () => ({ data: { all: [] }, error: NOT_IMPLEMENTED_ERROR }),
      getAuthenticatorAssuranceLevel: async () => ({ data: null, error: NOT_IMPLEMENTED_ERROR }),
    },
  }
}
