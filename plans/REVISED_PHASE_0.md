# Revised Phase 0 — Frontend Abstraction Baseline

## Metadata

- **Tanggal:** 2026-04-10
- **Branch:** main
- **Author:** Agent (Migration Planning)
- **Sources Used:**
  - `docs/migration/REALITY_SYNC_BASELINE.md`
  - `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
  - `docs/migration/GAP_RECLASSIFICATION.md`
  - `docs/migration/MIGRATION_SCOPE_MATRIX.md`

---

## Purpose

This document replaces the old Phase 0 plan that was too broad. It locks Phase 0 to **0A only**, deferring 0B-0E until gates pass.

**Key Principle:** Proving path first, not full surface migration.

---

## Why the Old Phase 0 is Too Broad

The original Phase 0 plan assumed:

- Auth abstraction (0B) could start alongside API client (0A)
- Realtime abstraction (0C) was safe early work
- Storage abstraction (0D) was straightforward
- All could complete within Weeks 1-10

**Reality from Workstreams A-D:**

1. **Repo is hash-based, not path-based** — plan assumed path routing
2. **CI exists but needs format verification** — cannot trust as gate yet
3. **`types.ts` does NOT exist** — abstraction layer must start from scratch
4. **Auth is the highest-risk migration** — must not be approached early
5. **Realtime and Storage have high blast radius** — must wait for parity proof
6. **Repo has 30 Edge Functions, not 22** — scope was underestimated
7. **Execution readiness is 68/100** — not yet ready for wide execution

**Conclusion:** Old Phase 0 opened too much scope too early. New Phase 0 opens only 0A.

---

## Active Scope: 0A Only

Phase 0A is the **only active phase**. It establishes:

- Abstraction type layer
- ApiClient interface
- Dual implementation (Supabase active, VIL stub)
- Proving vertical slice (courseService)
- Routing decision documentation
- CI verification

**0A does NOT include:**

- Auth abstraction (0B scope)
- Realtime abstraction (0C scope)
- Storage abstraction (0D scope)
- Full verification sweep (0E scope)

---

## Deferred Scope: 0B–0E

All of these are **FROZEN** until gates pass:

### 0B: Auth Abstraction — DEFERRED

**Reason:** 6 live auth gaps identified. Auth is highest risk.
**Unfreeze when:**

- Gate RS (Reality Sync) passes
- Gate 0A passes
- Execution readiness reaches 85/100+

### 0C: Realtime Abstraction — DEFERRED

**Reason:** 11 realtime subscriptions with high blast radius.
**Unfreeze when:**

- Phase 0A complete
- VIL WebSocket stability proven
- Gate 0A passes

### 0D: Storage Abstraction — DEFERRED

**Reason:** 6 storage buckets with complex migration needs.
**Unfreeze when:**

- Phase 0A complete
- Cost/effort analysis done
- Gate 0A passes

### 0E: Broader Verification Sweep — DEFERRED

**Reason:** CI needs verification before verification becomes gate.
**Unfreeze when:**

- Phase 0A complete
- CI format verified
- Gate 0A passes

---

## 0A Task List (Final)

Execute these tasks in order:

| Task      | Description                                                     | Output                  |
| --------- | --------------------------------------------------------------- | ----------------------- |
| **0A-1**  | Create `src/services/api/types.ts`                              | Abstraction types file  |
| **0A-2**  | Create `ApiClient` interface                                    | TypeScript interface    |
| **0A-3**  | Create `SupabaseApiClient` implementation                       | Current backend adapter |
| **0A-4**  | Create `VilApiClient` stub                                      | Future backend adapter  |
| **0A-5**  | Add barrel exports in `src/services/api/index.ts`               | Clean import API        |
| **0A-6**  | Add `VITE_API_BACKEND` env var                                  | Feature flag support    |
| **0A-7**  | Wire bootstrap/init minimum in `main.tsx`                       | Initialization          |
| **0A-8**  | Refactor `courseService` as proving path                        | POC vertical slice      |
| **0A-9**  | Document routing compatibility decision                         | Markdown note           |
| **0A-10** | Verify CI workflow format                                       | Verified CI             |
| **0A-11** | Run `pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build` | All green               |

### Task Details

#### 0A-1: Create `src/services/api/types.ts`

**Purpose:** Abstract all Supabase SDK types.

**Types to include:**

- `Session` (from Supabase)
- `User` (from Supabase)
- `RealtimeChannel` (from Supabase)
- `PostgrestError` (from Supabase)

**Criticality:** BLOCKER for all other 0A tasks.

---

#### 0A-2: Create `ApiClient` interface

**Purpose:** Define contract for backend adapters.

**Interface methods needed:**

- `from(table)` — query builder
- `rpc(fn, args)` — stored procedure
- `auth` — auth primitives
- `storage` — storage primitives

---

#### 0A-3: Create `SupabaseApiClient`

**Purpose:** Current implementation wrapping Supabase client.

**Implementation:** Wraps existing `supabase` client from `src/services/supabase/client.ts`

---

#### 0A-4: Create `VilApiClient` stub

**Purpose:** Future VIL backend adapter.

**Implementation:** Stub that throws "not implemented" or returns empty for now.

---

#### 0A-8: Refactor `courseService` as POC

**Purpose:** Prove the abstraction works end-to-end.

**Files to touch:**

- `src/features/courses/api/courseService.ts`

**Pattern:**

```typescript
// Before
import { supabase } from '@/services/supabase/client'
const { data } = await supabase.from('courses').select('*')

