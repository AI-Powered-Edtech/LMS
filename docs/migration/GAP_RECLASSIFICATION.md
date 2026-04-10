# Gap Reclassification — Workstream C

## Metadata

- **Tanggal:** 2026-04-10
- **Branch:** main
- **Commit:** bbb4c1e4
- **Author:** Agent (Migration Planning)
- **Sources Used:**
  - `migration-plan-agents/01_PHASE_NEG1_REALITY_SYNC/TASK_QUEUE.md`
  - `migration-plan-agents/01_PHASE_NEG1_REALITY_SYNC/ACCEPTANCE_CRITERIA.md`
  - `docs/migration/REALITY_SYNC_BASELINE.md`
  - `docs/migration/SUPABASE_COUPLING_INVENTORY.md`

---

## Purpose

This document reclassifies all gaps/issues from the old migration plan into:

- **Live** — Still relevant, must be addressed
- **Stale** — Already fixed, no longer applicable
- **Competing** — Solved by alternative approach

---

## C-1: Gap Classification Matrix

### Auth & Session Gaps

| Gap ID  | Original Description                    | Old Status | New Status | Reason                                                                         | Evidence                             |
| ------- | --------------------------------------- | ---------- | ---------- | ------------------------------------------------------------------------------ | ------------------------------------ |
| AUTH-01 | "No auth abstraction layer exists"      | Open       | **Live**   | Verified: `src/services/api/types.ts` does NOT exist. Phase 0B must create it. | Code scan: 0 abstraction files found |
| AUTH-02 | "Auth coupled to Supabase Auth"         | Open       | **Live**   | Verified: `src/contexts/auth/*` imports directly from `@supabase/supabase-js`  | Code scan: 6 direct imports          |
| AUTH-03 | "get_auth_bootstrap RPC not replicated" | Open       | **Live**   | Critical RPC — must be replicated in VIL                                       | `authService.ts` line 115            |
| AUTH-04 | "Password hash mismatch risk"           | Open       | **Live**   | bcrypt (Supabase) → Argon2 (VIL) migration needed                              | Migration plan spec                  |
| AUTH-05 | "OAuth callback path mismatch"          | Open       | **Live**   | Plan assumes path routing, repo uses hash routing                              | `AuthContext.tsx` + routing analysis |
| AUTH-06 | "MFA gaps"                              | Open       | **Live**   | MFA logic needs to be ported                                                   | `mfaService.ts` exists               |

### Database & RLS Gaps

| Gap ID | Original Description                              | Old Status | New Status | Reason                                              | Evidence                               |
| ------ | ------------------------------------------------- | ---------- | ---------- | --------------------------------------------------- | -------------------------------------- |
| DB-01  | "RLS policies must map to TenantGuard"            | Open       | **Live**   | 9 critical tables with RLS verified                 | Coupling Inventory Bucket 5            |
| DB-02  | "tenant_id isolation dependency"                  | Open       | **Live**   | All multi-tenant queries rely on RLS                | Schema analysis                        |
| DB-03  | "No transaction wrapping for multi-table inserts" | Open       | **Stale**  | Repo already has transaction patterns               | `enroll_student` RPC uses transactions |
| DB-04  | "get_my_tenant_id() function dependency"          | Open       | **Live**   | Must be replaced with TenantGuard middleware in VIL | `REALITY_SYNC_BASELINE.md`             |

### Edge Functions Gaps

| Gap ID | Original Description                       | Old Status | New Status | Reason                                      | Evidence                             |
| ------ | ------------------------------------------ | ---------- | ---------- | ------------------------------------------- | ------------------------------------ |
| EF-01  | "22 Edge Functions need VIL port"          | Open       | **Stale**  | Updated count: **30 functions** exist       | `supabase/functions/` directory scan |
| EF-02  | "AI functions need Groq API migration"     | Open       | **Live**   | 8 AI-related Edge Functions identified      | Coupling Inventory Bucket 6          |
| EF-03  | "LTI functions need reimplementation"      | Open       | **Live**   | 4 LTI functions (jwks, oidc, launch, grade) | Coupling Inventory Bucket 6          |
| EF-04  | "PDF certificate generation needs porting" | Open       | **Live**   | `generate-pdf` function exists              | Coupling Inventory Bucket 6          |

### Realtime Gaps

| Gap ID | Original Description                            | Old Status      | New Status    | Reason                                               | Evidence                                |
| ------ | ----------------------------------------------- | --------------- | ------------- | ---------------------------------------------------- | --------------------------------------- |
| RT-01  | "9 realtime hooks need abstraction"             | Open            | **Stale**     | Updated count: **11 subscriptions** found            | Coupling Inventory Bucket 2             |
| RT-02  | "Realtime may stay on Supabase if VIL unstable" | Plan assumption | **Competing** | VIL WebSocket support needs verification             | Pending VIL stability test              |
| RT-03  | "Polling fallbacks for offline"                 | Open            | **Live**      | `backgroundSync.ts` exists and uses offline patterns | `offlineQueue.ts` + `backgroundSync.ts` |

