import type { AuthProvider } from './types'

const NOT_IMPLEMENTED_ERROR = {
  message: 'VilAuthProvider: Not implemented',
  name: 'NotImplemented',
  status: 501,
}

export function createVilAuthProvider(_baseUrl?: string): AuthProvider {
  return {
    getSession: async () => ({ data: { session: null }, error: NOT_IMPLEMENTED_ERROR }),
    getUser: async () => ({ data: { user: null }, error: NOT_IMPLEMENTED_ERROR }),
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
