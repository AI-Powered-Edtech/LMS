# Agent Task Queue — Phase 0A Week 1 (Kode Siap Copas)

<aside>
🤖

**Untuk AI Coding Agents.** Setiap task di bawah adalah **self-contained** — agent tinggal copas kode dan execute. Task harus dikerjakan **berurutan** (ada dependency). Setiap task punya:

- **Input:** File yang harus dibaca dulu
- **Output:** File yang harus dibuat/diubah
- **Code:** Kode lengkap siap copas
- **Verify:** Command untuk verifikasi
</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Semua komponen** harus punya `dark:` Tailwind variants
5. Jalankan `pnpm typecheck && pnpm lint` setelah setiap task
6. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
7. **Test file wajib di-update** — jika ada `*.test.ts` / `*.spec.ts` untuk file yang di-refactor, update mock dari `vi.mock('@/services/supabase/client')` → `vi.mock('@/services/api')`. Jalankan `pnpm vitest run --reporter=verbose -- <pattern>` untuk scoped test.
8. **Rollback rule** — Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 0A-XX"`. Jika BLOCKED di tengah: `git checkout -- <files>` untuk revert. JANGAN lanjut ke task berikutnya dengan state setengah jadi.
9. **Git branch:** Semua Week 1 tasks di branch `refactor/phase-0a-week1`. Merge ke `main` setelah Task 0A-9 DONE.

<aside>
📝

**Source of Truth:** Semua keputusan di halaman ini tunduk pada **6 Execution Contracts** di [Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](../Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20%20ace54d0159584b0c8330eaad52e6e05b.md). Jika ada konflik antara task queue ini dan contracts → contracts menang. Contract yang berlaku untuk Phase 0A:

- **Contract 1** (Routing): path-based, bukan hash. OAuth callback = `/auth/callback`.
- **Contract 3** (Frontend Runtime): `getApiClient()` singleton, error shape PostgREST, React Query parity.
- **Contract 4** (Offline Delivery): `offlineQueue.ts` HARUS pakai `getApiClient()` sebelum Phase 0 selesai.
</aside>

---

## Task 0A-1: Buat Type Definitions

**Dependency:** Tidak ada

**Input:** Baca `src/services/supabase/client.ts` untuk memahami current client

**Output:** Buat file baru `src/services/api/types.ts`

```tsx
// src/services/api/types.ts
// =============================================================================
// API Abstraction Layer — Type Definitions
// =============================================================================
// Tipe-tipe ini HARUS match dengan pattern Supabase PostgREST.
// Jangan ubah shape — 117+ files depend on format ini.
// =============================================================================

/** Result wrapper for single-row queries */
export interface QueryResult<T> {
  data: T | null
  error: PostgrestError | null
  count?: number | null
}

/** Result wrapper for multi-row queries */
export interface QueryArrayResult<T> {
  data: T[] | null
  error: PostgrestError | null
  count?: number | null
}

/** Postgrest-compatible error shape (frontend depends on this) */
export interface PostgrestError {
  message: string
  details: string | null
  hint: string | null
  code: string
}

/** Options for .select() */
export interface SelectOptions {
  count?: 'exact' | 'planned' | 'estimated'
  head?: boolean
}

/** Options for .insert() */
export interface InsertOptions {
  count?: 'exact' | 'planned' | 'estimated'
  defaultToNull?: boolean
}

/** Storage upload result */
export interface StorageUploadResult {
  path: string
  id?: string
  fullPath?: string
}

/** Storage error */
export interface StorageError {
  message: string
  statusCode?: string
}

/** Storage upload response */
export interface StorageUploadResponse {
  data: StorageUploadResult | null
  error: StorageError | null
}

/** Storage remove response */
export interface StorageRemoveResponse {
  data: unknown[] | null
  error: StorageError | null
}

/** Realtime channel config */
export interface RealtimeChannelConfig {
  type: 'broadcast' | 'postgres_changes' | 'presence'
  event?: string
  schema?: string
  table?: string
  filter?: string
}

/** Realtime subscription */
export interface RealtimeSubscription {
  on(
    type: string,
    config: Record<string, unknown>,
    handler: (payload: unknown) => void
  ): RealtimeSubscription
  subscribe(callback?: (status: string) => void): RealtimeSubscription
  unsubscribe(): void
  send(payload: { type: string; event: string; payload: unknown }): Promise<void>
  track(state: Record<string, unknown>): Promise<void>
  untrack(): Promise<void>
}

/** Backend type for feature flag */
export type ApiBackend = 'supabase' | 'vil'
```

