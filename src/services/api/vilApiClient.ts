/* eslint-disable max-lines */
import {
  clearRecoveryToken,
  clearVilSession,
  emitVilSession,
  readVilSession,
  subscribeVilSession,
  writeVilSession,
} from '@/services/auth/vilSession'
import { getSupabaseClient } from '@/services/supabase/client'

import { buildRequestHeaders, createRequestId, runShadowComparison } from './shadow'
import type {
  ApiAuthClient,
  ApiClient,
  ApiError,
  ApiQueryBuilder,
  ApiQueryResult,
  ApiSession,
  ApiStorageClient,
  ApiUser,
} from './types'

type JsonRecord = Record<string, unknown>
type QueryAction = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

/**
 * Tables whose write mutations are shadowed for Gate 3.
 * After VIL executes the write, we read back from Supabase to verify convergence.
 */
const WRITE_SHADOW_TABLES = new Set([
  'quiz_attempts_v2',
  'quiz_answers',
  'quiz_attempt_questions_v2',
  'assignment_submissions',
  'gradebook_entries',
])

/**
 * Mutating RPCs whose results are shadowed for Gate 3.
 * After VIL executes the RPC, we call the same RPC on Supabase and compare responses.
 * Only RPCs that are idempotent-safe for shadow (same underlying DB) belong here.
 */
const WRITE_SHADOW_RPCS = new Set([
  'v1_submit_quiz_attempt',
  'submit_assignment_attempt',
  'sync_gradebook_entries',
  'grade_attempt_question',
])

interface VilQueryResponse {
  data: unknown
  count?: number | null
}

interface VilRpcResponse {
  data: unknown
  returns_set: boolean
}

interface ShadowSelectResult {
  data: unknown
  error: unknown
}

interface ShadowSelectQuery extends PromiseLike<ShadowSelectResult> {
  eq(column: string, value: unknown): ShadowSelectQuery
  neq(column: string, value: unknown): ShadowSelectQuery
  in(column: string, values: unknown[]): ShadowSelectQuery
  ilike(column: string, pattern: string): ShadowSelectQuery
  lt(column: string, value: unknown): ShadowSelectQuery
  lte(column: string, value: unknown): ShadowSelectQuery
  gt(column: string, value: unknown): ShadowSelectQuery
  gte(column: string, value: unknown): ShadowSelectQuery
  is(column: string, value: unknown): ShadowSelectQuery
  not(column: string, operator: string, value: unknown): ShadowSelectQuery
  order(column: string, options?: { ascending?: boolean }): ShadowSelectQuery
  range(from: number, to: number): ShadowSelectQuery
  limit(count: number): ShadowSelectQuery
  single(): PromiseLike<ShadowSelectResult>
  maybeSingle(): PromiseLike<ShadowSelectResult>
}

const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const SAFE_READ_RPCS = new Set([
  'get_activity_timeline',
  'get_assignment_analytics',
  'get_assignment_grading_queue',
  'get_assignment_submission_bundle',
  'get_at_risk_students',
  'get_attempt_detail',
  'get_course_analytics',
  'get_course_engagement',
  'get_engagement_summary',
  'get_engagement_trend',
  'get_executive_overview',
  'get_gradebook_students',
  'get_group_settings',
  'get_lesson_analytics',
  'get_my_children',
  'get_parent_dashboard_snapshot',
  'get_principal_monthly_trend_cached',
  'get_principal_overview_cached',
  'get_question_difficulty',
  'get_quiz_live_status',
  'get_student_group_assignment',
  'get_student_path',
  'get_student_prediction',
  'get_student_progress_bundle',
  'get_student_signals',
  'get_survey_results',
  'get_teacher_analytics',
  'get_teacher_group_overview',
  'get_tenant_activity_counts',
  'list_funnel_definitions',
  'rpc_check_builder_access',
  'validate_invitation',
])

function normalizeError(error: unknown, fallback = 'Permintaan VIL gagal.'): ApiError {
  if (!error || typeof error !== 'object') {
    return {
      message: fallback,
      details: null,
      hint: null,
      code: 'UNKNOWN',
    }
  }

  const value = error as JsonRecord

  return {
    message: typeof value.message === 'string' ? value.message : fallback,
    details: typeof value.details === 'string' ? value.details : null,
    hint: typeof value.hint === 'string' ? value.hint : null,
    code: typeof value.code === 'string' ? value.code : 'UNKNOWN',
    status: typeof value.status === 'number' ? value.status : undefined,
  }
}

