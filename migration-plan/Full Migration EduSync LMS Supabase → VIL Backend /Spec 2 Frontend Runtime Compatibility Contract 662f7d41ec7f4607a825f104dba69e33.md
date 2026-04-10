# Spec 2: Frontend Runtime Compatibility Contract

<aside>
🔄

**WAJIB BACA sebelum Phase 0 refactor dan Phase 2 cutover.** Dokumen ini mendefinisikan bagaimana frontend EduSync benar-benar bekerja di runtime — injection pattern, query layer, cutover granularity, dan vertical slice definition. Tanpa ini, agent akan membuat "false progress" yang pecah di production.

</aside>

---

# 1. API Client Injection: Final Architecture Decision

<aside>
✅

**KEPUTUSAN FINAL:** Module-level singleton `getApiClient()` / `setApiClient()`. BUKAN React Context, BUKAN hook injection. Sudah di-apply di Wave 1.

</aside>

## Kenapa Bukan React Context

EduSync service layer terdiri dari **plain objects dan functions** (bukan hooks):

```tsx
// courseService.ts — ini BUKAN hook, tidak bisa pakai useContext()
export const courseService = {
  async fetchCourses(tenantId, options) { ... }
}

// courseQueries.ts — ini HOOK yang memanggil courseService
export function useCourses(tenantId) {
  return useQuery({
    queryKey: courseKeys.all(tenantId),
    queryFn: () => courseService.fetchCourses(tenantId, {}),
  })
}
```

Karena service files tidak bisa akses React context, satu-satunya cara yang benar adalah singleton:

```tsx
import { getApiClient } from '@/services/api'
const db = getApiClient() // Works di hooks DAN service files
```

## Initialization

```tsx
// main.tsx — sebelum createRoot
import { setApiClient } from '@/services/api'
const apiBackend = import.meta.env.VITE_API_BACKEND ?? 'supabase'
if (apiBackend === 'vil') {
  setApiClient(createVilApiClient(import.meta.env.VITE_API_URL), 'vil')
} else {
  setApiClient(createSupabaseApiClient(), 'supabase')
}
```

---

# 2. Vertical Slice Definition: What "Module Refactored" Really Means

Phase 0 success criteria bukan "1 service file refactored". Untuk courses module, **semua layer berikut** harus berhasil:

## 2.1 Course Module Full Stack

| Layer                 | File(s)                                                         | Dependency              | Refactor Scope                                            |
| --------------------- | --------------------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| **Service**           | `courseService.ts`                                              | `getApiClient()`        | Replace `supabase.from()` → `getApiClient().from()`       |
| **Template Service**  | `templateService.ts`                                            | `getApiClient()`        | Import/export templates                                   |
| **Version Service**   | `versionService.ts`                                             | `getApiClient()`        | Version history, snapshot, restore, diff                  |
| **Query Key Factory** | `courseKeys.ts`                                                 | Pure (no Supabase)      | Already tenant-scoped — verify unchanged                  |
| **Query Hooks**       | `courseQueries.ts`                                              | Calls `courseService`   | Verify `useCourses`, `useInfiniteCoursesQuery` still work |
| **Enrollment Count**  | `useCourseEnrollmentCount.ts`                                   | Calls service           | Verify                                                    |
| **Version Queries**   | `useCourseVersions.ts`                                          | Calls `versionService`  | Verify                                                    |
| **Template Queries**  | `useTemplates.ts`                                               | Calls `templateService` | Verify                                                    |
| **Hooks**             | `useCourse.ts`, `useCourseReadiness.ts`, `useCourseSettings.ts` | Calls queries           | Verify composition                                        |

## 2.2 Vertical Slice Success Criteria

For ANY module to be considered "refactored":

- [ ] Service file uses `getApiClient()` (zero direct Supabase imports)
- [ ] All query hooks still return same data shapes
- [ ] React Query key invalidation patterns unchanged
- [ ] Optimistic updates still work (rollback on error)
- [ ] Error shape from API matches `{ code, message, details, hint }`
- [ ] Tenant-scoped cache behavior preserved
- [ ] `staleTime` / `refetchInterval` unchanged
- [ ] E2E test for the feature passes

## 2.3 Phase 0 POC: Full Course Vertical Slice

**Bukan** "refactor courseService.ts", tapi:

1. Refactor `courseService.ts` → `getApiClient()`
2. Refactor `templateService.ts` → `getApiClient()`
3. Refactor `versionService.ts` → `getApiClient()`
4. Verify `courseKeys.ts` unchanged
5. Run `useCourses` hook → same data
6. Run `useInfiniteCoursesQuery` → same pagination
7. Test optimistic update on course edit
8. Test error handling on failed create
9. Verify tenant isolation (user A cannot see user B courses)
10. E2E: `pnpm test:e2e -- --grep courses`