**Verify:**

```
pnpm typecheck
```

---

## Task 0A-2: Buat ApiClient Interface + Singleton

**Dependency:** Task 0A-1

**Input:** Baca `src/services/api/types.ts` (baru dibuat)

**Output:** Buat file baru `src/services/api/apiClient.ts`

<aside>
💡

**PENTING (dari Gap Analysis #10):** Service files seperti `courseService.ts` adalah plain objects, BUKAN React hooks. Mereka tidak bisa pakai `useContext()`. Jadi kita pakai **module-level singleton** pattern, bukan React Context.

</aside>

```tsx
// src/services/api/apiClient.ts
// =============================================================================
// API Client Interface + Singleton
// =============================================================================
// ARCHITECTURE DECISION: Module-level singleton, BUKAN React Context.
// Alasan: 48 feature modules punya service files yang plain functions
// (bukan hooks), jadi tidak bisa pakai useContext().
//
// Pattern:
//   import { getApiClient } from '@/services/api/apiClient'
//   const db = getApiClient()
//   const { data } = await db.from('courses').select('*').eq('tenant_id', tid)
// =============================================================================

import type {
  ApiBackend,
  PostgrestError,
  QueryResult,
  RealtimeSubscription,
  SelectOptions,
  StorageUploadResponse,
  StorageRemoveResponse,
} from './types'

// ---------------------------------------------------------------------------
// Query Builder interface (matches Supabase PostgREST fluent API)
// ---------------------------------------------------------------------------

export interface QueryBuilder<T> {
  select(columns?: string, options?: SelectOptions): QueryBuilder<T>
  insert(values: Partial<T> | Partial<T>[], options?: Record<string, unknown>): QueryBuilder<T>
  update(values: Partial<T>): QueryBuilder<T>
  upsert(values: Partial<T> | Partial<T>[], options?: Record<string, unknown>): QueryBuilder<T>
  delete(): QueryBuilder<T>

  // Filters
  eq(column: string, value: unknown): QueryBuilder<T>
  neq(column: string, value: unknown): QueryBuilder<T>
  gt(column: string, value: unknown): QueryBuilder<T>
  gte(column: string, value: unknown): QueryBuilder<T>
  lt(column: string, value: unknown): QueryBuilder<T>
  lte(column: string, value: unknown): QueryBuilder<T>
  like(column: string, pattern: string): QueryBuilder<T>
  ilike(column: string, pattern: string): QueryBuilder<T>
  is(column: string, value: null | boolean): QueryBuilder<T>
  in(column: string, values: unknown[]): QueryBuilder<T>
  contains(column: string, value: unknown): QueryBuilder<T>
  or(filters: string, options?: { foreignTable?: string }): QueryBuilder<T>
  not(column: string, operator: string, value: unknown): QueryBuilder<T>
  filter(column: string, operator: string, value: unknown): QueryBuilder<T>
  match(query: Record<string, unknown>): QueryBuilder<T>

  // Modifiers
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): QueryBuilder<T>
  limit(count: number): QueryBuilder<T>
  range(from: number, to: number): QueryBuilder<T>
  single(): PromiseLike<QueryResult<T>>
  maybeSingle(): PromiseLike<QueryResult<T | null>>

  // Execute (returns array)
  then<TResult>(
    onfulfilled?: (value: {
      data: T[] | null
      error: PostgrestError | null
      count?: number | null
    }) => TResult
  ): PromiseLike<TResult>
}

// ---------------------------------------------------------------------------
// Storage Client interface
// ---------------------------------------------------------------------------

export interface StorageBucketClient {
  upload(
    path: string,
    file: File | Blob | ArrayBuffer,
    options?: Record<string, unknown>
  ): Promise<StorageUploadResponse>
  download(path: string): Promise<{ data: Blob | null; error: unknown }>
  remove(paths: string[]): Promise<StorageRemoveResponse>
  getPublicUrl(path: string): { data: { publicUrl: string } }
  createSignedUrl(
    path: string,
    expiresIn: number
  ): Promise<{ data: { signedUrl: string } | null; error: unknown }>
}

export interface StorageClient {
  from(bucket: string): StorageBucketClient
}

// ---------------------------------------------------------------------------
// Main ApiClient interface
// ---------------------------------------------------------------------------

export interface ApiClient {
  /** PostgREST-style table query builder */
  from<T = Record<string, unknown>>(table: string): QueryBuilder<T>

  /** Call a PostgreSQL RPC function */
  rpc<T = unknown>(
    fn: string,
    params?: Record<string, unknown>,
    options?: Record<string, unknown>
  ): PromiseLike<QueryResult<T>>

  /** Storage client */
  storage: StorageClient

  /** Realtime channel */
  channel(name: string, options?: Record<string, unknown>): RealtimeSubscription

  /** Remove a realtime channel */
  removeChannel(channel: RealtimeSubscription): Promise<void>

  /** Invoke an Edge Function (Supabase) or VIL service endpoint */
  functions: {
    invoke<T = unknown>(
      name: string,
      options?: { body?: unknown; headers?: Record<string, string> }
    ): Promise<{ data: T | null; error: unknown }>
  }
}

// ---------------------------------------------------------------------------
// Singleton management
// ---------------------------------------------------------------------------

let _apiClient: ApiClient | null = null
let _backend: ApiBackend = 'supabase'

/**
 * Set the active API client. Called once at app startup in main.tsx.
 * @example
 * // In main.tsx or ApiProvider:
 * import { setApiClient } from '@/services/api/apiClient'
 * import { createSupabaseApiClient } from '@/services/api/supabaseApiClient'
 * setApiClient(createSupabaseApiClient())
 */
export function setApiClient(client: ApiClient, backend: ApiBackend = 'supabase'): void {
  _apiClient = client
  _backend = backend
}

/**
 * Get the active API client. Used by all service files.
 * @example
 * import { getApiClient } from '@/services/api/apiClient'
 * const db = getApiClient()
 * const { data } = await db.from('courses').select('id, title').eq('tenant_id', tid)
 */
export function getApiClient(): ApiClient {
  if (!_apiClient) {
    throw new Error(
      '[ApiClient] Client not initialized. Call setApiClient() in main.tsx before any API calls.'
    )
  }
  return _apiClient
}

/** Get the current backend type */
export function getApiBackend(): ApiBackend {
  return _backend
}
```

**Verify:**

```
pnpm typecheck
```

---

## Task 0A-3: Buat Supabase Implementation

**Dependency:** Task 0A-2

**Input:** Baca `src/services/supabase/client.ts` dan `src/services/api/apiClient.ts`

**Output:** Buat file baru `src/services/api/supabaseApiClient.ts`

```tsx
// src/services/api/supabaseApiClient.ts
// =============================================================================
// Supabase Implementation of ApiClient
// =============================================================================
// Ini THIN WRAPPER — hanya delegate ke supabase client yang sudah ada.
// Tidak ada logic baru. Tujuannya agar service files bisa di-switch
// ke VIL tanpa ubah code mereka.
// =============================================================================

import { supabase } from '@/services/supabase/client'

import type { ApiClient } from './apiClient'

/**
 * Create a Supabase-backed ApiClient.
 * Supabase client sudah implements semua method yang kita butuhkan,
 * jadi ini literally just returns the supabase client as ApiClient.
 */
export function createSupabaseApiClient(): ApiClient {
  // Supabase client already matches our ApiClient interface almost exactly.
  // We cast it because the types aren't 100% identical but behavior is.
  return supabase as unknown as ApiClient
}
```

**Verify:**

```
pnpm typecheck
```

---

## Task 0A-4: Buat VIL Stub Implementation

**Dependency:** Task 0A-2

**Input:** Baca `src/services/api/apiClient.ts`

**Output:** Buat file baru `src/services/api/vilApiClient.ts`

```tsx
// src/services/api/vilApiClient.ts
// =============================================================================
// VIL (Rust Backend) Implementation Stub
// =============================================================================
// Semua method throw 'Not implemented' untuk saat ini.
// Akan diisi saat Phase 1-2 ketika VIL endpoints tersedia.
// =============================================================================

import type { ApiClient } from './apiClient'

const NOT_IMPL = (method: string) => {
  throw new Error(`[VIL] ${method} not yet implemented. VIL backend is not available.`)
}

/**
 * Create a VIL-backed ApiClient stub.
 * Currently throws on all methods — will be implemented incrementally.
 */
export function createVilApiClient(_baseUrl: string): ApiClient {
  return {
    from() {
      return NOT_IMPL('from') as never
    },
    rpc() {
      return NOT_IMPL('rpc') as never
    },
    storage: {
      from() {
        return NOT_IMPL('storage.from') as never
      },
    },
    channel() {
      return NOT_IMPL('channel') as never
    },
    removeChannel() {
      return NOT_IMPL('removeChannel') as never
    },
    functions: {
      invoke() {
        return NOT_IMPL('functions.invoke') as never
      },
    },
  }
}
```

**Verify:**

```
pnpm typecheck
```

---

## Task 0A-5: Buat Barrel Export

**Dependency:** Task 0A-1 sampai 0A-4

**Output:** Buat file baru `src/services/api/index.ts`

```tsx
// src/services/api/index.ts
export type { ApiClient, QueryBuilder, StorageClient, StorageBucketClient } from './apiClient'
export { getApiClient, setApiClient, getApiBackend } from './apiClient'
export { createSupabaseApiClient } from './supabaseApiClient'
export { createVilApiClient } from './vilApiClient'
export type {
  ApiBackend,
  PostgrestError,
  QueryResult,
  QueryArrayResult,
  SelectOptions,
  RealtimeChannelConfig,
  RealtimeSubscription,
  StorageUploadResult,
  StorageUploadResponse,
  StorageRemoveResponse,
} from './types'
```

**Verify:**

```
pnpm typecheck
```

---

## Task 0A-6: Initialize ApiClient di main.tsx

**Dependency:** Task 0A-5

**Input:** Baca `src/main.tsx`

**Output:** Edit `src/main.tsx` — tambahkan initialization SEBELUM `createRoot`

**Instruksi:** Tambahkan baris berikut SETELAH `validateEnv()` dan SEBELUM `const legacyHashPath`:

```tsx
// === TAMBAHKAN BARIS INI ===
import { setApiClient } from '@/services/api'
import { createSupabaseApiClient } from '@/services/api/supabaseApiClient'
import { createVilApiClient } from '@/services/api/vilApiClient'

// Initialize API client based on feature flag
const apiBackend = (import.meta.env.VITE_API_BACKEND as 'supabase' | 'vil') ?? 'supabase'
if (apiBackend === 'vil') {
  setApiClient(createVilApiClient(import.meta.env.VITE_API_URL || 'http://localhost:8080'), 'vil')
} else {
  setApiClient(createSupabaseApiClient(), 'supabase')
}
// === END TAMBAHAN ===
```

**Verify:**

```
pnpm typecheck
pnpm lint
```

---

## Task 0A-7: Tambah env var di vite-env.d.ts

**Dependency:** Tidak ada

**Input:** Baca `src/vite-env.d.ts`

**Output:** Edit `src/vite-env.d.ts` — tambahkan 2 env vars baru

```tsx
// src/vite-env.d.ts — TAMBAHKAN di dalam interface ImportMetaEnv:
  readonly VITE_API_BACKEND?: 'supabase' | 'vil'
  readonly VITE_API_URL?: string
```

**Verify:**

```
pnpm typecheck
```

---

## Task 0A-8: Refactor courseService.ts (POC)

**Dependency:** Task 0A-6

**Input:** Baca `src/features/courses/api/courseService.ts` DAN `src/features/courses/api/courseService.test.ts` (jika ada)

**Output:** Edit `src/features/courses/api/courseService.ts` DAN test file (jika ada)

<aside>
🛠️

**🛠️ FIX Gap #8 (Test files).** Jika `courseService.test.ts` atau `courseService.spec.ts` ada, WAJIB update mock:

`vi.mock('@/services/supabase/client', ...)` → `vi.mock('@/services/api', () => ({ getApiClient: vi.fn().mockReturnValue({ from: vi.fn()... }) }))`

Jalankan: `pnpm vitest run --reporter=verbose -- courseService`

</aside>

**Instruksi:** Ganti import supabase client dengan getApiClient:

```tsx
// SEBELUM (cari baris ini):
import { supabase } from '@/services/supabase/client'

// GANTI DENGAN:
import { getApiClient } from '@/services/api'

// KEMUDIAN di setiap method, ganti 'supabase' dengan 'getApiClient()':
// SEBELUM:
//   const { data, error } = await supabase.from('courses').select(...)
// SESUDAH:
//   const db = getApiClient()
//   const { data, error } = await db.from('courses').select(...)
```

**Pattern untuk setiap method:**

```tsx
// Contoh method fetchCourses:
async fetchCourses(tenantId: string, options: FetchOptions) {
  const db = getApiClient()  // <-- GANTI supabase dengan ini

  let query = db
    .from('courses')
    .select('id, title, description, status, tenant_id, created_by, created_at, updated_at', { count: 'exact' })
    .eq('tenant_id', tenantId)

  if (options.search) {
    query = query.ilike('title', `%${options.search}%`)
  }

  query = query.order('created_at', { ascending: false })

  if (options.page !== undefined && options.limit !== undefined) {
    const from = options.page * options.limit
    const to = from + options.limit - 1
    query = query.range(from, to)
  }

  const { data, error, count } = await query
  // ... rest of method unchanged
}
```

**PENTING:** Ganti **SEMUA** `supabase.from(...)` dan `supabase.rpc(...)` dalam file ini. Jangan ada sisa import `supabase`.

**Verify:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/courses/api/courseService.ts
# Harus return ZERO results
```

---

## Task 0A-9: Verify End-to-End

**Dependency:** Task 0A-8

**Output:** Tidak ada file baru — hanya verifikasi

**Instruksi:**

```
# 1. Typecheck
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Unit tests
pnpm test:ci

# 4. Verify courseService tidak import supabase langsung
grep -rn "from '@/services/supabase/client'" src/features/courses/api/courseService.ts
# Expected: 0 results

# 5. Verify supabase client masih dipakai oleh abstraction layer
grep -rn "from '@/services/supabase/client'" src/services/api/
# Expected: 1 result (supabaseApiClient.ts)

# 6. Build check (memastikan tree-shaking masih work)
pnpm build
```

**Success Criteria:**

- ✅ `pnpm typecheck` = 0 errors
- ✅ `pnpm lint` = no new errors
- ✅ `pnpm test:ci` = all tests pass
- ✅ courseService.ts has 0 direct supabase imports
- ✅ `pnpm build` succeeds
- ✅ App works identically (manual test: login, browse courses)

---

## Catatan untuk Agent Selanjutnya (Week 2+)

Setelah Task 0A-1 sampai 0A-9 selesai, agent berikutnya harus:

1. Refactor service files lain dengan pattern yang SAMA (ganti `supabase` → `getApiClient()`)
2. Urutan prioritas:
   - `lessonService.ts` (simple CRUD)
   - `classroomService.ts` (simple CRUD)
   - `attendanceService.ts` (simple CRUD)
   - `discussionService.ts` (simple CRUD)
   - Lalu services dengan RPC calls
   - Terakhir: `AuthContext.tsx` (paling complex)
3. Setiap agent hanya refactor **1-2 service files** per task
4. Setiap task harus verify: `pnpm typecheck && pnpm lint && pnpm test:ci`
5. Setiap task harus verify: `grep -rn "from '@/services/supabase/client'" <refactored-file>` returns 0