// After
import { getApiClient } from '@/services/api'
const db = getApiClient()
const { data } = await db.from('courses').select('*')
```

---

## 0A Exit Criteria

0A is considered **PASSED** when ALL of these are true:

- [ ] `src/services/api/types.ts` exists and exports all needed types
- [ ] `ApiClient` interface defined with `from()`, `rpc()`, `auth`, `storage`
- [ ] `SupabaseApiClient` implementation exists and wraps current client
- [ ] `VilApiClient` stub exists (even if not fully implemented)
- [ ] `src/services/api/index.ts` exports all pieces
- [ ] `courseService` refactored to use `getApiClient()`
- [ ] `VITE_API_BACKEND` env var wired in initialization
- [ ] Routing decision documented (hash-based `/#/` is active)
- [ ] CI workflow format verified (no indent issues)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test:ci` passes
- [ ] `pnpm build` succeeds

---

## No-Go Conditions

**DO NOT EXECUTE** if any of these occur:

- ❌ Agent starts touching `src/features/auth/*`
- ❌ Agent starts realtime abstraction work
- ❌ Agent starts storage abstraction work
- ❌ Agent assumes path-based routing as active default
- ❌ Agent opens Phase 1 auth scaffold
- ❌ Agent widens scope beyond the 11 tasks above

---

## Handoff to Phase 1

After 0A passes, Phase 1 (Auth + Scaffold) may open IF:

1. Gate 0A criteria all green
2. Execution readiness reaches 85/100+
3. Auth parity testing plan is ready
4. TenantGuard/RbacGuard design is finalized

**Phase 1 is NOT opened by 0A completion alone.**

---

## Verification Commands

```bash
# Full verification before claiming 0A done
pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build

# Specific to 0A
grep -r "from '@supabase/supabase-js'" src/services/api/ | wc -l
# Expected: 0 (no direct imports in abstraction layer)
```

---

## Related Documents

- [Reality Sync Baseline](../docs/migration/REALITY_SYNC_BASELINE.md)
- [Supabase Coupling Inventory](../docs/migration/SUPABASE_COUPLING_INVENTORY.md)
- [Gap Reclassification](../docs/migration/GAP_RECLASSIFICATION.md)
- [Migration Scope Matrix](../docs/migration/MIGRATION_SCOPE_MATRIX.md)

---

## Status

**Workstream E: COMPLETE**