function notImplementedError(message: string): ApiError {
  return {
    message,
    details: null,
    hint: 'Mode VIL baru mencakup autentikasi dan RPC auth dasar.',
    code: 'NOT_IMPLEMENTED',
    status: 501,
  }
}

function buildHeaders(withAuth = false, requestId?: string): HeadersInit {
  return buildRequestHeaders({}, { withAuth, requestId })
}

async function parseResponse<T>(response: Response): Promise<{
  data: T | null
  error: ApiError | null
}> {
  let payload: unknown = null

  if ((response.headers.get('content-type') ?? '').includes('application/json')) {
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    return {
      data: null,
      error: normalizeError({
        ...(typeof payload === 'object' && payload ? (payload as JsonRecord) : {}),
        status: response.status,
      }),
    }
  }

  return {
    data: (payload as T | null) ?? null,
    error: null,
  }
}

async function requestJson<T>(
  path: string,
  init: RequestInit
): Promise<{ data: T | null; error: ApiError | null }> {
  try {
    const response = await fetch(`${DEFAULT_BASE_URL}${path}`, init)
    return await parseResponse<T>(response)
  } catch (error) {
    return {
      data: null,
      error: normalizeError(error),
    }
  }
}

function mapUser(session: ApiSession | null): ApiUser | null {
  return session?.user ?? null
}

function buildSession(payload: JsonRecord): ApiSession | null {
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : null
  const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : null
  const user = payload.user && typeof payload.user === 'object' ? (payload.user as JsonRecord) : null

  if (!accessToken || !refreshToken || !user || typeof user.id !== 'string') {
    return null
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : 3600

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    token_type: typeof payload.token_type === 'string' ? payload.token_type : 'bearer',
    user: {
      id: user.id,
      email: typeof user.email === 'string' ? user.email : undefined,
      role: typeof user.role === 'string' ? user.role : undefined,
      user_metadata:
        typeof user.tenant_id === 'string' ? { tenant_id: user.tenant_id } : undefined,
    },
  }
}

class VilQueryBuilder<T = unknown> implements ApiQueryBuilder<T> {
  private action: QueryAction = 'select'
  private selectColumns = '*'
  private values: unknown = null
  private filters: Array<{
    column: string
    op: string
    value: unknown
    comparator?: string
  }> = []
  private orders: Array<{ column: string; ascending?: boolean }> = []
  private currentRange: { from: number; to: number } | null = null
  private currentLimit: number | null = null
  private currentOptions: Record<string, unknown> = {}
  private singleMode: 'single' | 'maybeSingle' | null = null
  private queryError: ApiError | null = null
  private readonly table: string

  constructor(table: string) {
    this.table = table
  }

  private fail(message: string): this {
    this.queryError = notImplementedError(message)
    return this
  }

  private execute(): Promise<ApiQueryResult<T>> {
    if (this.queryError) {
      return Promise.resolve({ data: null, error: this.queryError, count: null })
    }

    const requestId = createRequestId()
    const requestPayload = {
      action: this.action,
      select: this.selectColumns,
      filters: this.filters,
      order: this.orders,
      range: this.currentRange,
      limit: this.currentLimit,
      values: this.values,
      options: this.currentOptions,
      single: this.singleMode,
    }

    return requestJson<VilQueryResponse>(`/api/v1/data/${this.table}`, {
      method: 'POST',
      headers: buildHeaders(true, requestId),
      body: JSON.stringify(requestPayload),
    }).then(({ data, error }) => {
      const result = {
        data: ((data?.data ?? null) as T | null) ?? null,
        error,
        count: typeof data?.count === 'number' ? data.count : null,
      }

      void this.runShadow(requestId, requestPayload, result)
      return result
    })
  }

  private async runShadow(
    requestId: string,
    requestPayload: JsonRecord,
    primaryResult: ApiQueryResult<T>
  ): Promise<void> {
    const isWrite = this.action !== 'select'

    if (isWrite && !WRITE_SHADOW_TABLES.has(this.table)) {
      return
    }

    const shadowMode = isWrite ? 'write' : 'read'

    await runShadowComparison({
      flowName: `proxy.${isWrite ? 'write' : 'query'}.${this.table}`,
      endpoint: `/api/v1/data/${this.table}`,
      method: 'POST',
      shadowMode,
      primaryBackend: 'vil',
      shadowBackend: 'supabase',
      requestSignature: requestPayload,
      requestId,
      primaryResult,
      shadowRequest: async () => {
        if (isWrite) {
          return this.shadowReadBack()
        }
        return this.shadowSelectMirror()
      },
    })
  }

