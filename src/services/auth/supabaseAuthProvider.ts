import type {
  AuthProvider,
  AuthUser,
  AuthSession,
  AuthError,
  MFADetail,
  MFAEnrollResponse,
} from './types'
import { getSupabaseClient } from '@/services/supabase/client'

function mapUser(supabaseUser: unknown): AuthUser {
  const user = supabaseUser as {
    id: string
    email?: string
    phone?: string
    email_confirmed_at?: string
    app_metadata?: Record<string, unknown>
    user_metadata?: Record<string, unknown>
  }
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    email_confirmed_at: user.email_confirmed_at,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  }
}

function mapSession(supabaseSession: unknown): AuthSession | null {
  if (!supabaseSession) return null
  const session = supabaseSession as {
    access_token: string
    refresh_token: string
    expires_at?: number
    expires_in?: number
    token_type?: string
    user: unknown
  }
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: mapUser(session.user),
  }
}

function mapError(supabaseError: unknown): AuthError | null {
  if (!supabaseError) return null
  const error = supabaseError as { message: string; name?: string; status?: number }
  return {
    message: error.message,
    name: error.name,
    status: error.status,
  }
}

export function createSupabaseAuthProvider(): AuthProvider {
  const supabase = getSupabaseClient()

  return {
    getSession: async () => {
      const { data, error } = await supabase.auth.getSession()
      return {
        data: { session: mapSession(data?.session) },
        error: mapError(error),
      }
    },

    getUser: async () => {
      const { data, error } = await supabase.auth.getUser()
      return {
        data: { user: data?.user ? mapUser(data.user) : null },
        error: mapError(error),
      }
    },

    onAuthStateChange: (callback) => {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(_event, mapSession(session))
      })
      return { data: { subscription: { unsubscribe: () => data.subscription.unsubscribe() } } }
    },

    signInWithPassword: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      return {
        data: {
          session: data?.session ? mapSession(data.session) : null,
          user: data?.user ? mapUser(data.user) : null,
        },
        error: mapError(error),
      }
    },

    signUp: async ({ email, password, options }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: options as any,
      })
      return {
        data: {
          session: data?.session ? mapSession(data.session) : null,
          user: data?.user ? mapUser(data.user) : null,
        },
        error: mapError(error),
      }
    },

    signInWithOAuth: async ({ provider, options }) => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: options as Parameters<typeof supabase.auth.signInWithOAuth>[0]['options'],
      })
      return { error: mapError(error) }
    },

    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      return { error: mapError(error) }
    },

    refreshSession: async () => {
      const { data, error } = await supabase.auth.refreshSession()
      return {
        data: { session: data?.session ? mapSession(data.session) : null },
        error: mapError(error),
      }
    },

    exchangeCodeForSession: async (code) => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      return {
        data: {
          session: data?.session ? mapSession(data.session) : null,
          user: data?.user ? mapUser(data.user) : null,
        },
        error: mapError(error),
      }
    },

    resetPasswordForEmail: async (email, options) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, options as any)
      return { error: mapError(error) }
    },

    updateUser: async (attributes) => {
      const { data, error } = await supabase.auth.updateUser(attributes)
      return {
        data: { user: data?.user ? mapUser(data.user) : null },
        error: mapError(error),
      }
    },

    mfa: {
      enroll: async ({ factorType, friendlyName }) => {
        const { data, error } = await supabase.auth.mfa.enroll({ factorType, friendlyName })
        return { data: data as MFAEnrollResponse | null, error: mapError(error) }
      },

      challenge: async ({ factorId }) => {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId })
        return { data: data as { id: string; expires_at: number } | null, error: mapError(error) }
      },

      verify: async ({ factorId, code, challengeId }) => {
        const { data, error } = await (supabase.auth.mfa as any).verify({
          factorId,
          code,
          challengeId,
        })
        return { data: data as { valid: boolean } | null, error: mapError(error) }
      },

      challengeAndVerify: async ({ factorId, code }) => {
        const { data, error } = await (supabase.auth.mfa as any).challengeAndVerify({
          factorId,
          code,
        })
        return { data: data as { valid: boolean } | null, error: mapError(error) }
      },

      unenroll: async ({ factorId }) => {
        const { error } = await supabase.auth.mfa.unenroll({ factorId })
        return { error: mapError(error) }
      },

      listFactors: async () => {
        const { data, error } = await supabase.auth.mfa.listFactors()
        return { data: data as { all: MFADetail[] } | null, error: mapError(error) }
      },

      getAuthenticatorAssuranceLevel: async () => {
        const { data, error } = await (supabase.auth.mfa as any).getAuthenticatorAssuranceLevel()
        const level = data?.currentLevel
        const nextLevel = data?.nextLevel
        return {
          data: data
            ? {
                currentLevel: typeof level === 'string' ? level : 'aal0',
                nextLevel: typeof nextLevel === 'string' ? nextLevel : null,
                canVerifySingleFactor: level !== null && level !== 'aal0',
              }
            : null,
          error: mapError(error),
        }
      },
    },
  }
}