### Storage Gaps

| Gap ID | Original Description               | Old Status | New Status    | Reason                                                                                     | Evidence                    |
| ------ | ---------------------------------- | ---------- | ------------- | ------------------------------------------------------------------------------------------ | --------------------------- |
| ST-01  | "Storage buckets need abstraction" | Open       | **Live**      | 6 buckets verified (videos, submissions, avatars, documents, certificates, video-captions) | Coupling Inventory Bucket 3 |
| ST-02  | "MinIO vs Supabase cost decision"  | Open       | **Competing** | Decision deferred — storage abstraction priority not set                                   | Pending cost analysis       |
| ST-03  | "URL rewriting after migration"    | Open       | **Live**      | All `getPublicUrl()` calls need redirect mapping                                           | `storageService.ts`         |

### Abstraction Layer Gaps

| Gap ID | Original Description                  | Old Status | New Status | Reason                                                     | Evidence                     |
| ------ | ------------------------------------- | ---------- | ---------- | ---------------------------------------------------------- | ---------------------------- |
| AB-01  | "No ApiClient interface exists"       | Open       | **Live**   | `src/services/api/` structure does NOT exist               | Code scan: no api/ directory |
| AB-02  | "No Supabase/VIL dual implementation" | Open       | **Live**   | Only Supabase implementation exists                        | `supabase/client.ts` only    |
| AB-03  | "Feature flags not implemented"       | Open       | **Live**   | `VITE_API_BACKEND` env var pattern exists but not enforced | `authService.ts` pattern     |
| AB-04  | "Offline queue writes to Supabase"    | Open       | **Live**   | `offlineQueue.ts` writes directly to Supabase              | `offlineQueue.ts` line 202   |

### CI & Testing Gaps

| Gap ID | Original Description                  | Old Status   | New Status | Reason                                  | Evidence                   |
| ------ | ------------------------------------- | ------------ | ---------- | --------------------------------------- | -------------------------- |
| CI-01  | "No CI exists"                        | Open         | **Stale**  | CI **EXISTS** — GitHub Actions workflow | `.github/workflows/ci.yml` |
| CI-02  | "CI needs format/indent verification" | Not flagged  | **Live**   | Workflow has potential indent issues    | Manual review              |
| CI-03  | "51 E2E tests"                        | Used in plan | **Stale**  | Updated: **400+ E2E scenarios**         | `REALITY_SYNC_BASELINE.md` |
| CI-04  | "700+ unit tests"                     | Used in plan | **Live**   | Unit tests exist, count verified        | `REALITY_SYNC_BASELINE.md` |

### Routing Gaps

| Gap ID | Original Description               | Old Status      | New Status | Reason                                                          | Evidence                                |
| ------ | ---------------------------------- | --------------- | ---------- | --------------------------------------------------------------- | --------------------------------------- |
| R-01   | "Plan assumes path-based routing"  | Not flagged     | **Live**   | Repo uses **hash-based routing** (`/#/`), plan assumes `/app/*` | `src/pages/*.tsx` + routing analysis    |
| R-02   | "OAuth callback at /auth/callback" | Plan assumption | **Stale**  | Real callback path needs verification                           | Hash routing implies different callback |

### Miscellaneous Gaps

| Gap ID | Original Description             | Old Status | New Status    | Reason                                        | Evidence                           |
| ------ | -------------------------------- | ---------- | ------------- | --------------------------------------------- | ---------------------------------- |
| M-01   | "VIL framework stability"        | Risk       | **Competing** | VIL needs proof of production readiness       | Pending stability test             |
| M-02   | "Multi-agent execution planning" | New        | **Competing** | Plan suggests multi-agent, implementation TBD | `PILOT_FIRST_REVISED_FRAMEWORK.md` |
| M-03   | "Execution readiness 68/100"     | New        | **Live**      | Current state: 68/100, target: 88/100         | `CURRENT_STATUS.md`                |

---

## C-2: Summary by Classification

### Live Gaps (Must Address)

| Count | Category            | Priority     |
| ----- | ------------------- | ------------ |
| 6     | Auth & Session      | **Critical** |
| 2     | Database & RLS      | **Critical** |
| 2     | Edge Functions      | **High**     |
| 1     | Realtime            | **Medium**   |
| 3     | Storage             | **High**     |
| 4     | Abstraction Layer   | **Critical** |
| 1     | CI Verification     | **Medium**   |
| 1     | Routing             | **High**     |
| 1     | Execution Readiness | **Critical** |