  /**
   * Write shadow: read back the mutated record(s) from Supabase to verify
   * VIL returned correct data. Does NOT re-execute the write.
   */
  private async shadowReadBack(): Promise<{
    data: T | null
    error: { message?: string | null; status?: number } | null
  }> {
    const selectCols = this.selectColumns !== '*' ? this.selectColumns : 'id, updated_at'
    let query = getSupabaseClient()
      .from(this.table)
      .select(selectCols) as unknown as ShadowSelectQuery

    for (const filter of this.filters) {
      query = this.applyFilterToQuery(query, filter)
    }

    if (this.singleMode === 'single') {
      const shadow = await query.single()
      return {
        data: (shadow.data ?? null) as T | null,
        error: shadow.error ? normalizeError(shadow.error) : null,
      }
    }

    if (this.singleMode === 'maybeSingle') {
      const shadow = await query.maybeSingle()
      return {
        data: (shadow.data ?? null) as T | null,
        error: shadow.error ? normalizeError(shadow.error) : null,
      }
    }

    if (this.currentLimit !== null) {
      query = query.limit(this.currentLimit)
    }

    const shadow = await query
    return {
      data: (shadow.data ?? null) as T | null,
      error: shadow.error ? normalizeError(shadow.error) : null,
    }
  }

  /**
   * Read shadow: execute the same select query on Supabase for comparison.
   */
  private async shadowSelectMirror(): Promise<{
    data: T | null
    error: { message?: string | null; status?: number } | null
  }> {
    let query = getSupabaseClient()
      .from(this.table)
      .select(this.selectColumns, this.currentOptions as never) as unknown as ShadowSelectQuery

    for (const filter of this.filters) {
      query = this.applyFilterToQuery(query, filter)
    }

    for (const order of this.orders) {
      query = query.order(order.column, { ascending: order.ascending !== false })
    }

    if (this.currentRange) {
      query = query.range(this.currentRange.from, this.currentRange.to)
    } else if (this.currentLimit !== null) {
      query = query.limit(this.currentLimit)
    }

    const shadow =
      this.singleMode === 'single'
        ? await query.single()
        : this.singleMode === 'maybeSingle'
          ? await query.maybeSingle()
          : await query
    return {
      data: (shadow.data ?? null) as T | null,
      error: shadow.error ? normalizeError(shadow.error) : null,
    }
  }

  private applyFilterToQuery(query: ShadowSelectQuery, filter: { column: string; op: string; value: unknown; comparator?: string }): ShadowSelectQuery {
    switch (filter.op) {
      case 'not':
        if (!filter.comparator) {
          throw new Error(`Shadow filter comparator untuk ${filter.column} wajib diisi`)
        }
        return query.not(filter.column, filter.comparator, filter.value)
      case 'is':
        return query.is(filter.column, filter.value)
      case 'eq':
        return query.eq(filter.column, filter.value)
      case 'neq':
        return query.neq(filter.column, filter.value)
      case 'in':
        return query.in(filter.column, filter.value as unknown[])
      case 'ilike':
        return query.ilike(filter.column, filter.value as string)
      case 'lt':
        return query.lt(filter.column, filter.value)
      case 'lte':
        return query.lte(filter.column, filter.value)
      case 'gt':
        return query.gt(filter.column, filter.value)
      case 'gte':
        return query.gte(filter.column, filter.value)
      default:
        throw new Error(`Shadow filter ${filter.op} belum didukung`)
    }
  }

  select(columns = '*', options?: Record<string, unknown>): ApiQueryBuilder<T> {
    this.selectColumns = columns
    if (options) {
      this.currentOptions = { ...this.currentOptions, ...options }
    }
    return this
  }

  insert(values: unknown, options?: Record<string, unknown>): ApiQueryBuilder<T> {
    this.action = 'insert'
    this.values = values
    if (options) {
      this.currentOptions = { ...this.currentOptions, ...options }
    }
    return this
  }

