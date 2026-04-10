# Phase -1: Reality Sync

**Status:** COMPLETE (2026-04-10)

**Purpose:** Synchronize migration plan with actual repository state before Phase 0 begins.

---

## Rationale

The repository is already at **81/100 Production Candidate** (per 2026-04-08 readiness status), while some plan assumptions reference older baseline (e.g., 5 critical vulnerabilities mentioned in old roadmap). Coupling to Supabase is real and deep:

- **Auth/RPC/Functions:** Direct dependency
- **Realtime notifications:** Active with polling fallback
- **Storage:** Upload/delete/public URL still Supabase-native
- **Offline sync:** Queue writes to Supabase tables/RPC

---

## Workstreams

| Workstream                     | Output                           | Status      | Actual Output Location                           |
| ------------------------------ | -------------------------------- | ----------- | ------------------------------------------------ |
| A: Baseline Truth Refresh      | `REALITY_SYNC_BASELINE.md`       | CLOSED      | `docs/migration/REALITY_SYNC_BASELINE.md`        |
| B: Supabase Coupling Inventory | `SUPABASE_COUPLING_INVENTORY.md` | CLOSED      | `docs/migration/SUPABASE_COUPLING_INVENTORY.md`  |
| C: Gap Classification          | `GAP_RECLASSIFICATION.md`        | CLOSED      | `docs/migration/GAP_RECLASSIFICATION.md`         |
| D: Scope Narrowing Matrix      | `MIGRATION_SCOPE_MATRIX.md`      | CLOSED      | `docs/migration/MIGRATION_SCOPE_MATRIX.md`       |
| E: Revised Phase 0 Prep        | `REVISED_PHASE_0.md`             | CLOSED      | Absorbed into Phase 0A/0B/0C/0D task queues      |

---

## Deliverables (All Completed)

1. `docs/migration/REALITY_SYNC_BASELINE.md` -- Current truth snapshot (81/100 production, 68/100 migration readiness)
2. `docs/migration/SUPABASE_COUPLING_INVENTORY.md` -- 7-bucket coupling classification (129 supabase-importing files, 30 Edge Functions)
3. `docs/migration/GAP_RECLASSIFICATION.md` -- Live vs Stale vs Competing gap analysis
4. `docs/migration/MIGRATION_SCOPE_MATRIX.md` -- Migrate-first/later/stay decisions for 18 domains

---

## Exit Criteria

- [x] Single baseline document agreed upon
- [x] All major Supabase touchpoints inventoried
- [x] All old blockers classified live vs stale
- [x] Migration objective reframed as "safe surface reduction"
- [x] Revised Phase 0 contains no duplicate/obsolete tasks
- [x] Domain list: migrate-first / migrate-later / stay-on-supabase

---

## No-Go Conditions (All Cleared)

All no-go conditions have been resolved:

- [x] Readiness source of truth is established (81/100 production, 68/100 migration)
- [x] Coupling inventory complete (7 buckets, 129 files, 30 Edge Functions)
- [x] Migration tasks separated from already-fixed issues
- [x] CI strategy acknowledges existing CI (GitHub Actions)
- [x] Auth/realtime/storage correctly classified as migrate-later, not easy-first

---

**Signed off:** 2026-04-10, Agent (Migration Planning)