**Total Live Gaps: 21**

### Stale Gaps (No Longer Applicable)

| Count | Gap ID | Reason                     |
| ----- | ------ | -------------------------- |
| 1     | DB-03  | Transactions already exist |
| 1     | EF-01  | Count updated to 30        |
| 1     | RT-01  | Count updated to 11        |
| 1     | CI-01  | CI already exists          |
| 1     | CI-03  | E2E count updated to 400+  |
| 1     | R-02   | Callback path assumption   |

**Total Stale Gaps: 6**

### Competing Gaps (Alternative Solutions)

| Count | Gap ID | Reason                      |
| ----- | ------ | --------------------------- |
| 1     | RT-02  | VIL realtime stability TBD  |
| 1     | ST-02  | MinIO cost decision pending |
| 1     | M-01   | VIL stability needs proof   |
| 1     | M-02   | Multi-agent execution TBD   |

**Total Competing Gaps: 4**

---

## C-3: Gaps Blocking Phase -1 Exit

For Phase -1 Reality Sync to be considered complete, these gaps must be resolved:

| Blocker                       | Gap ID       | Action Required                            |
| ----------------------------- | ------------ | ------------------------------------------ |
| Abstraction layer not started | AB-01, AB-02 | **Phase 0A must start**                    |
| Execution readiness too low   | M-03         | **68/100 → 88/100 target**                 |
| Coupling inventory incomplete | Multiple     | **Workstream B already closed** ✅         |
| Baseline not locked           | ALL          | **This document finalizes classification** |

**Phase -1 Exit Criteria Status:**

- ✅ Baseline document: COMPLETE
- ✅ Coupling inventory: COMPLETE
- ✅ Gap classification: THIS DOCUMENT
- ⏳ Scope narrowing: PENDING (Workstream D)
- ⏳ Revised Phase 0: PENDING (Workstream E)

---

## C-4: Gaps Blocking Phase 0A Exit

For Phase 0A to pass and allow Phase 0B+ to open:

| Blocker                | Gap ID           | 0A Exit Requirement                             |
| ---------------------- | ---------------- | ----------------------------------------------- |
| No types abstraction   | AB-01            | Create `src/services/api/types.ts`              |
| No ApiClient interface | AB-02            | Create ApiClient interface + Supabase impl      |
| Auth still coupled     | AUTH-01, AUTH-02 | Auth abstraction NOT required for 0A (0B scope) |
| Routing mismatch       | R-01             | Document routing decision                       |
| CI verification        | CI-02            | Verify CI workflow format                       |

**Phase 0A Gate Criteria:**

- [ ] `types.ts` created
- [ ] `ApiClient` interface created
- [ ] `SupabaseApiClient` implementation created
- [ ] `VilApiClient` stub created
- [ ] At least 1 service refactored (POC: courseService)
- [ ] All pnpm checks pass
- [ ] Routing decision documented

---

## C-5: Implications for Remaining Workstreams

### Workstream D: Scope Narrowing

Based on gap classification:

| Domain                 | Recommendation    | Reason                               |
| ---------------------- | ----------------- | ------------------------------------ |
| API Client Abstraction | **Migrate-first** | 4 live gaps, AB-01 is prerequisite   |
| Auth                   | **Migrate-later** | 6 live gaps, but 0B/1B scope         |
| Database/RLS           | **Migrate-first** | Critical for Phase 1                 |
| Edge Functions         | **Migrate-later** | Phase 3 scope                        |
| Realtime               | **Migrate-later** | Phase 4 scope, stability TBD         |
| Storage                | **Migrate-later** | Phase 5 scope, cost decision pending |

### Workstream E: Revised Phase 0

Tasks to REMOVE (Stale):

- ❌ "CI doesn't exist" — CI exists
- ❌ "Only 22 Edge Functions" — Actually 30
- ❌ "Only 9 realtime hooks" — Actually 11
- ❌ "Only 51 E2E tests" — Actually 400+

Tasks to ADD (Live):

- ✅ Create `types.ts` (AB-01)
- ✅ Create `ApiClient` interface (AB-02)
- ✅ Document routing decision (R-01)
- ✅ Verify CI workflow format (CI-02)

---

## Acceptance Checklist

- [x] All gaps from old plan classified
- [x] 21 Live gaps identified
- [x] 6 Stale gaps documented
- [x] 4 Competing gaps noted
- [x] Phase -1 exit blockers identified
- [x] Phase 0A exit blockers identified
- [x] Implications for Workstream D & E documented

---

## Status

**Workstream C: COMPLETE**

Ready for reviewer review.
