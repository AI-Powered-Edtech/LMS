/* eslint-disable max-lines */
import { createRequestId } from '@/services/api/shadow'

import type {
  AuthBootstrap,
  AuthError,
  AuthProvider,
  AuthSession,
  AuthUser,
  MFADetail,
  MFAEnrollResponse,
} from './types'
import {
  clearRecoveryToken,
  clearVilSession,
  emitVilSession,
  readRecoveryToken,
  readVilSession,
  subscribeVilSession,
  writeRecoveryToken,
  writeVilSession,
} from './vilSession'

type JsonRecord = Record<string, unknown>

interface VilAuthResponse {
  access_token: string
  token_type?: string
  expires_in?: number
  refresh_token: string
  user: {
    id: string
    email: string
    role?: string
    tenant_id?: string | null
    email_confirmed_at?: string
  }
}

function mapError(error: unknown, fallback = 'Terjadi kesalahan autentikasi.'): AuthError {
  if (!error || typeof error !== 'object') {
    return { message: fallback }
  }

  const value = error as JsonRecord
  return {
    message: typeof value.message === 'string' ? value.message : fallback,
    name: typeof value.code === 'string' ? value.code : undefined,
    status: typeof value.status === 'number' ? value.status : undefined,
  }
}

function notImplemented(message: string): AuthError {
  return { message, name: 'NotImplemented', status: 501 }
}

function buildSession(payload: VilAuthResponse): AuthSession {
  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: expiresIn,
    expires_at: expiresAt,
    token_type: payload.token_type ?? 'bearer',
    user: {
      id: payload.user.id,
      email: payload.user.email,
      email_confirmed_at: payload.user.email_confirmed_at || new Date().toISOString(),
      app_metadata: payload.user.role ? { role: payload.user.role } : undefined,
      user_metadata: payload.user.tenant_id ? { tenant_id: payload.user.tenant_id } : undefined,
    },
  }
}

async function parseResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<{
  data: T | null
  error: AuthError | null
}> {
  let payload: unknown = null

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    return {
      data: null,
      error: mapError(
        {
          ...(typeof payload === 'object' && payload ? (payload as JsonRecord) : {}),
          status: response.status,
        },
        fallbackMessage
      ),
    }
  }

  return {
    data: (payload as T | null) ?? null,
    error: null,
  }
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  fallbackMessage: string
): Promise<{ data: T | null; error: AuthError | null }> {
  try {
    const response = await fetch(`${baseUrl}${path}`, init)
    return await parseResponse<T>(response, fallbackMessage)
  } catch (error) {
    return {
      data: null,
      error: mapError(error, fallbackMessage),
    }
  }
}

function buildHeaders(session?: AuthSession | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  return headers
}

function persistSession(event: string, session: AuthSession | null): void {
  if (session) {
    writeVilSession(session)
  } else {
    clearVilSession()
  }

  emitVilSession(event, session)
}

function mapUserFromSession(session: AuthSession | null): AuthUser | null {
  return session?.user ?? null
}

