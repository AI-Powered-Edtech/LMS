export type ApiBackend = 'vil'

export interface ApiError {
  message: string
  details: string | null
  hint: string | null
  code: string
  status?: number
}

export interface ApiUser {
  id: string
  email?: string
  phone?: string
  role?: string
  app_metadata?: Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export interface ApiSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
  token_type?: string
  user: ApiUser
}

export interface ApiSubscription {
  unsubscribe(): void
}

export interface ApiAuthClient {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{
    data: { session: ApiSession | null; user: ApiUser | null }
    error: ApiError | null
  }>

  signOut(): Promise<{
    error: ApiError | null
  }>

  getSession(): Promise<{
    data: { session: ApiSession | null }
    error: ApiError | null
  }>

  onAuthStateChange(callback: (event: string, session: ApiSession | null) => void): {
    data: { subscription: ApiSubscription }
  }
}

export interface ApiStorageBucketClient {
  upload(
    path: string,
    file: File | Blob | ArrayBuffer | Uint8Array,
    options?: Record<string, unknown>
  ): Promise<{
    data: unknown
    error: ApiError | null
  }>

  remove(paths: string[]): Promise<{
    data: unknown
    error: ApiError | null
  }>

  getPublicUrl(path: string): {
    data: { publicUrl: string }
  }
}

export interface ApiStorageClient {
  from(bucket: string): ApiStorageBucketClient
}

export interface ApiQueryResult<T = unknown> {
  data: T | null
  error: ApiError | null
  count?: number | null
}

export interface ApiQueryBuilder<T = unknown> extends PromiseLike<ApiQueryResult<T>> {
  select(columns: string, options?: Record<string, unknown>): ApiQueryBuilder<T>
  insert(values: unknown, options?: Record<string, unknown>): ApiQueryBuilder<T>
  update(values: unknown, options?: Record<string, unknown>): ApiQueryBuilder<T>
  delete(options?: Record<string, unknown>): ApiQueryBuilder<T>
  upsert(values: unknown, options?: Record<string, unknown>): ApiQueryBuilder<T>

  eq(column: string, value: unknown): ApiQueryBuilder<T>
  neq(column: string, value: unknown): ApiQueryBuilder<T>
  in(column: string, values: unknown[]): ApiQueryBuilder<T>
  ilike(column: string, pattern: string): ApiQueryBuilder<T>

  order(column: string, options?: Record<string, unknown>): ApiQueryBuilder<T>
  range(from: number, to: number): ApiQueryBuilder<T>
  limit(count: number): ApiQueryBuilder<T>

  lt(column: string, value: unknown): ApiQueryBuilder<T>
  lte(column: string, value: unknown): ApiQueryBuilder<T>
  gt(column: string, value: unknown): ApiQueryBuilder<T>
  gte(column: string, value: unknown): ApiQueryBuilder<T>

  single(): ApiQueryBuilder<T>
  maybeSingle(): ApiQueryBuilder<T>

  then<TResult1 = ApiQueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiQueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2>
}

export interface ApiClient {
  from<T = unknown>(table: string): ApiQueryBuilder<T>

  rpc<T = unknown>(
    fn: string,
    args?: Record<string, unknown>
  ): Promise<{
    data: T | null
    error: ApiError | null
  }>

  auth: ApiAuthClient
  storage: ApiStorageClient
}