---

# 3. Flow Cutover Matrix

Per-feature flag is too coarse. EduSync needs **per-flow** cutover because a single user interaction touches multiple backend surfaces.

## 3.1 Auth Flow

| Interaction                     | Read/Write | Backend | Rollback Unit  |
| ------------------------------- | ---------- | ------- | -------------- |
| Login (email+pw)                | Write      | VIL     | auth.login     |
| Login (Google OAuth)            | Write      | VIL     | auth.oauth     |
| Token refresh                   | Write      | VIL     | auth.refresh   |
| Bootstrap (profile+memberships) | Read       | VIL     | auth.bootstrap |
| MFA enroll/verify               | Write      | VIL     | auth.mfa       |
| SignOut                         | Write      | VIL     | auth.signout   |

**Rollback strategy:** All-or-nothing for auth. If ANY auth flow fails → revert entire auth to Supabase.

## 3.2 Quiz Attempt Flow

| Interaction            | Read/Write   | Backend         | Rollback Unit                 |
| ---------------------- | ------------ | --------------- | ----------------------------- |
| Load quiz data         | Read         | VIL             | [quiz.read](http://quiz.read) |
| Start attempt          | Write        | VIL             | quiz.write                    |
| Autosave answers (30s) | Write        | VIL or Supabase | quiz.autosave                 |
| Submit attempt         | Write        | VIL             | quiz.submit                   |
| Grade (background)     | Async worker | VIL internal    | quiz.grading                  |
| Notification (graded)  | Async fanout | VIL or Supabase | notification                  |
| Gradebook update       | Write        | VIL or Supabase | gradebook                     |

**Rollback strategy:** Read and write can be cutover independently. Autosave can stay on Supabase while submit moves to VIL.

## 3.3 Course Builder Flow

| Interaction            | Read/Write | Backend | Rollback Unit                       |
| ---------------------- | ---------- | ------- | ----------------------------------- |
| Load course + modules  | Read       | VIL     | [builder.read](http://builder.read) |
| Save module/lesson     | Write      | VIL     | builder.write                       |
| Collaborative presence | Realtime   | VIL WS  | builder.realtime                    |
| Content broadcast      | Realtime   | VIL WS  | builder.realtime                    |
| Audit log              | Write      | VIL     | builder.audit                       |

**Rollback strategy:** Read/write independent. Realtime can stay on Supabase while CRUD moves to VIL.

## 3.4 Assignment Submission Flow

| Interaction         | Read/Write | Backend  | Rollback Unit                                   |
| ------------------- | ---------- | -------- | ----------------------------------------------- |
| Load assignment     | Read       | VIL      | [assignment.read](http://assignment.read)       |
| Upload file         | Storage    | S3/MinIO | [assignment.storage](http://assignment.storage) |
| Submit              | Write      | VIL      | assignment.submit                               |
| Grade (SpeedGrader) | Write      | VIL      | assignment.grade                                |

## 3.5 Notification Flow

| Interaction               | Read/Write   | Backend            | Rollback Unit                                 |
| ------------------------- | ------------ | ------------------ | --------------------------------------------- |
| Fetch notifications       | Read         | VIL                | [notification.read](http://notification.read) |
| Mark as read              | Write        | VIL                | notification.write                            |
| Realtime new notification | Realtime     | VIL WS / pg_notify | notification.realtime                         |
| Email digest (scheduled)  | Cron worker  | VIL cron           | notification.digest                           |
| Push notification         | Async worker | VIL internal       | notification.push                             |

## 3.6 Analytics / Dashboard Flow

| Interaction               | Read/Write | Backend            | Rollback Unit  |
| ------------------------- | ---------- | ------------------ | -------------- |
| Executive overview        | Read (RPC) | Keep in PostgreSQL | analytics.rpc  |
| Teacher dashboard         | Read (RPC) | Keep in PostgreSQL | analytics.rpc  |
| Student progress          | Read (RPC) | Keep in PostgreSQL | analytics.rpc  |
| Materialized view refresh | Cron       | VIL cron           | analytics.cron |

**Strategy:** Analytics RPCs stay as stored procedures. VIL calls them via `sqlx`. Cron refresh moves to VIL.

## 3.7 Parent Messaging Flow

| Interaction      | Read/Write | Backend      | Rollback Unit                           |
| ---------------- | ---------- | ------------ | --------------------------------------- |
| Load messages    | Read       | VIL          | [messaging.read](http://messaging.read) |
| Send message     | Write      | VIL          | messaging.write                         |
| Realtime updates | Realtime   | VIL WS       | messaging.realtime                      |
| WhatsApp OTP     | Async      | VIL internal | messaging.whatsapp                      |

---

# 4. React Query Parity Checklist

Every feature module cutover must verify:

## 4.1 Key Factories

- [ ] Key factories are tenant-scoped (e.g., `courseKeys.all(tenantId)`)
- [ ] Key structure unchanged after refactor
- [ ] No hardcoded Supabase-specific cache keys

## 4.2 Invalidation Patterns

- [ ] Mutation → invalidation mapping documented per feature
- [ ] `queryClient.invalidateQueries()` calls use same key patterns
- [ ] Cross-feature invalidation (e.g., quiz submit → invalidate gradebook) still works

## 4.3 Optimistic Updates

- [ ] `onMutate` → `onError` rollback path tested
- [ ] Rollback data shape matches new API response
- [ ] No stale cache from mixed Supabase/VIL responses

## 4.4 Timing

- [ ] `staleTime` values unchanged
- [ ] `refetchInterval` values unchanged
- [ ] `refetchOnWindowFocus` behavior unchanged
- [ ] Hybrid refresh (polling + realtime) consistent

---

# 5. Error Shape Compatibility

All VIL endpoints must return errors in this format:

```tsx
// PostgREST-compatible error shape
interface ApiError {
  code: string // e.g., 'PGRST116', '23505', 'invalid_request'
  message: string // Human-readable
  details: string | null
  hint: string | null
}

// HTTP status codes must match Supabase patterns:
// 400 = validation error
// 401 = unauthorized
// 403 = forbidden (RLS/RBAC)
// 404 = not found
// 409 = conflict (unique violation)
// 422 = unprocessable (business logic)
// 429 = rate limited
// 500 = internal error
```

Frontend `handleSupabaseError()` in `supabaseUtils.ts` pattern-matches on `code` and `message`. If shape changes, **error toasts break silently**.

---

# 6. Security Readiness Checklist (Before Gate 2)

| Security Layer          | VIL Built-in             | Status              | Gate   |
| ----------------------- | ------------------------ | ------------------- | ------ |
| JWT auth                | `JwtAuth`                | ✅ In plan          | Gate 2 |
| Password hashing (dual) | Argon2 + bcrypt fallback | ✅ In plan          | Gate 2 |
| RBAC (5 roles)          | `RbacPolicy`             | ✅ In plan          | Gate 2 |
| Tenant isolation        | `TenantGuard` middleware | ✅ In plan          | Gate 2 |
| Rate limiting           | `RateLimit`              | ✅ In plan (Wave 1) | Gate 2 |
| Brute force protection  | `BruteForceProtection`   | ✅ In plan (Wave 1) | Gate 2 |
| CSRF protection         | `CsrfProtection`         | ✅ In plan (Wave 1) | Gate 2 |
| Request validation      | `Valid<T>`               | ⬜ Wave 2           | Gate 3 |
| Idempotency             | `IdempotencyStore`       | ⬜ Wave 2           | Gate 3 |
| Audit logging           | `AuditLog`               | ⬜ Wave 2           | Gate 3 |
| Error response shape    | PostgREST-compatible     | ✅ In plan          | Gate 2 |
| CORS                    | Custom middleware        | ✅ In plan          | Gate 2 |
| CSP headers             | Frontend update          | ✅ In plan          | Gate 2 |

---

# 7. Phase 0 Revised Success Criteria

Old definition: "117+ files use ApiClient, zero Supabase imports in features/"

New definition (compatibility-led):

- [ ] **Singleton pattern works:** `getApiClient()` callable from hooks AND service files
- [ ] **Full vertical slice courses:** all 10+ files in courses module refactored + verified
- [ ] **Query layer intact:** React Query hooks return identical data shapes
- [ ] **Invalidation intact:** mutation → invalidation mapping verified for courses
- [ ] **Error shape contract:** errors from abstraction layer match PostgREST format
- [ ] **Tenant scoping:** cache keys still tenant-scoped, no cross-tenant leaks
- [ ] **Zero Supabase imports:** in features/, contexts/, utils/, components/
- [ ] **CI guard active:** ESLint `no-restricted-imports` on error (not warn)
- [ ] **E2E pass:** all 51 Playwright tests
- [ ] **Behavioral parity:** `VITE_API_BACKEND=supabase` functionally identical to pre-refactor
