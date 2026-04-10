# Phase -1 Reality Sync -- Task Queue

**Status:** ALL TASKS COMPLETE

---

## Workstream A: Baseline Truth Refresh

| Task | Description                                                     | Output             | Status |
| ---- | --------------------------------------------------------------- | ------------------ | ------ |
| A-1  | Run `pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build` | Pass/fail status   | DONE   |
| A-2  | Count feature modules (49) and Edge Functions (30)              | Module inventory   | DONE   |
| A-3  | Verify 81/100 readiness score source                            | Confirmed baseline | DONE   |
| A-4  | Identify any critical vulnerabilities still present             | Vuln list (live)   | DONE   |
| A-5  | Document current CI/CD pipeline status                          | CI inventory       | DONE   |
| A-6  | Verify Supabase CLI/schema sync status                          | Schema baseline    | DONE   |

**Output:** `docs/migration/REALITY_SYNC_BASELINE.md`

---

## Workstream B: Supabase Coupling Inventory

| Bucket | Description                          | Classification                       | Status |
| ------ | ------------------------------------ | ------------------------------------ | ------ |
| B-1    | Auth: session, getAuthBootstrap, MFA | **Core** -- migrate last             | DONE   |
| B-2    | Realtime: 11 subscriptions           | **Realtime** -- migrate Phase 4      | DONE   |
| B-3    | Storage: 6 buckets                   | **Storage** -- migrate Phase 5       | DONE   |
| B-4    | Offline Sync: 2 files                | **Offline** -- migrate Phase 5       | DONE   |
| B-5    | RLS/Schema: 9 critical tables        | **Schema** -- migrate with auth      | DONE   |
| B-6    | Edge Functions: 30 functions         | **Functions** -- migrate Phase 3     | DONE   |
| B-7    | Client Types: 4 Supabase types       | **Types** -- migrate-first Phase 0A  | DONE   |

**Output:** `docs/migration/SUPABASE_COUPLING_INVENTORY.md`

---

## Workstream C: Gap Classification

| Task | Description                                                               | Output          | Status |
| ---- | ------------------------------------------------------------------------- | --------------- | ------ |
| C-1  | Review all blockers from old roadmap                                      | Blocker list    | DONE   |
| C-2  | Classify each as Live (still blocking), Stale (fixed), or Competing (new) | Gap matrix      | DONE   |
| C-3  | Identify obsolete tasks that were already completed                       | Stale task list | DONE   |
| C-4  | Identify tasks that need reframing for current state                      | Reframe list    | DONE   |

**Output:** `docs/migration/GAP_RECLASSIFICATION.md`

---

## Workstream D: Scope Narrowing Matrix

| Decision             | Domain                 | Rationale                         | Status |
| -------------------- | ---------------------- | --------------------------------- | ------ |
| **Migrate-first**    | API Client Abstraction | Low risk, high isolation          | DONE   |
| **Migrate-first**    | Course CRUD            | Vertical slice POC                | DONE   |
| **Migrate-later**    | Auth                   | High risk, needs auth parity gate | DONE   |
| **Migrate-later**    | Analytics RPCs         | Complex, many procedures          | DONE   |
| **Migrate-later**    | Edge Functions         | 30 functions, complex             | DONE   |
| **Stay-on-supabase** | Realtime (Phase 4)     | May stay if VIL WS unstable       | DONE   |
| **Stay-on-supabase** | Storage (Phase 5)      | MinIO cost/effort vs benefit      | DONE   |

**Output:** `docs/migration/MIGRATION_SCOPE_MATRIX.md`

---

## Workstream E: Revised Phase 0 Prep

| Task | Description                                            | Output            | Status |
| ---- | ------------------------------------------------------ | ----------------- | ------ |
| E-1  | Remove tasks referencing non-existent CI               | Cleaned task list | DONE   |
| E-2  | Update auth abstraction order (after CRUD, not before) | Reordered tasks   | DONE   |
| E-3  | Verify 51 E2E tests exist and pass                     | Test status       | DONE   |
| E-4  | Draft compatibility contract                           | Contract doc      | DONE   |
| E-5  | Create feature flag plan                               | Flag matrix       | DONE   |

**Output:** Absorbed into Phase 0A/0B/0C/0D task queues

---

## Execution Summary

All 5 workstreams completed. Phase -1 Reality Sync is CLOSED.

**Deliverables produced:**
- `docs/migration/REALITY_SYNC_BASELINE.md`
- `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
- `docs/migration/GAP_RECLASSIFICATION.md`
- `docs/migration/MIGRATION_SCOPE_MATRIX.md`

**Key corrections from original plan:**
- Edge Functions count: 30 (was incorrectly listed as 22)
- Coupling buckets restructured to 7 (Auth/RPC, Realtime, Storage, Offline Sync, RLS/Schema, Edge Functions, Client Types)
- RPCs listed as "21+" -- actual inventory shows 15+ auth/analytics RPCs plus many more domain RPCs

**Signed off:** 2026-04-10, Agent (Migration Planning)