  update(values: unknown, options?: Record<string, unknown>): ApiQueryBuilder<T> {
    this.action = 'update'
    this.values = values
    if (options) {
      this.currentOptions = { ...this.currentOptions, ...options }
    }
    return this
  }

  delete(options?: Record<string, unknown>): ApiQueryBuilder<T> {
    this.action = 'delete'
    if (options) {
      this.currentOptions = { ...this.currentOptions, ...options }
    }
    return this
  }

  upsert(values: unknown, options?: Record<string, unknown>): ApiQueryBuilder<T> {
    this.action = 'upsert'
    this.values = values
    if (options) {
      this.currentOptions = { ...this.currentOptions, ...options }
    }
    return this
  }

  eq(column: string, value: unknown): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'eq', value })
    return this
  }

  neq(column: string, value: unknown): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'neq', value })
    return this
  }

  in(column: string, values: unknown[]): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'in', value: values })
    return this
  }

  ilike(column: string, pattern: string): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'ilike', value: pattern })
    return this
  }

  order(column: string, options?: Record<string, unknown>): ApiQueryBuilder<T> {
    this.orders.push({ column, ascending: options?.ascending !== false })
    return this
  }

  range(from: number, to: number): ApiQueryBuilder<T> {
    this.currentRange = { from, to }
    return this
  }

  limit(count: number): ApiQueryBuilder<T> {
    this.currentLimit = count
    return this
  }

  lt(column: string, value: unknown): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'lt', value })
    return this
  }

  lte(column: string, value: unknown): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'lte', value })
    return this
  }

  gt(column: string, value: unknown): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'gt', value })
    return this
  }

  gte(column: string, value: unknown): ApiQueryBuilder<T> {
    this.filters.push({ column, op: 'gte', value })
    return this
  }

  is(column: string, value: unknown): this {
    this.filters.push({ column, op: 'is', value })
    return this
  }

  not(column: string, comparator: string, value: unknown): this {
    this.filters.push({ column, op: 'not', value, comparator })
    return this
  }

  match(criteria: Record<string, unknown>): this {
    Object.entries(criteria).forEach(([column, value]) => {
      this.eq(column, value)
    })
    return this
  }

  or(_expression: string): this {
    return this.fail('Filter OR generik belum didukung oleh VIL query builder')
  }

  contains(_column: string, _value: unknown): this {
    return this.fail('Filter CONTAINS generik belum didukung oleh VIL query builder')
  }

  single(): ApiQueryBuilder<T> {
    this.singleMode = 'single'
    return this
  }

  maybeSingle(): ApiQueryBuilder<T> {
    this.singleMode = 'maybeSingle'
    return this
  }

  then<TResult1 = ApiQueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: ApiQueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

