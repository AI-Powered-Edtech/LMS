# Task Queue — Wave 0A: API Client Abstraction

**Timeline:** Weeks 1-4 (~40 hours)
**Goal:** Establish `getApiClient()` singleton, refactor courseService as POC
**Status:** ACTIVE — Phase 0A only, 0B-0E frozen

---

## Prerequisites

- [x] Supabase client already set up at `src/services/supabase/client.ts`
- [x] Project uses React 19 + Vite + TypeScript
- [x] `pnpm` available
- [x] `validateEnv()` exists in `src/config/env.schema.ts`
- [x] Phase -1 Reality Sync COMPLETE

---

## Rules (STRICT)

1. **JANGAN** ubah file di luar scope task 0A-1 s.d. 0A-11
2. **Gunakan `pnpm`** — bukan `npm` atau `yarn`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Commit sebelum setiap task:** `git add -A && git commit -m "checkpoint: before task 0A-XX"`
5. **Rollback jika blocked:** `git checkout -- <files>`
6. Run `pnpm typecheck && pnpm lint` setelah setiap task

**DILARANG SENTUH:**

- ❌ `src/features/auth/*`
- ❌ realtime hooks
- ❌ storage services
- ❌ offline queue files
- ❌ Phase 1 scaffold

---

## Task 0A-1: Create `src/services/api/types.ts`

**Output:** `src/services/api/types.ts`

Buat file dengan lengkap:

```ts
export type ApiBackend = 'supabase' | 'vil'

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
```

**Verify:** `pnpm typecheck`

---

## Task 0A-2: Create `src/services/api/apiClient.ts`

**Output:** `src/services/api/apiClient.ts`

```ts
import { createSupabaseApiClient } from './supabaseApiClient'
import type { ApiBackend, ApiClient } from './types'
import { createVilApiClient } from './vilApiClient'

let activeBackend: ApiBackend = 'supabase'
let activeClient: ApiClient | null = null

export function initApiClient(backend: ApiBackend = 'supabase'): ApiClient {
  activeBackend = backend
  activeClient = backend === 'vil' ? createVilApiClient() : createSupabaseApiClient()
  return activeClient
}

export function getApiClient(): ApiClient {
  if (!activeClient) {
    return initApiClient(activeBackend)
  }

  return activeClient
}

export function getApiBackend(): ApiBackend {
  return activeBackend
}
```

**Verify:** `pnpm typecheck`

---

## Task 0A-3: Create `src/services/api/supabaseApiClient.ts`

**Output:** `src/services/api/supabaseApiClient.ts`

```ts
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
```

**Verify:** `pnpm typecheck`

---

## Task 0A-4: Create `src/services/api/vilApiClient.ts`

**Output:** `src/services/api/vilApiClient.ts`

```ts
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
```

**Verify:** `pnpm typecheck`

---

## Task 0A-5: Create `src/services/api/index.ts`

**Output:** `src/services/api/index.ts`

```ts
export * from './apiClient'
export * from './types'
```

**Verify:** `pnpm typecheck`

---

## Task 0A-6: Update `src/config/env.schema.ts`

**Output:** Patch `src/config/env.schema.ts`

Tambahkan `VITE_API_BACKEND` ke schema:

```ts
import type { InferOutput } from 'valibot'
import { minLength, object, optional, parse, pipe, string, url } from 'valibot'

const envSchema = object({
  VITE_SUPABASE_URL: pipe(string(), url(), minLength(1)),
  VITE_SUPABASE_ANON_KEY: pipe(string(), minLength(1)),

  VITE_API_BACKEND: optional(string()),
  VITE_SENTRY_DSN: optional(string()),
  VITE_DEV_PASSWORD: optional(string()),
  VITE_VAPID_PUBLIC_KEY: optional(string()),
})

export type AppEnv = InferOutput<typeof envSchema>

export function validateEnv(): AppEnv {
  try {
    return parse(envSchema, {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_API_BACKEND: import.meta.env.VITE_API_BACKEND,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_DEV_PASSWORD: import.meta.env.VITE_DEV_PASSWORD,
      VITE_VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    })
  } catch {
    const root = document.getElementById('root')
    if (root) {
      root.textContent = ''
      const wrapper = document.createElement('div')
      wrapper.style.padding = '2rem'
      wrapper.style.fontFamily = 'monospace'
      wrapper.style.color = '#b91c1c'
      const h1 = document.createElement('h1')
      h1.textContent = 'Konfigurasi Bermasalah'
      const p1 = document.createElement('p')
      p1.textContent = 'Variabel environment belum lengkap. Cek '
      const code = document.createElement('code')
      code.textContent = '.env.example'
      p1.appendChild(code)
      p1.appendChild(document.createTextNode('.'))
      wrapper.appendChild(h1)
      wrapper.appendChild(p1)
      root.appendChild(wrapper)
    }
    throw new Error('ENV_VALIDATION_FAILED')
  }
}
```

**Verify:** `pnpm typecheck`

---

## Task 0A-7: Update `src/main.tsx`

**Output:** Patch `src/main.tsx`

Tambahkan initApiClient setelah validateEnv:

```ts
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { AppProviders } from './app/providers'
import { validateEnv } from './config/env.schema'
import { normalizeLegacyHashUrl, sanitizeRedirectTarget } from './features/auth/utils/authFlow'
import { useToast } from './hooks/useToast'
import { initApiClient } from './services/api'
import { initSentry } from './utils/sentry'
import { reportWebVitals } from './utils/webVitals'

const env = validateEnv()
const apiBackend = env.VITE_API_BACKEND === 'vil' ? 'vil' : 'supabase'

initApiClient(apiBackend)
initSentry()

// ... rest of main.tsx unchanged
```

