export type ApiError = Error & { code?: string }

export interface ApiFetchResult<T> {
  data: T | null
  error: ApiError | null
  count: number
}

export function apiFetch(endpoint: string, options: RequestInit = {}) {
  const execute = async () => {
    const token = localStorage.getItem('token')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const err = new Error(errorData.message || `API Error: ${response.status}`) as ApiError
      if (typeof errorData?.code === 'string') err.code = errorData.code
      return { data: null, error: err, count: 0 }
    }

    const data = await response.json()
    return { data, error: null, count: Array.isArray(data) ? data.length : 0 }
  }

  // Mock query builder
  const builder: any = {
    then: (resolve: any, reject: any) => execute().then(resolve, reject),
    catch: (reject: any) => execute().catch(reject),
    finally: (cb: any) => execute().finally(cb),
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    in: () => builder,
    contains: () => builder,
    containedBy: () => builder,
    rangeGt: () => builder,
    rangeGte: () => builder,
    rangeLt: () => builder,
    rangeLte: () => builder,
    rangeAdjacent: () => builder,
    overlaps: () => builder,
    textSearch: () => builder,
    match: () => builder,
    not: () => builder,
    or: () => builder,
    filter: () => builder,
    order: () => builder,
    limit: () => builder,
    range: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    csv: () => builder,
    returns: () => builder,
  }

  return builder
}

// Mock API client to replace Supabase client functionality
export const api = {
  auth: {
    getSession: async (): Promise<{ data: { session: unknown | null }; error: ApiError | null }> => ({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: (_cb: any) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    updateUser: async (_data: any): Promise<{ data: unknown | null; error: ApiError | null }> => ({
      data: null,
      error: null,
    }),
    signInWithPassword: async (
      _data: any
    ): Promise<{ data: { user: unknown | null; session: unknown | null }; error: ApiError | null }> => ({
      data: { user: null, session: null },
      error: null,
    }),
    verifyOtp: async (
      _data: any
    ): Promise<{ data: { session: unknown | null }; error: ApiError | null }> => ({
      data: { session: null },
      error: null,
    }),
  },
  functions: {
    invoke: async <T = unknown>(
      name: string,
      options?: { body?: unknown }
    ): Promise<{ data: T | null; error: ApiError | null }> => {
      try {
        const { data, error } = (await apiFetch(`/v1/functions/${name}`, {
          method: 'POST',
          body: options?.body ? JSON.stringify(options.body) : undefined,
        })) as ApiFetchResult<unknown>

        return { data: (data as T) ?? null, error }
      } catch (e) {
        const err = (e instanceof Error ? e : new Error(String(e))) as ApiError
        return { data: null, error: err }
      }
    },
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (
        path: string,
        _file: any,
        _opts?: any
      ): Promise<{ data: { path: string } | null; error: ApiError | null }> => ({
        data: { path },
        error: null,
      }),
      remove: async (_paths: string[]): Promise<{ data: null; error: ApiError | null }> => ({
        data: null,
        error: null,
      }),
      getPublicUrl: (path: string): { data: { publicUrl: string } } => ({
        data: { publicUrl: `/api/v1/storage/${bucket}/${path}` },
      }),
    }),
  },
  channel: (_name: string, _opts?: any) => {
    const channel: any = {
      on: (_event: string, _filter: any, _callback: any) => channel,
      subscribe: (_cb?: (status: string) => void) => channel,
      unsubscribe: () => {},
      send: async (_data: any) => {},
      track: async (_data: any) => {},
      untrack: async () => {},
      presenceState: () => ({}),
    }
    return channel
  },
  removeChannel: (_channel: any) => {},
}
