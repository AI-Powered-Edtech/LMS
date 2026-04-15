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
      return { data: null, error: new Error(errorData.message || `API Error: ${response.status}`), count: 0 }
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
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    updateUser: async (_data: any) => ({ _data: null, error: null }),
    signInWithPassword: async (_data: any) => ({ _data: null, error: null }),
    verifyOtp: async (_data: any) => ({ _data: { session: null }, error: null }),
  },
  functions: {
    invoke: async <T = any>(name: string, options?: any) => {
      try {
        const data = await apiFetch(`/v1/functions/${name}`, {
          method: 'POST',
          body: options?.body ? JSON.stringify(options.body) : undefined,
        })
        return { data: data as T, error: null }
      } catch (error) {
        return { data: null, error }
      }
    }
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, _file: any, _opts?: any) => ({ data: { path }, error: null }),
      remove: async (_paths: string[]) => ({ data: null, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `/api/v1/storage/${bucket}/${path}` } })
    })
  },
  channel: (_name: string, _opts?: any) => ({
    on: (_event: string, _filter: any, _callback: any) => ({ on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) }),
    subscribe: (_cb?: any) => ({ unsubscribe: () => {} }),
    unsubscribe: () => {},
    send: async (_data: any) => ({}),
    track: async (_data: any) => ({}),
    untrack: async () => ({}),
    presenceState: () => ({})
  }),
  removeChannel: (_channel: any) => {}
}