export function createVilAuthProvider(baseUrl = ''): AuthProvider {
  return {
    getSession: async () => ({ data: { session: readVilSession() }, error: null }),

    getUser: async () => {
      const session = readVilSession()
      return { data: { user: mapUserFromSession(session) }, error: null }
    },

    getAuthBootstrap: async () => {
      const session = readVilSession()
      if (!session?.access_token) {
        return { data: null, error: { message: 'Belum login.', status: 401 } }
      }

      const requestId = createRequestId()
      const result = await requestJson<AuthBootstrap>(
        baseUrl,
        '/api/v1/auth/bootstrap',
        {
          method: 'GET',
          headers: {
            ...buildHeaders(session),
            'X-Request-Id': requestId,
          },
        },
        'Gagal memuat bootstrap autentikasi.'
      )

      return result
    },

    onAuthStateChange: (callback) => ({
      data: {
        subscription: {
          unsubscribe: subscribeVilSession(callback),
        },
      },
    }),

    signInWithPassword: async ({ email, password }) => {
      const { data, error } = await requestJson<VilAuthResponse>(
        baseUrl,
        '/api/v1/auth/login',
        {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ email, password }),
        },
        'Gagal masuk.'
      )

      if (error || !data) {
        return { data: { session: null, user: null }, error }
      }

      const session = buildSession(data)
      clearRecoveryToken()
      persistSession('SIGNED_IN', session)

      return { data: { session, user: session.user }, error: null }
    },

    signUp: async ({ email, password, options }) => {
      const firstName =
        typeof options?.data?.first_name === 'string' ? options.data.first_name.trim() : ''
      const lastName =
        typeof options?.data?.last_name === 'string' ? options.data.last_name.trim() : ''
      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()

      const { data, error } = await requestJson<VilAuthResponse>(
        baseUrl,
        '/api/v1/auth/register',
        {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({
            email,
            password,
            full_name: fullName || null,
          }),
        },
        'Gagal mendaftarkan akun.'
      )

      if (error || !data) {
        return { data: { session: null, user: null }, error }
      }

      const session = buildSession(data)
      persistSession('SIGNED_IN', session)

      return { data: { session, user: session.user }, error: null }
    },

    signInWithOAuth: async ({ provider, options }) => {
      if (provider !== 'google') {
        return { error: notImplemented('Provider OAuth ini belum didukung.') }
      }

      const redirectTo = options?.redirectTo ?? `${window.location.origin}/auth/callback`
      const url = new URL(`${baseUrl}/api/v1/auth/login/google`)
      url.searchParams.set('redirect_to', redirectTo)
      window.location.assign(url.toString())
      return { error: null }
    },

    signOut: async () => {
      const session = readVilSession()

      const { error } = await requestJson<null>(
        baseUrl,
        '/api/v1/auth/signout',
        {
          method: 'POST',
          headers: buildHeaders(session),
          body: JSON.stringify({
            refresh_token: session?.refresh_token ?? null,
          }),
        },
        'Gagal keluar.'
      )

      clearRecoveryToken()
      persistSession('SIGNED_OUT', null)
      return { error }
    },

    refreshSession: async () => {
      const session = readVilSession()
      if (!session?.refresh_token) {
        return {
          data: { session: null },
          error: { message: 'Refresh token tidak tersedia.', status: 401 },
        }
      }

      const { data, error } = await requestJson<VilAuthResponse>(
        baseUrl,
        '/api/v1/auth/refresh',
        {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        },
        'Gagal memperbarui sesi.'
      )

      if (error || !data) {
        persistSession('SIGNED_OUT', null)
        return { data: { session: null }, error }
      }

      const nextSession = buildSession(data)
      persistSession('TOKEN_REFRESHED', nextSession)
      return { data: { session: nextSession }, error: null }
    },

    exchangeCodeForSession: async () => ({
      data: { session: null, user: null },
      error: notImplemented('Pertukaran kode OAuth VIL belum tersedia.'),
    }),

    verifyOtp: async ({ token_hash, type }) => {
      if (type === 'signup') {
        const { error } = await requestJson<null>(
          baseUrl,
          '/api/v1/auth/verify',
          {
            method: 'POST',
            headers: buildHeaders(),
            body: JSON.stringify({ token_hash, type }),
          },
          'Gagal memverifikasi email.'
        )
        return { error }
      }

      if (type === 'recovery') {
        writeRecoveryToken(token_hash)
        emitVilSession('PASSWORD_RECOVERY', readVilSession())
        return { error: null }
      }

      return { error: notImplemented('Tipe OTP ini belum didukung di backend VIL.') }
    },

    resend: async ({ type, email }) => {
      if (type !== 'signup') {
        return { error: notImplemented('Pengiriman ulang OTP ini belum didukung.') }
      }

      return {
        error: notImplemented(
          `Kirim ulang email verifikasi untuk ${email} belum didukung di backend VIL.`
        ),
      }
    },

    resetPasswordForEmail: async (email) => {
      const { error } = await requestJson<null>(
        baseUrl,
        '/api/v1/auth/reset-password',
        {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({ email }),
        },
        'Gagal mengirim tautan reset password.'
      )
      return { error }
    },

    updateUser: async (attributes) => {
      const password = typeof attributes.password === 'string' ? attributes.password : null
      if (!password) {
        return {
          data: { user: mapUserFromSession(readVilSession()) },
          error: notImplemented('Update profil VIL belum didukung.'),
        }
      }

      const recoveryToken = readRecoveryToken()
      if (!recoveryToken) {
        return {
          data: { user: null },
          error: { message: 'Token reset password tidak ditemukan.', status: 400 },
        }
      }

      const { error } = await requestJson<null>(
        baseUrl,
        '/api/v1/auth/update-password',
        {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({
            token: recoveryToken,
            password,
          }),
        },
        'Gagal memperbarui password.'
      )

      if (!error) {
        clearRecoveryToken()
      }

      return { data: { user: mapUserFromSession(readVilSession()) }, error }
    },

    mfa: {
      enroll: async ({ factorType, friendlyName }) => {
        if (factorType !== 'totp') {
          return {
            data: null,
            error: notImplemented('Hanya MFA TOTP yang saat ini didukung.'),
          }
        }

        const session = readVilSession()
        const { data, error } = await requestJson<MFAEnrollResponse>(
          baseUrl,
          '/api/v1/auth/mfa/enroll',
          {
            method: 'POST',
            headers: buildHeaders(session),
            body: JSON.stringify({ friendly_name: friendlyName }),
          },
          'Gagal menyiapkan MFA.'
        )
        return { data, error }
      },

      challenge: async ({ factorId }) => ({
        data: { id: factorId, expires_at: Date.now() + 5 * 60_000 },
        error: null,
      }),

      verify: async ({ factorId, code }) => {
        const session = readVilSession()
        const { error } = await requestJson<null>(
          baseUrl,
          '/api/v1/auth/mfa/verify',
          {
            method: 'POST',
            headers: buildHeaders(session),
            body: JSON.stringify({ factor_id: factorId, code }),
          },
          'Gagal memverifikasi MFA.'
        )

        if (error) {
          return { data: null, error }
        }

        return { data: { valid: true }, error: null }
      },

      challengeAndVerify: async ({ factorId, code }) => {
        const session = readVilSession()
        const { error } = await requestJson<null>(
          baseUrl,
          '/api/v1/auth/mfa/verify',
          {
            method: 'POST',
            headers: buildHeaders(session),
            body: JSON.stringify({ factor_id: factorId, code }),
          },
          'Gagal memverifikasi MFA.'
        )

        if (error) {
          return { data: null, error }
        }

        return { data: { valid: true }, error: null }
      },

      unenroll: async () => {
        const session = readVilSession()
        const { error } = await requestJson<null>(
          baseUrl,
          '/api/v1/auth/mfa/unenroll',
          {
            method: 'DELETE',
            headers: buildHeaders(session),
          },
          'Gagal menonaktifkan MFA.'
        )

        return { error }
      },

      listFactors: async () => ({
        data: { all: [] as MFADetail[] },
        error: null,
      }),

      getAuthenticatorAssuranceLevel: async () => ({
        data: {
          currentLevel: 'aal1',
          nextLevel: 'aal2',
          canVerifySingleFactor: true,
        },
        error: null,
      }),
    },
  }
}
