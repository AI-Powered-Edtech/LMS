# Task Queue — Wave 0A: API Client Abstraction

**Timeline:** Weeks 1-4 (~40 hours)
**Goal:** Establish `getApiClient()` singleton, refactor service files

## Prerequisites

- [ ] Supabase client already set up at `src/services/supabase/client.ts`
- [ ] Project uses React 19 + Vite + TypeScript
- [ ] `pnpm` available

## Rules

1. **JANGAN** ubah file di luar scope task
2. **Gunakan `pnpm`** — bukan `npm` atau `yarn`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Commit sebelum setiap task:** `git add -A && git commit -m "checkpoint: before task 0A-XX"`
5. **Rollback jika blocked:** `git checkout -- <files>`
6. Run `pnpm typecheck && pnpm lint` setelah setiap task

---

## Week 1: Foundation (Tasks 0A-1 to 0A-9)

### Task 0A-1: Type Definitions

**Dependency:** None
**Output:** `src/services/api/types.ts`

Create type definitions matching Supabase PostgREST shape:

- `QueryResult<T>`, `QueryArrayResult<T>`
- `PostgrestError`
- `SelectOptions`, `InsertOptions`
- `StorageUploadResponse`, `StorageRemoveResponse`
- `RealtimeSubscription`
- `ApiBackend = 'supabase' | 'vil'`

**Verify:** `pnpm typecheck`

---

### Task 0A-2: ApiClient Interface + Singleton

**Dependency:** Task 0A-1
**Output:** `src/services/api/apiClient.ts`

Create module-level singleton pattern:

```typescript
// Interface: QueryBuilder<T>, StorageClient, ApiClient
// Singleton: setApiClient(), getApiClient(), getApiBackend()
```

**Pattern:**

```typescript
import { getApiClient } from '@/services/api'
const db = getApiClient()
const { data } = await db.from('courses').select('*').eq('tenant_id', tid)
```

**Verify:** `pnpm typecheck`

---

### Task 0A-3: Supabase Implementation

**Dependency:** Task 0A-2
**Output:** `src/services/api/supabaseApiClient.ts`

Thin wrapper — just delegates to existing `supabase` client:

```typescript
export function createSupabaseApiClient(): ApiClient {
  return supabase as unknown as ApiClient
}
```

**Verify:** `pnpm typecheck`

---

### Task 0A-4: VIL Stub Implementation

**Dependency:** Task 0A-2
**Output:** `src/services/api/vilApiClient.ts`

Stub that throws "Not implemented" for all methods:

```typescript
export function createVilApiClient(_baseUrl: string): ApiClient {
  return {
    from() {
      return NOT_IMPL('from') as never
    },
    // ... all methods throw
  }
}
```

**Verify:** `pnpm typecheck`

---

### Task 0A-5: Barrel Export

**Dependency:** Tasks 0A-1 to 0A-4
**Output:** `src/services/api/index.ts`

Export everything from one place:

```typescript
export type { ApiClient, QueryBuilder, ... } from './apiClient'
export { getApiClient, setApiClient, getApiBackend } from './apiClient'
export { createSupabaseApiClient } from './supabaseApiClient'
export { createVilApiClient } from './vilApiClient'
```

**Verify:** `pnpm typecheck`

---

### Task 0A-6: Initialize in main.tsx

**Dependency:** Task 0A-5
**Output:** Edit `src/main.tsx`

Add after `validateEnv()` and before `const legacyHashPath`:

```typescript
import { setApiClient } from '@/services/api'
import { createSupabaseApiClient } from '@/services/api/supabaseApiClient'
import { createVilApiClient } from '@/services/api/vilApiClient'

const apiBackend = (import.meta.env.VITE_API_BACKEND as 'supabase' | 'vil') ?? 'supabase'
if (apiBackend === 'vil') {
  setApiClient(createVilApiClient(import.meta.env.VITE_API_URL || 'http://localhost:8080'), 'vil')
} else {
  setApiClient(createSupabaseApiClient(), 'supabase')
}
```

**Verify:** `pnpm typecheck && pnpm lint`

---

### Task 0A-7: Add Environment Variables

**Dependency:** None
**Output:** Edit `src/vite-env.d.ts`

Add to `ImportMetaEnv` interface:

```typescript
readonly VITE_API_BACKEND?: 'supabase' | 'vil'
readonly VITE_API_URL?: string
```

**Verify:** `pnpm typecheck`

---

### Task 0A-8: Refactor courseService.ts (POC)

**Dependency:** Task 0A-6
**Output:** Edit `src/features/courses/api/courseService.ts`

**CRITICAL POC — Proof the pattern works end-to-end**

Replace:

```typescript
import { supabase } from '@/services/supabase/client'
```

With:

```typescript
import { getApiClient } from '@/services/api'
```

Then in every method, add `const db = getApiClient()` and replace `supabase.` with `db.`

**Test file (if exists):** Update mock from `vi.mock('@/services/supabase/client')` → `vi.mock('@/services/api')`

**Verify:**

