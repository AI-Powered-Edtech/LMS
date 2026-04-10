import { supabase } from '@/services/supabase/client'

import type {
  ApiAuthClient,
  ApiClient,
  ApiError,
  ApiQueryBuilder,
  ApiSession,
  ApiStorageClient,
  ApiUser,
} from './types'

function normalizeError(error: unknown): ApiError | null {
  if (!error) return null

  if (typeof error !== 'object') {
    return {
      message: String(error),
      details: null,
      hint: null,
      code: 'UNKNOWN',
    }
  }

  const value = error as Record<string, unknown>

  return {
    message: typeof value.message === 'string' ? value.message : 'Terjadi kesalahan',
    details: typeof value.details === 'string' ? value.details : null,
    hint: typeof value.hint === 'string' ? value.hint : null,
    code: typeof value.code === 'string' ? value.code : 'UNKNOWN',
    status: typeof value.status === 'number' ? value.status : undefined,
  }
}

function mapUser(user: unknown): ApiUser | null {
  if (!user || typeof user !== 'object') return null

  const value = user as Record<string, unknown>
  const id = typeof value.id === 'string' ? value.id : ''

  if (!id) return null

  return {
    id,
    email: typeof value.email === 'string' ? value.email : undefined,
    phone: typeof value.phone === 'string' ? value.phone : undefined,
    role: typeof value.role === 'string' ? value.role : undefined,
    app_metadata:
      value.app_metadata && typeof value.app_metadata === 'object'
        ? (value.app_metadata as Record<string, unknown>)
        : undefined,
    user_metadata:
      value.user_metadata && typeof value.user_metadata === 'object'
        ? (value.user_metadata as Record<string, unknown>)
        : undefined,
  }
}

function mapSession(session: unknown): ApiSession | null {
  if (!session || typeof session !== 'object') return null

  const value = session as Record<string, unknown>
  const user = mapUser(value.user)

  if (!user) return null

  return {
    access_token: typeof value.access_token === 'string' ? value.access_token : '',
    refresh_token: typeof value.refresh_token === 'string' ? value.refresh_token : '',
    expires_at: typeof value.expires_at === 'number' ? value.expires_at : undefined,
    expires_in: typeof value.expires_in === 'number' ? value.expires_in : undefined,
    token_type: typeof value.token_type === 'string' ? value.token_type : undefined,
    user,
  }
}

function castQueryBuilder<T>(query: unknown): ApiQueryBuilder<T> {
  return query as ApiQueryBuilder<T>
}

const auth: ApiAuthClient = {
  async signInWithPassword(credentials) {
    const result = await supabase.auth.signInWithPassword(credentials)

    return {
      data: {
        session: mapSession(result.data.session),
        user: mapUser(result.data.user),
      },
      error: normalizeError(result.error),
    }
  },

  async signOut() {
    const result = await supabase.auth.signOut()

    return {
      error: normalizeError(result.error),
    }
  },

  async getSession() {
    const result = await supabase.auth.getSession()

    return {
      data: {
        session: mapSession(result.data.session),
      },
      error: normalizeError(result.error),
    }
  },

  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, mapSession(session))
    })

    return {
      data: {
        subscription: {
          unsubscribe: () => data.subscription.unsubscribe(),
        },
      },
    }
  },
}

const storage: ApiStorageClient = {
  from(bucket) {
    const bucketClient = supabase.storage.from(bucket)

    return {
      async upload(path, file, options) {
        const result = await bucketClient.upload(path, file as File, options as never)

        return {
          data: result.data ?? null,
          error: normalizeError(result.error),
        }
      },

      async remove(paths) {
        const result = await bucketClient.remove(paths)

        return {
          data: result.data ?? null,
          error: normalizeError(result.error),
        }
      },

      getPublicUrl(path) {
        return bucketClient.getPublicUrl(path)
      },
    }
  },
}

export function createSupabaseApiClient(): ApiClient {
  return {
    from<T = unknown>(table: string): ApiQueryBuilder<T> {
      return castQueryBuilder<T>(supabase.from(table))
    },

    async rpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
      const result = await supabase.rpc(fn, args ?? {})

      return {
        data: (result.data ?? null) as T | null,
        error: normalizeError(result.error),
      }
    },

    auth,
    storage,
  }
}