**Verify:** `pnpm typecheck && pnpm lint`

---

## Task 0A-8: Refactor `src/features/courses/api/courseService.ts` (POC)

**Output:** Patch `src/features/courses/api/courseService.ts`

Ganti import dan usage:

```ts
// SEBELUM
import { supabase } from '@/services/supabase/client'
const { data } = await supabase.from('courses').select('*')

// SESUDAH
import { getApiClient } from '@/services/api'
const db = getApiClient()
const { data } = await db.from('courses').select('*')
```

Ganti seluruh file dengan implementasi yang sudah menggunakan `getApiClient()`. Lihat source code lengkap di repo untuk method-method yang ada: `fetchCourses`, `getCourseById`, `createCourse`, `updateCourse`, `deleteCourse`, `getCourseModulesWithLessons`, `getTeacherName`, `checkEnrollment`.

**Verify:**

```bash
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/courses/api/courseService.ts
# Expected: 0 results
```

---

## Task 0A-9: Document Routing Compatibility

**Output:** `docs/migration/ROUTING_COMPATIBILITY_DECISION.md`

```md
# Routing Compatibility Decision — Phase 0A

## Status

LOCKED for Phase 0A

## Active Routing Reality

- Frontend aktif memakai **path-based routing**: `/app/`
- App.tsx uses BrowserRouter (NOT HashRouter)
- Hash routing adalah LEGACY dari old Supabase auth flow - perlu di-migrate
- Phase 0A TIDAK mengubah routing frontend (sudah path-based)
- API abstraction harus netral terhadap mode routing

## Decision

- Semua task 0A berjalan di atas path-based routing yang sudah ada
- Hash routing adalah legacy yang sudah tidak digunakan

## Done

- [x] Path-based routing acknowledged as current truth (BrowserRouter)
- [x] Hash routing identified as legacy (from old Supabase auth)
- [x] Migration does NOT need to preserve hash routing
```

---

## Task 0A-10: CI Workflow Verification

**Output:** `docs/migration/CI_WORKFLOW_VERIFICATION.md`

```md
# CI Workflow Verification — Phase 0A

## Goal

Memverifikasi bahwa `.github/workflows/ci.yml` valid secara struktur.

## Checks

- [ ] Job `quality` punya `steps:` yang valid
- [ ] Step build / smoke / coverage berada di nesting YAML yang benar
- [ ] Workflow bisa dijalankan tanpa syntax failure

## Status

PENDING — harus diverifikasi manual oleh agent
```

---

## Task 0A-11: Run Full Verification

**Output:** None (verification only)

```bash
# 1. Typecheck
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Unit tests
pnpm test:ci

# 4. Verify courseService clean
grep -rn "from '@/services/supabase/client'" src/features/courses/api/courseService.ts
# Expected: 0 results

# 5. Verify abstraction layer uses supabase
grep -rn "from '@/services/supabase/client'" src/services/api/
# Expected: 1 result (supabaseApiClient.ts)

# 6. Build
pnpm build
```

**Success Criteria:**

- ✅ `pnpm typecheck` = 0 errors
- ✅ `pnpm lint` = no new errors
- ✅ `pnpm test:ci` = all tests pass
- ✅ `courseService.ts` has 0 direct supabase imports
- ✅ `pnpm build` succeeds

---

## Important Rules

### Rule 1: No Top-Level getApiClient()

Jangan buat `const db = getApiClient()` di top-level module.
Selalu panggil **di dalam function**.

### Rule 2: Abstraction Layer Stays Thin

Jangan import `@supabase/supabase-js` langsung dari `src/services/api/*`.
Abstraction layer membungkus singleton yang sudah ada di `src/services/supabase/client.ts`.

### Rule 3: DO NOT TOUCH

- `src/features/auth/*`
- realtime hooks
- storage services
- offline queue
- Phase 1 scaffold

---

## Definition of Done 0A (PR-1)

PR dianggap benar kalau:

- `src/services/api/*` ada (5 files)
- `main.tsx` sudah init abstraction client
- `courseService` sudah pakai `getApiClient()`
- build/test/lint/typecheck hijau
- tidak ada file auth/realtime/storage yang berubah

---

## File Inventory

| Task  | Output                                              | Status                     |
| ----- | --------------------------------------------------- | -------------------------- |
| 0A-1  | `src/services/api/types.ts`                         | ⬜                         |
| 0A-2  | `src/services/api/apiClient.ts`                     | ⬜                         |
| 0A-3  | `src/services/api/supabaseApiClient.ts`             | ⬜                         |
| 0A-4  | `src/services/api/vilApiClient.ts`                  | ⬜                         |
| 0A-5  | `src/services/api/index.ts`                         | ⬜                         |
| 0A-6  | `src/config/env.schema.ts` (patch)                  | ⬜                         |
| 0A-7  | `src/main.tsx` (patch)                              | ⬜                         |
| 0A-8  | `src/features/courses/api/courseService.ts` (patch) | ⬜                         |
| 0A-9  | `docs/migration/ROUTING_COMPATIBILITY_DECISION.md`  | ⏸ N/A (path-based already) |
| 0A-10 | `docs/migration/CI_WORKFLOW_VERIFICATION.md`        | ⬜                         |
| 0A-11 | Full verification                                   | ⬜                         |
