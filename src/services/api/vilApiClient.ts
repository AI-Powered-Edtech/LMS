import type {
  ApiAuthClient,
  ApiClient,
  ApiError,
  ApiQueryBuilder,
  ApiQueryResult,
  ApiStorageClient,
} from './types'

function notImplementedError(message: string): ApiError {
  return {
    message,
    details: null,
    hint: 'Gunakan VITE_API_BACKEND=supabase sampai adapter VIL siap.',
    code: 'NOT_IMPLEMENTED',
  }
}

class VilStubQueryBuilder<T = unknown> implements ApiQueryBuilder<T> {
  private readonly result: ApiQueryResult<T>

  constructor(message = 'VIL query builder belum diimplementasikan') {
    this.result = {
      data: null,
      error: notImplementedError(message),
      count: null,
    }
  }

  select(): ApiQueryBuilder<T> {
    return this
  }
  insert(): ApiQueryBuilder<T> {
    return this
  }
  update(): ApiQueryBuilder<T> {
    return this
  }
  delete(): ApiQueryBuilder<T> {
    return this
  }
  upsert(): ApiQueryBuilder<T> {
    return this
  }
  eq(): ApiQueryBuilder<T> {
    return this
  }
  neq(): ApiQueryBuilder<T> {
    return this
  }
  in(): ApiQueryBuilder<T> {
    return this
  }
  ilike(): ApiQueryBuilder<T> {
    return this
  }
  order(): ApiQueryBuilder<T> {
    return this
  }
  range(): ApiQueryBuilder<T> {
    return this
  }
  limit(): ApiQueryBuilder<T> {
    return this
  }
  lt(): ApiQueryBuilder<T> {
    return this
  }
  lte(): ApiQueryBuilder<T> {
    return this
  }
  gt(): ApiQueryBuilder<T> {
    return this
  }
  gte(): ApiQueryBuilder<T> {
    return this
  }
  single(): ApiQueryBuilder<T> {
    return this
  }
  maybeSingle(): ApiQueryBuilder<T> {
    return this
  }

  then<TResult1 = ApiQueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiQueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

const auth: ApiAuthClient = {
  async signInWithPassword() {
    return {
      data: { session: null, user: null },
      error: notImplementedError('VIL auth belum diimplementasikan'),
    }
  },
  async signOut() {
    return { error: notImplementedError('VIL auth belum diimplementasikan') }
  },
  async getSession() {
    return {
      data: { session: null },
      error: notImplementedError('VIL auth belum diimplementasikan'),
    }
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe() {} } } }
  },
}

const storage: ApiStorageClient = {
  from() {
    return {
      async upload() {
        return { data: null, error: notImplementedError('VIL storage belum diimplementasikan') }
      },
      async remove() {
        return { data: null, error: notImplementedError('VIL storage belum diimplementasikan') }
      },
      getPublicUrl() {
        return { data: { publicUrl: '' } }
      },
    }
  },
}

export function createVilApiClient(): ApiClient {
  return {
    from<T = unknown>() {
      return new VilStubQueryBuilder<T>()
    },
    async rpc<T = unknown>() {
      return {
        data: null as T | null,
        error: notImplementedError('VIL rpc belum diimplementasikan'),
      }
    },
    auth,
    storage,
  }
}
