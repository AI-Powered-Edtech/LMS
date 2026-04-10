# Current Status

**Last Updated:** 2026-04-11
**Current Phase:** Phase 2 (ACTIVE — implementation pass complete, formal cutover gates pending)
**Execution Readiness:** 92/100 → Target: 92/100

---

## Phase Completion Checklist

### Phase -1: Reality Sync

- [x] **A: Baseline Truth Refresh**
  - [x] Create `docs/migration/REALITY_SYNC_BASELINE.md`
  - [x] Document current repo state (81/100 production candidate)
  - [x] Inventory all Supabase touchpoints
- [x] **B: Supabase Coupling Inventory**
  - [x] Create `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
  - [x] Classify 7 buckets of coupling
- [x] **C: Gap Classification**
  - [x] Create `docs/migration/GAP_RECLASSIFICATION.md`
  - [x] Classify as Live vs Stale vs Competing
- [x] **D: Scope Narrowing Matrix**
  - [x] Create `docs/migration/MIGRATION_SCOPE_MATRIX.md`
  - [x] Decisions: migrate-first / migrate-later / stay-on-supabase
- [x] **E: Revised Phase 0 Prep**
  - [x] Create `plans/REVISED_PHASE_0.md`
  - [x] Remove duplicate/obsolete tasks

### Phase 0: Frontend Abstraction Layer

- [x] 0A: API Client Abstraction — COMPLETE (2026-04-09)
- [x] 0B: Auth Provider Abstraction — COMPLETE (2026-04-09)
- [x] 0C: Realtime Provider Abstraction — COMPLETE (2026-04-09)
- [x] 0D: Storage Provider Abstraction — COMPLETE (2026-04-09)
- [ ] 0E: Compatibility Contract Freeze — deferred
- [ ] 0F: Direct Dependency Audit + CI Guard — deferred
- [ ] 0G: Verification — partial

### Phase 1: Auth + Scaffold

- [x] 1A: VIL Scaffold (edusync-api/ workspace, 5 crates, health endpoints) — COMPLETE (2026-04-10)
- [x] 1B: Auth Handlers (register, login, signout, refresh, bootstrap, MFA, tenant RPCs) — COMPLETE (2026-04-10)
- [x] 1C: Tenant & RBAC Middleware — COMPLETE (2026-04-10)
  - [x] `TenantContext` struct (`middleware/src/tenant.rs`)
  - [x] `AuthedRequest` + `RbacGuard` Axum extractors (`api-server/src/extractors.rs`)
  - [x] `role_has_permission` + role hierarchy (`middleware/src/rbac.rs`)
  - [x] `BruteForceTracker` — 5 attempts → 15 min lockout (`middleware/src/brute_force.rs`)
  - [x] `set_rls_context` — SET LOCAL for per-request SQL context (`middleware/src/db_context.rs`)
  - [x] `csrf` module — documented pass-through (Bearer-token API, no cookie auth)
  - [x] `BruteForceTracker` wired into `login.rs`
  - [ ] Google OAuth token exchange (still stub — `oauth.rs:52`)
  - [x] `user_invitations` + `tenant_memberships` tables — migration 003 applied
  - [x] `validate_invitation_handler` — queries `user_invitations` JOIN `tenants`
  - [x] `accept_invitation_handler` — verifies JWT, matches email, marks accepted, upserts roles+memberships
- [x] 1D: Verification (Gate 2) — COMPLETE (2026-04-11)
  - [x] live curl tests for all 10 auth endpoints — all PASS
  - [x] brute force lockout test — 429 on attempt 6 ✅
  - [x] validate-invitation 404, bootstrap 401, signout 204 ✅

### Phase 2: Core CRUD Endpoints

- [x] Batch 1: Courses, Classes, Lessons (implementation pass complete — 2026-04-11)
- [x] Batch 2: Assignments, Quizzes, Gradebook (implementation pass complete — 2026-04-11)
- [x] Batch 3: Users, Analytics, Progress (implementation pass complete — 2026-04-11)
- [x] Batch 4: Remaining (implementation pass complete — 2026-04-11)

### Phase 3: Edge Functions

- [ ] 3A: AI Functions (Weeks 39-43)
- [ ] 3B: LTI 1.3 Functions (Weeks 43-46)
- [ ] 3C: Notification/Communication (Weeks 46-49)
- [ ] 3D: Processing & Misc (Weeks 49-52)
- [ ] 3E: Background Jobs/Cron (Weeks 50-52)

### Phase 4: Realtime

- [ ] 4A: WebSocket Server (Weeks 53-55)
- [ ] 4B: Port 9 Realtime Consumers (Weeks 55-58)
- [ ] 4C: Verification (Weeks 58-60)

### Phase 5: Storage

- [ ] Deploy MinIO/S3/R2
- [ ] Dual-write period
- [ ] Background migration
- [ ] Switch reads + URL rewriting

### Phase 6: Decommission

- [ ] Remove `@supabase/supabase-js`
- [ ] Remove Edge Functions
- [ ] Remove Supabase config
- [ ] Final E2E + load test

---

## Gate Status

| Gate                     | Status          | Notes                                            |
| ------------------------ | --------------- | ------------------------------------------------ |
| Gate 1 (Phase 0)         | **PASSED** ✅   | All 4 provider abstractions shipped (2026-04-09) |
| Gate 2 (Phase 1 Auth)    | **PASSED** ✅   | All 10 auth endpoints verified (2026-04-11)      |
| Gate 3 (Phase 2 Batch 1) | **PENDING**     | Implementation shipped; security/shadow review belum dijalankan |
| Gate 4 (Phase 3)         | **NOT REACHED** | Stability check                                  |
| Gate 5 (Phase 4)         | **NOT REACHED** | Realtime reliability                             |
| Gate 6 (Phase 6)         | **NOT REACHED** | Final success                                    |

---

## Next Immediate Action Items

1. **Phase 2 review pass** 🔄 ACTIVE
   - VIL data plane (`/api/v1/data/*`, `/api/v1/rpc/*`) sudah dipakai untuk Batch 1–4 service layer
   - Remaining formal work: Gate 3 security review, shadow mode, integration test suite penuh

2. **Verification debt outside migration slice**
   - `pnpm typecheck`, `pnpm lint`, `pnpm build` masih gagal oleh error/warning pre-existing di area non-migration
   - Targeted lint untuk file migrasi lulus; backend `cargo check` + `cargo test` lulus

---

## Repository Readiness Status

| Component       | Status                | Notes                                       |
| --------------- | --------------------- | ------------------------------------------- |
| CI/CD           | ✅ Exists             | GitHub Actions, ESLint, Playwright          |
| CI Status       | ⚠️ Exists             | Needs verification (workflow indent issues) |
| E2E Tests       | ✅ 400+ scenarios     | Playwright framework                        |
| Feature Modules | ✅ 52                 | Organized by domain                         |
| Hooks           | ✅ 20                 | Custom React hooks                          |
| Contexts        | ✅ 3                  | Theme, Auth, Feature providers              |
| UI Components   | ✅ 47                 | Reusable UI primitives                      |
| Auth            | ✅ Abstraction + VIL  | Phase 1 usable, OAuth exchange masih stub   |
| Realtime        | ✅ 9 hooks            | Abstraction ada, migration runtime deferred |
| Storage         | ✅ Abstraction ada    | Runtime migration deferred                  |
| Edge Functions  | ✅ 30                 | Need VIL port                               |
| Routing         | ✅ Path-based (/app/) | BrowserRouter in App.tsx, NOT HashRouter    |
| TypeScript      | ✅ v5.8               | Strict mode                                 |
| Dark Mode       | ✅ Tailwind           | Need `dark:` variants                       |

---

## Risk Status

| Risk                          | Level        | Mitigation             |
| ----------------------------- | ------------ | ---------------------- |
| Password hash mismatch        | **Critical** | Dual-hash verification |
| Scope creep                   | **High**     | Strict phase gates     |
| Team burnout                  | **High**     | Realistic timeline     |
| Abstraction layer not started | **High**     | Must complete 0A first |
| CI gate unverified            | **Medium**   | Prove before relying   |
| VIL stability                 | Medium       | Fork to Axum if needed |
| RLS→middleware bugs           | Medium       | Shadow mode testing    |
| MFA gaps                      | Medium       | Port existing logic    |

---

## Phase -1 Reality Sync Status

| Workstream               | Status    | Output                                          |
| ------------------------ | --------- | ----------------------------------------------- |
| A: Reality Sync Baseline | ✅ CLOSED | `docs/migration/REALITY_SYNC_BASELINE.md`       |
| B: Coupling Inventory    | ✅ CLOSED | `docs/migration/SUPABASE_COUPLING_INVENTORY.md` |
| C: Gap Reclassification  | ✅ CLOSED | `docs/migration/GAP_RECLASSIFICATION.md`        |
| D: Scope Narrowing       | ✅ CLOSED | `docs/migration/MIGRATION_SCOPE_MATRIX.md`      |
| E: Revised Phase 0       | ✅ CLOSED | `plans/REVISED_PHASE_0.md`                      |

### Phase -1: COMPLETE

**Next executable scope:** Phase 2 hardening and Gate 3 preparation

**Frozen:**

- Phase 3+ tetap tertahan sampai Gate 3 untuk Phase 2 ditutup

## Catatan Penting

- Phase 0 abstraction layer sudah shipped; 0E/0F/0G masih berupa follow-up hardening dan verification debt
- Phase 1 sudah selesai secara implementasi; follow-up tinggal OAuth exchange + cleanup
- Phase 2 implementation pass complete, tetapi belum boleh dianggap exit-complete sebelum security review, shadow mode, dan integration suite ditutup