const auth: ApiAuthClient = {
  async signInWithPassword(credentials) {
    const { data, error } = await requestJson<JsonRecord>('/api/v1/auth/login', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(credentials),
    })

    const session = data ? buildSession(data) : null
    if (session) {
      writeVilSession(session)
      clearRecoveryToken()
      emitVilSession('SIGNED_IN', session)
    }

    return {
      data: { session, user: mapUser(session) },
      error,
    }
  },

  async signOut() {
    const session = readVilSession()

    const { error } = await requestJson<null>('/api/v1/auth/signout', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify({ refresh_token: session?.refresh_token ?? null }),
    })

    clearRecoveryToken()
    clearVilSession()
    emitVilSession('SIGNED_OUT', null)

    return { error }
  },

  async getSession() {
    return {
      data: { session: readVilSession() },
      error: null,
    }
  },

  onAuthStateChange(callback) {
    return {
      data: {
        subscription: {
          unsubscribe: subscribeVilSession(callback),
        },
      },
    }
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

async function callAuthRpc<T = unknown>(
  fn: string,
  args?: Record<string, unknown>
): Promise<{ data: T | null; error: ApiError | null }> {
  switch (fn) {
    case 'ensure_profile_exists':
      return requestJson<T>('/api/v1/auth/ensure-profile', {
        method: 'POST',
        headers: buildHeaders(true, createRequestId()),
        body: JSON.stringify({}),
      })

    case 'accept_invitation':
      return requestJson<T>('/api/v1/auth/accept-invitation', {
        method: 'POST',
        headers: buildHeaders(true, createRequestId()),
        body: JSON.stringify({ token: args?.p_token }),
      })

    case 'enroll_student':
      return requestJson<T>('/api/v1/auth/enroll', {
        method: 'POST',
        headers: buildHeaders(true, createRequestId()),
        body: JSON.stringify({ join_code: args?.p_join_code }),
      })

    case 'validate_invitation':
      return requestJson<T>(
        `/api/v1/auth/validate-invitation?token=${encodeURIComponent(String(args?.p_token ?? ''))}`,
        {
          method: 'GET',
          headers: buildHeaders(false, createRequestId()),
        }
      )

    case 'public_lookup_class':
      return requestJson<T>(
        `/api/v1/auth/lookup-class?code=${encodeURIComponent(String(args?.p_join_code ?? ''))}`,
        {
          method: 'GET',
          headers: buildHeaders(false, createRequestId()),
        }
      )

    case 'onboard_student_join_class':
      {
        const lookup = await requestJson<JsonRecord>(
          `/api/v1/auth/lookup-class?code=${encodeURIComponent(String(args?.p_join_code ?? ''))}`,
          {
            method: 'GET',
            headers: buildHeaders(false, createRequestId()),
          }
        )

        if (lookup.error || !lookup.data) {
          return { data: null, error: lookup.error }
        }

        const enroll = await requestJson<unknown>('/api/v1/auth/enroll', {
          method: 'POST',
          headers: buildHeaders(true, createRequestId()),
          body: JSON.stringify({ join_code: args?.p_join_code }),
        })

        if (enroll.error) {
          return { data: null, error: enroll.error }
        }

        return {
          data: {
            class_name:
              typeof lookup.data.name === 'string' ? lookup.data.name : '',
            school_name:
              typeof lookup.data.tenant_name === 'string'
                ? lookup.data.tenant_name
                : typeof lookup.data.tenant_id === 'string'
                  ? 'Sekolah Anda'
                  : '',
            tenant_id:
              typeof lookup.data.tenant_id === 'string' ? lookup.data.tenant_id : null,
          } as T,
          error: null,
        }
      }

    case 'create_school_tenant':
      {
        const result = await requestJson<JsonRecord>('/api/v1/auth/create-tenant', {
          method: 'POST',
          headers: buildHeaders(true, createRequestId()),
          body: JSON.stringify({
            name: args?.p_school_name,
            slug:
              typeof args?.p_school_name === 'string'
                ? args.p_school_name
                    .toLowerCase()
                    .trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '')
                : '',
            role: args?.p_role,
            full_name: args?.p_full_name,
          }),
        })

        if (result.error || !result.data) {
          return { data: null, error: result.error }
        }

        return {
          data: (result.data.tenant_id as T) ?? null,
          error: null,
        }
      }

    default:
      {
        const requestId = createRequestId()
        const result = await requestJson<VilRpcResponse>(`/api/v1/rpc/${fn}`, {
          method: 'POST',
          headers: buildHeaders(true, requestId),
          body: JSON.stringify({ args: args ?? {} }),
        })

        const payload = {
          data: ((result.data?.data ?? null) as T | null) ?? null,
          error: result.error,
        }

        const isReadRpc = SAFE_READ_RPCS.has(fn)
        const isWriteRpc = WRITE_SHADOW_RPCS.has(fn)

        if (isReadRpc || isWriteRpc) {
          void runShadowComparison({
            flowName: `proxy.rpc.${fn}`,
            endpoint: `/api/v1/rpc/${fn}`,
            method: 'POST',
            shadowMode: isWriteRpc ? 'write' : 'read',
            primaryBackend: 'vil',
            shadowBackend: 'supabase',
            requestSignature: { fn, args: args ?? {} },
            requestId,
            primaryResult: payload,
            shadowRequest: async () => {
              // Both VIL and Supabase share the same PostgreSQL.
              // For write RPCs the mutation already happened via VIL;
              // calling the RPC on Supabase reads the committed state
              // from the same DB, so this is a convergence check, not a double-write.
              const shadow = await getSupabaseClient().rpc(fn, args ?? {})
              return {
                data: (shadow.data ?? null) as T | null,
                error: shadow.error ? normalizeError(shadow.error) : null,
              }
            },
          })
        }

        return payload
      }
  }
}

export function createVilApiClient(): ApiClient {
  return {
    from<T = unknown>(table: string) {
      return new VilQueryBuilder<T>(table)
    },

    rpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
      return callAuthRpc<T>(fn, args)
    },

    auth,
    storage,
  }
}
