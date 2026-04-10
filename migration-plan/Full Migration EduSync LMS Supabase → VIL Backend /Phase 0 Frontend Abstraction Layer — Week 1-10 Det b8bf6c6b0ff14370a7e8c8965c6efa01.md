# Phase 0: Frontend Abstraction Layer — Week 1-10 Detail

<aside>
🎯

**Goal:** Decouple React frontend dari Supabase SDK. Setelah phase ini, TIDAK ADA feature module yang import `@supabase/supabase-js` langsung. Semua akses data melalui abstraction layer.

**Duration:** 10 minggu | **Effort:** ~150 jam | **Deliverable:** Zero Supabase imports di `src/features/`

</aside>

---

## Week 1: API Client Abstraction Foundation ✅ (Planned)

**Goal:** Create abstraction layer + courseService.ts sebagai POC

**Effort:** ~15-20 jam

### Day 1: Type Definitions + Interface

**File:** `src/services/api/types.ts`

```tsx
// Query options interface
interface QueryOptions {
  count?: 'exact' | 'planned' | 'mocked' | false
  prefer?: 'representation' | 'headers'
}

interface PaginationOptions {
  page?: number
  limit?: number
}

interface FetchOptions extends PaginationOptions {
  search?: string
  ids?: string[]
  tenantId: string
}

// Query result wrapper (matches Supabase pattern)
interface QueryResult<T> {
  data: T | null
  error: Error | null
  count?: number | null
}

interface InsertResult<T> {
  data: T | null
  error: Error | null
}

interface UpdateResult<T> {
  data: T | null
  error: Error | null
}

interface DeleteResult {
  error: Error | null
}
```

**File:** `src/services/api/apiClient.ts`

```tsx
/**
 * Generic API client interface that abstracts database operations.
 * Can be implemented by Supabase, REST (VIL), or mock backends.
 */
export interface ApiClient {
  // CRUD operations
  query<T>(table: string, options?: QueryOptions): QueryBuilder<T>
  insert<T>(table: string, data: unknown): Promise<InsertResult<T>>
  update<T>(table: string, id: string, data: unknown): Promise<UpdateResult<T>>
  delete(table: string, id: string): Promise<DeleteResult>

  // RPC for stored procedures
  rpc<T>(fn: string, params?: Record<string, unknown>): Promise<QueryResult<T>>

  // Storage (delegated to StorageClient)
  storage: StorageClient

  // Realtime (delegated to RealtimeClient)
  realtime: RealtimeClient
}

/**
 * Query builder interface (fluent API matching Supabase pattern)
 */
export interface QueryBuilder<T> {
  select(columns: string, options?: QueryOptions): QueryBuilder<T>
  eq(column: string, value: unknown): QueryBuilder<T>
  neq(column: string, value: unknown): QueryBuilder<T>
  in(column: string, values: unknown[]): QueryBuilder<T>
  ilike(column: string, pattern: string): QueryBuilder<T>
  gt(column: string, value: unknown): QueryBuilder<T>
  gte(column: string, value: unknown): QueryBuilder<T>
  lt(column: string, value: unknown): QueryBuilder<T>
  lte(column: string, value: unknown): QueryBuilder<T>
  order(column: string, options?: { ascending?: boolean }): QueryBuilder<T>
  range(from: number, to: number): QueryBuilder<T>
  limit(count: number): QueryBuilder<T>
  single(): Promise<QueryResult<T>>
  maybeSingle(): Promise<QueryResult<T>>
  then(resolve: (value: QueryResult<T[]>) => void): void
}
```

### Day 2: Supabase Implementation

**File:** `src/services/api/supabaseApiClient.ts`

```tsx
import { supabase } from '@/services/supabase/client'
import type { ApiClient, QueryBuilder } from './apiClient'

export const supabaseApiClient: ApiClient = {
  query<T>(table: string) {
    // Wrap Supabase PostgREST builder with our interface
    return supabase.from(table) as unknown as QueryBuilder<T>
  },

  async insert<T>(table: string, data: unknown) {
    const result = await supabase
      .from(table)
      .insert(data as Record<string, unknown>)
      .select()
    if (result.error) return { data: null, error: result.error }
    return { data: result.data as T, error: null }
  },

  async update<T>(table: string, id: string, data: unknown) {
    const result = await supabase
      .from(table)
      .update(data as Record<string, unknown>)
      .eq('id', id)
      .select()
    if (result.error) return { data: null, error: result.error }
    return { data: result.data as T, error: null }
  },

  async delete(table: string, id: string) {
    const { error } = await supabase.from(table).delete().eq('id', id)
    return { error }
  },

  async rpc<T>(fn: string, params?: Record<string, unknown>) {
    const result = await supabase.rpc(fn, params ?? {})
    return { data: result.data as T, error: result.error, count: null }
  },

  // Storage & realtime delegated (see Week 6)
  storage: supabaseStorageClient,
  realtime: supabaseRealtimeClient,
}
```