```bash
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/courses/api/courseService.ts
# Expected: 0 results
```

---

### Task 0A-9: End-to-End Verify

**Dependency:** Task 0A-8
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

# 6. Build check
pnpm build
```

**Success Criteria:**

- ✅ `pnpm typecheck` = 0 errors
- ✅ `pnpm lint` = no new errors
- ✅ `pnpm test:ci` = all tests pass
- ✅ `courseService.ts` has 0 direct supabase imports
- ✅ `pnpm build` succeeds
- ✅ App works identically (manual test: login, browse courses)

---

## Week 2-4: Service File Refactoring

### Cluster A: Lessons & Course Builder

| Task  | File                                               | Dependency |
| ----- | -------------------------------------------------- | ---------- |
| 0A-10 | `src/features/lessons/api/lessonService.ts`        | 0A-9       |
| 0A-11 | `src/features/course-builder/api/moduleService.ts` | 0A-10      |
| 0A-12 | `src/features/course-builder/api/lessonService.ts` | 0A-11      |

**Pattern for each:**

```typescript
// Replace import
import { getApiClient } from '@/services/api'

// In each method
const db = getApiClient()
const { data } = await db.from('lessons').select('*').eq('module_id', moduleId)
```

**Verify:** `pnpm typecheck && pnpm lint && grep -n "supabase\.from" <file>`

---

### Cluster B: Classroom & Attendance

| Task  | File                                               | Dependency |
| ----- | -------------------------------------------------- | ---------- |
| 0A-13 | `src/features/classroom/api/classroomService.ts`   | 0A-9       |
| 0A-14 | `src/features/attendance/api/attendanceService.ts` | 0A-13      |

**Note:** If file has realtime (`supabase.channel()`), add comment `// TODO: Wave 0C` and skip that method.

---

### Cluster C: Discussions & Notifications

| Task  | File                                                    | Dependency |
| ----- | ------------------------------------------------------- | ---------- |
| 0A-15 | `src/features/discussions/api/discussionService.ts`     | 0A-9       |
| 0A-16 | `src/features/discussions/api/commentService.ts`        | 0A-15      |
| 0A-17 | `src/features/notifications/api/notificationService.ts` | 0A-16      |

**Note:** Only refactor CRUD (`.from()`, `.rpc()`). Skip realtime and Edge Function calls.

---

### Cluster D: Parent, Calendar & Announcements

| Task   | File                                                    | Dependency |
| ------ | ------------------------------------------------------- | ---------- |
| 0A-18  | `src/features/parent/api/parentApi.ts`                  | 0A-9       |
| 0A-19  | `src/features/calendar/api/calendarService.ts`          | 0A-18      |
| 0A-19b | `src/features/calendar/api/calendarEventService.ts`     | 0A-19      |
| 0A-20  | `src/features/announcements/api/announcementService.ts` | 0A-19      |

---

### Cluster E: Cross-Cluster Verification

**Task 0A-21:** Full Cross-Cluster Verify

```bash
# Full verification script
pnpm typecheck && pnpm lint && pnpm test:ci

# Audit refactored files
grep -rn "supabase\.from\|supabase\.rpc" \
  src/features/lessons/api/lessonService.ts \
  src/features/course-builder/api/ \
  src/features/classroom/api/ \
  src/features/attendance/api/ \
  src/features/discussions/api/ \
  src/features/notifications/api/notificationService.ts \
  src/features/parent/api/ \
  src/features/calendar/api/ \
  src/features/announcements/api/
# Expected: 0 results

# Build
pnpm build
```

---

### Cluster F: Utilities & CI Guard

**Task 0A-22:** Refactor `src/utils/offlineQueue.ts`

```typescript
// Replace supabase import with getApiClient()
// Refactor processOperation() to use db.from(), db.rpc()
```

**Task 0A-23:** Enable ESLint CI Guard

Update `eslint.config.js` — change `no-restricted-imports` from `warn` → `error`:

```javascript
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        group: ['@/services/supabase/client'],
        message: 'Gunakan getApiClient() dari @/services/api.'
      }]
    }]
  }
}
```

---

## Remaining Waves (Not in 0A Scope)

After all 0A tasks complete, continue with:

- **Wave 0B (Week 5-6):** Auth Abstraction
- **Wave 0C (Week 6-8):** Realtime Abstraction
- **Wave 0D (Week 8-9):** Storage Abstraction
- **Wave 0E (Week 10):** Verification & CI Guard

See [TASK_QUEUE_0B_0D.md](./TASK_QUEUE_0B_0D.md) for details.

---

## File Inventory

| Category  | Files to Refactor      | Status |
| --------- | ---------------------- | ------ |
| Week 1    | 7 new + 1 refactored   | ⬜     |
| Cluster A | 3 files                | ⬜     |
| Cluster B | 2 files                | ⬜     |
| Cluster C | 3 files                | ⬜     |
| Cluster D | 4 files                | ⬜     |
| Cluster E | Verification           | ⬜     |
| Cluster F | 1 file + ESLint config | ⬜     |
| **Total** | **~20 service files**  |        |