### Day 3: VIL Stub + Provider

**File:** `src/services/api/restApiClient.ts`

```tsx
import type { ApiClient } from './apiClient'

/**
 * VIL/REST backend implementation stub.
 * Throws "not implemented" — filled as endpoints migrate.
 */
export const restApiClient: ApiClient = {
  query() { throw new Error('VIL backend not yet available') },
  insert() { throw new Error('VIL backend not yet available') },
  update() { throw new Error('VIL backend not yet available') },
  delete() { throw new Error('VIL backend not yet available') },
  rpc() { throw new Error('VIL backend not yet available') },
  storage: vilStorageStub,
  realtime: vilRealtimeStub,
}
```

**File:** `src/services/api/apiClient.ts` — **Singleton pattern (BUKAN React Context)**

> ⚠️ **PENTING (dari Gap Analysis #10 & #25):** Service files seperti `courseService.ts` adalah plain objects, BUKAN React hooks. Mereka tidak bisa pakai `useContext()`. Jadi kita pakai **module-level singleton** pattern. Lihat Agent Task Queue Task 0A-2 untuk implementasi lengkap.
> 

```tsx
import { supabaseApiClient } from './supabaseApiClient'
import { restApiClient } from './restApiClient'
import type { ApiClient } from './apiClient'
import type { ApiBackend } from './types'

let _apiClient: ApiClient | null = null
let _backend: ApiBackend = 'supabase'

/**
 * Set the active API client. Called once at app startup in main.tsx.
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

export function getApiBackend(): ApiBackend {
  return _backend
}
```

**Initialization di `main.tsx`** (setelah `validateEnv()`, sebelum `createRoot`):

```tsx
import { setApiClient } from '@/services/api'
import { createSupabaseApiClient } from '@/services/api/supabaseApiClient'
import { createVilApiClient } from '@/services/api/vilApiClient'

const apiBackend = (import.meta.env.VITE_API_BACKEND as 'supabase' | 'vil') ?? 'supabase'
if (apiBackend === 'vil') {
  setApiClient(
    createVilApiClient(import.meta.env.VITE_API_URL || 'http://localhost:8080'),
    'vil'
  )
} else {
  setApiClient(createSupabaseApiClient(), 'supabase')
}
```

### Day 4: Refactor courseService.ts (POC)

**File:** `src/features/courses/api/courseService.ts`

```tsx
// BEFORE
import { supabase } from '@/services/supabase/client'
const { data, error } = await supabase.from('courses').select(...).eq(...).single()

// AFTER (singleton pattern — lihat Task 0A-8 di Agent Task Queue)
import { getApiClient } from '@/services/api'

async fetchCourses(tenantId: string, options: FetchOptions) {
  const db = getApiClient()  // singleton, BUKAN hook
  const { data, error } = await db
    .from('courses')
    .select('id, title, description, status, tenant_id, created_by, created_at, updated_at', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  // ... rest unchanged
}
```

**Verify semua 8 methods:**

| **Method** | **Pattern** | **Complexity** |
| --- | --- | --- |
| fetchCourses | .select().eq().ilike().order().range() | Medium |
| getCourseById | .select().eq().eq().single() | Simple |
| createCourse | .insert().select().single() | Simple |
| updateCourse | .update().eq().eq().select().single() | Simple |
| deleteCourse | .delete().eq().eq() | Simple |
| getCourseModulesWithLessons | .select().eq().eq().order() | Simple |
| getTeacherName | 2 sequential queries | Medium |
| checkEnrollment | .select().eq().eq().eq().eq().maybeSingle() | Simple |

### Day 5: Testing + Documentation

```
pnpm validate          # typecheck + lint + unit tests
pnpm test:e2e          # E2E tests
```

**Behavioral parity checklist:**

- [ ]  fetchCourses returns same data shape
- [ ]  Pagination works correctly
- [ ]  Error handling unchanged
- [ ]  Tenant isolation maintained
- [ ]  `VITE_API_BACKEND=supabase` functionally identical to original

Create `docs/api-abstraction-pattern.md` dengan:

- How to use ApiClient
- How to add new service files
- Migration checklist for remaining services

**Success:** 1 service file refactored, pattern validated, zero regressions.

---

## Week 2: Refactor Simple CRUD Services (8-10 files)

**Goal:** Complete basic CRUD services tanpa RPC

### Day 1-2: Lessons & Modules

| **File** | **Methods** | **RPC** | **Storage** |
| --- | --- | --- | --- |
| `src/features/lessons/api/lessonService.ts` | ~12 | 0 | 0 |
| `src/features/course-builder/api/moduleService.ts` | ~8 | 1 | 0 |
| `src/features/course-builder/api/lessonService.ts` | ~6 | 1 | 0 |

### Day 3-4: Classroom & Attendance

| **File** | **Methods** | **RPC** | **Storage** |
| --- | --- | --- | --- |
| `src/features/classroom/api/classroomService.ts` | ~10 | 0 | 0 |
| `src/features/attendance/api/attendanceService.ts` | ~8 | 0 | 0 |

### Day 5: Testing + Verification

```
pnpm validate
grep -r "from '@/services/supabase/client'" src/features/lessons/ | wc -l  # should be 0
grep -r "from '@/services/supabase/client'" src/features/classroom/ | wc -l  # should be 0
```

**Success:** 18 files refactored total (Week 1-2).

---

## Week 3: Settings, Profile & Discussion Services (6-8 files)

**Goal:** Handle services with moderate complexity

### Day 1-2: Profile & Settings

| **File** | **Methods** | **RPC** |
| --- | --- | --- |
| `src/features/profile/api/profilePreferences.ts` | ~5 | 2 |
| `src/features/settings/api/settingsService.ts` | ~10 | 0 |

### Day 3-4: Discussions & Comments

| **File** | **Methods** | **RPC** |
| --- | --- | --- |
| `src/features/discussions/api/discussionService.ts` | ~8 | 0 |
| `src/features/discussions/api/commentService.ts` | ~6 | 0 |

### Day 5: Announcements & Calendar

| **File** | **Methods** | **RPC** |
| --- | --- | --- |
| `src/features/announcements/api/announcementService.ts` | ~5 | 0 |
| `src/features/calendar/api/calendarService.ts` | ~6 | 0 |
| `src/features/calendar/api/calendarEventService.ts` | ~4 | 0 |

---

## Week 4: Auth Abstraction Layer

**Goal:** Create AuthProvider interface — paling kritis karena `AuthContext.tsx` adalah jantung app

### Day 1-2: Auth Interface Design

**File:** `src/services/auth/AuthProvider.ts`

```tsx
export interface AuthProvider {
  // Session
  getSession(): Promise<Session | null>
  onAuthStateChange(callback: (event: AuthEvent, session: Session | null) => void): Unsubscribe

  // Sign in/up/out
  signIn(email: string, password: string): Promise<AuthResult>
  signUp(email: string, password: string, metadata?: UserMetadata): Promise<AuthResult>
  signInWithOAuth(provider: 'google', options?: OAuthOptions): Promise<void>
  signOut(): Promise<void>

  // Token management
  refreshSession(): Promise<AuthResult>
  getUser(): Promise<User | null>

  // 🆕 MFA (sering terlewat!)
  enrollMFA(factorType: 'totp'): Promise<MFAEnrollResult>
  verifyMFA(factorId: string, code: string): Promise<MFAVerifyResult>
  unenrollMFA(factorId: string): Promise<void>
  listMFAFactors(): Promise<MFAFactor[]>
}
```

### Day 3-4: Implement SupabaseAuthProvider

**File:** `src/services/auth/SupabaseAuthProvider.ts`

```tsx
export class SupabaseAuthProvider implements AuthProvider {
  constructor(private supabase: SupabaseClient) {}

  async getSession() {
    const { data } = await this.supabase.auth.getSession()
    return data.session
  }

  async signIn(email: string, password: string) {
    // GOTCHA: signOut() harus clear React state SEBELUM call supabase.auth.signOut()
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password })
    return { user: data.user, session: data.session, error }
  }

  // ... implement all methods including MFA
}
```

### Day 5: VIL Auth Stub + Integration

**File:** `src/services/auth/VilAuthProvider.ts`

```tsx
export class VilAuthProvider implements AuthProvider {
  constructor(private baseUrl: string) {}
  // All methods throw 'Not implemented' for now
  // Will be filled in Phase 1B
}
```

**Update `AuthContext.tsx`** to use AuthProvider instead of direct `supabase.auth` calls.

⚠️ **Gotchas dari codebase:**

- `signOut()` harus clear React state DULU sebelum call auth signOut (prevent infinite spinner)
- `.test` TLD emails fail GoTrue — gunakan `.dev`
- Role comes from `user_roles` table, BUKAN `profiles.role`

---

## Week 5: Realtime Abstraction (Part 1)

**Goal:** Abstract WebSocket/subscription patterns

### Day 1-2: RealtimeProvider Interface

**File:** `src/services/realtime/RealtimeProvider.ts`

```tsx
export interface RealtimeProvider {
  subscribe(channel: string, config: ChannelConfig): ChannelSubscription
  unsubscribe(channel: string): void
}

export interface ChannelConfig {
  type: 'broadcast' | 'postgres_changes' | 'presence'
  table?: string     // for postgres_changes
  event?: string     // INSERT, UPDATE, DELETE, *
  filter?: string    // e.g. "tenant_id=eq.xxx"
}

export interface ChannelSubscription {
  on(event: string, handler: (payload: unknown) => void): ChannelSubscription
  send(payload: BroadcastPayload): Promise<void>
  track(state: Record<string, unknown>): Promise<void>   // presence
  untrack(): Promise<void>
  unsubscribe(): void
}
```

### Day 3-4: SupabaseRealtimeProvider

```tsx
export class SupabaseRealtimeProvider implements RealtimeProvider {
  subscribe(channel: string, config: ChannelConfig) {
    const ch = this.supabase.channel(channel)
    // Map config to Supabase channel setup
    return new SupabaseChannelSubscription(ch)
  }
}
```

### Day 5: Refactor useBuilderChannel.ts

- Update `src/features/course-builder/useBuilderChannel.ts` to use RealtimeProvider
- Verify collaborative editing still works
- **Catatan:** EduSync sudah minimize WebSocket (polling preference) — abstraction layer harus support both

---

## Week 6: Realtime Part 2 + Storage Abstraction

### Day 1-2: Complete Remaining Realtime Hooks

| **Hook** | **Status** |
| --- | --- |
| `useBuilderChannel.ts` | ✅ Done (Week 5) |
| `useBuilderPresence.ts` | Refactor |
| `useNotifications.ts` | Refactor |
| `useAdminNotifications.ts` | Refactor |
| `useMessages.ts` | Refactor |

### Day 3-4: StorageProvider Interface

**File:** `src/services/storage/StorageProvider.ts`

```tsx
export interface StorageProvider {
  upload(bucket: string, path: string, file: File, options?: UploadOptions): Promise<UploadResult>
  remove(bucket: string, paths: string[]): Promise<void>
  getPublicUrl(bucket: string, path: string): string
  download(bucket: string, path: string): Promise<Blob>
}
```

### Day 5: Refactor Storage Services

| **File** | **Bucket** | **Methods** |
| --- | --- | --- |
| `storageService.ts` | multiple | 3 |
| `videoUploadService.ts` | videos | 4 |
| `videoAssetService.ts` | videos | 3 |

---

## Week 7: RPC-Heavy Services (Batch 1)

**Goal:** Handle services yang pakai stored procedures

### Day 1-2: Onboarding + Dashboards

| **File** | **RPCs** | **Catatan** |
| --- | --- | --- |
| `src/features/onboarding/api/onboardingService.ts` | 2 | Teacher onboarding wizard |
| `src/features/dashboards/api/dashboardService.ts` | 4 | Multiple role dashboards |

### Day 3-4: Course Builder Services

| **File** | **RPCs** |
| --- | --- |
| `src/features/course-builder/api/auditService.ts` | 1 |
| `src/features/course-builder/api/collaboratorService.ts` | 0 |
| `src/features/course-builder/api/builderSyncService.ts` | 0 |

### Day 5: Quizzes Batch 1

| **File** | **RPCs** |
| --- | --- |
| `src/features/quizzes/api/quizBuilderService.ts` | 1 |
| `src/features/quizzes/api/quizCRUD.ts` | 0 |

---

## Week 8: RPC-Heavy Services (Batch 2)

### Day 1-2: Gradebook & Analytics

| **File** | **RPCs** |
| --- | --- |
| `src/features/gradebook/api/gradebookService.ts` | 0 |
| `src/features/gradebook/api/gradebookApi.ts` | 0 |
| `src/features/gradebook/api/annotationApi.ts` | 0 |
| `src/features/analytics/api/analyticsAggregation.ts` | 0 |

### Day 3-4: Gamification & Certificates

| **File** | **RPCs** |
| --- | --- |
| `src/features/gamification/api/gamificationService.ts` | 0 |
| `src/features/gamification/api/leaderboardService.ts` | 1 |
| `src/features/certificates/api/certificateService.ts` | 0 |

### Day 5: More Analytics + xAPI

| **File** | **RPCs** |
| --- | --- |
| `src/features/analytics/api/analyticsService.ts` | 0 |
| `src/features/progress/api/trackingService.ts` | 0 |
| `src/features/xapi/api/xapiService.ts` | 0 |

---

## Week 9: Administration Services

### Day 1-2: User Management

| **File** | **RPCs** |
| --- | --- |
| `src/features/administration/api/adminUserService.ts` | 0 |
| `src/features/administration/api/bulkImportService.ts` | 0 |

### Day 3-4: Finance & Reports

| **File** | **RPCs** | **Catatan** |
| --- | --- | --- |
| `src/features/finance/api/financeApi.ts` | 5 | SPP management |
| `src/features/reports/api/reportService.ts` | 5 | PDF export calls |
| `src/features/administration/api/administrationService.ts` | 1 |  |

### Day 5: Remaining Services

- `src/features/parent/api/parentApi.ts`
- `src/features/principal/api/executiveApi.ts`
- `src/features/surveys/api/surveyApi.ts`
- `src/features/search/api/searchService.ts`
- `src/features/moderation/api/moderationService.ts`

---

## Week 10: Final Verification & Phase 0 Gate Review

### Day 1-2: Complete Remaining Files

Sweep semua files yang masih import Supabase:

```
# Must return 0 results
grep -r "from '@supabase/supabase-js'" src/features/ | wc -l
grep -r "from '@/services/supabase/client'" src/features/ | wc -l
```

### Day 3-4: Full Verification

```
pnpm validate          # typecheck + lint + unit tests (semua pass)
pnpm test:e2e          # E2E tests (semua 51 tests pass)
```

### Day 5: Phase 0 Gate Review

| **Criteria** | **Target** | **Status** |
| --- | --- | --- |
| All 117+ files use ApiClient | 0 direct Supabase imports in features/ | ⬜ |
| All 167 RPC calls abstracted | Via `apiClient.rpc()` | ⬜ |
| All 19 storage operations abstracted | Via `StorageProvider` | ⬜ |
| All 9 realtime subscriptions abstracted | Via `RealtimeProvider` | ⬜ |
| Auth abstracted (incl. MFA) | Via `AuthProvider` | ⬜ |
| `pnpm validate` passes | 0 errors | ⬜ |
| `pnpm test:e2e` passes | 51/51 tests | ⬜ |
| Zero behavioral changes | Parity verified | ⬜ |
| Pattern documented | `docs/api-abstraction-pattern.md` | ⬜ |

<aside>
🚪

**Gate 1 Decision:** Jika abstraction layer causes regressions > 2 minggu → evaluasi ulang scope migrasi. Jika pass → proceed ke Phase 1.

</aside>

---

## Files Created (Phase 0)

```
src/services/api/
├── types.ts              # Type definitions (NEW)
├── apiClient.ts          # Interface + singleton getApiClient/setApiClient (NEW)
├── index.ts              # Barrel export (NEW)
├── supabaseApiClient.ts  # Supabase implementation (NEW)
├── vilApiClient.ts       # VIL stub (NEW)

src/services/auth/
├── AuthProvider.ts        # Auth interface (NEW)
├── SupabaseAuthProvider.ts # Supabase implementation (NEW)
└── VilAuthProvider.ts     # VIL stub (NEW)

src/services/realtime/
├── RealtimeProvider.ts    # Realtime interface (NEW)
└── SupabaseRealtimeProvider.ts # Supabase implementation (NEW)

src/services/storage/
├── StorageProvider.ts     # Storage interface (NEW)
└── SupabaseStorageProvider.ts # Supabase implementation (NEW)
```

## Risk Mitigation

### Risk 1: Type Compatibility

**Issue:** Supabase builder chain returns specific types

**Mitigation:** Use `as unknown as` casting where needed, add strict typing later

### Risk 2: Error Handling Differences

**Issue:** Supabase returns `{ error }` object vs our `{ data, error }` pattern

**Mitigation:** `handleSupabaseError()` di `supabaseUtils.ts` sudah normalize — wrap di abstraction layer

### Risk 3: Performance Regression

**Issue:** Abstraction layer adds overhead

**Mitigation:** Keep abstraction thin, no unnecessary indirection — just interface delegation