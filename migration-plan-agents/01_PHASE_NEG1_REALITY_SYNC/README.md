# Phase -1: Reality Sync

**Purpose:** Synchronize migration plan with actual repository state before Phase 0 begins.

## Rationale

The repository is already at **81/100 Production Candidate** (per 2026-04-08 readiness status), while some plan assumptions reference older baseline (e.g., 5 critical vulnerabilities mentioned in old roadmap). Coupling to Supabase is real and deep:

- **Auth/RPC/Functions:** Direct dependency
- **Realtime notifications:** Active with polling fallback
- **Storage:** Upload/delete/public URL still Supabase-native
- **Offline sync:** Queue writes to Supabase tables/RPC

## Workstreams

| Workstream                     | Output                           | Duration |
| ------------------------------ | -------------------------------- | -------- |
| A: Baseline Truth Refresh      | `REALITY_SYNC_BASELINE.md`       | 1 day    |
| B: Supabase Coupling Inventory | `SUPABASE_COUPLING_INVENTORY.md` | 1-2 days |
| C: Gap Classification          | `GAP_RECLASSIFICATION.md`        | 1 day    |
| D: Scope Narrowing Matrix      | `MIGRATION_SCOPE_MATRIX.md`      | 1 day    |
| E: Revised Phase 0 Prep        | `REVISED_PHASE_0.md`             | 1 day    |

## Deliverables

1. `REALITY_SYNC_BASELINE.md` — Current truth snapshot
2. `SUPABASE_COUPLING_INVENTORY.md` — 7-bucket coupling classification
3. `GAP_RECLASSIFICATION.md` — Live vs Stale vs Competing
4. `MIGRATION_SCOPE_MATRIX.md` — Migrate-first/later/stay decisions
5. `REVISED_PHASE_0.md` — Updated Phase 0 aligned with repo

## Exit Criteria

- [ ] Single baseline document agreed upon
- [ ] All major Supabase touchpoints inventoried
- [ ] All old blockers classified live vs stale
- [ ] Migration objective reframed as "safe surface reduction"
- [ ] Revised Phase 0 contains no duplicate/obsolete tasks
- [ ] Domain list: migrate-first / migrate-later / stay-on-supabase

## No-Go Conditions

**Do not enter Phase 0 if:**

- Readiness source of truth still ambiguous
- Coupling inventory incomplete
- Migration tasks still mixed with already-fixed issues
- CI strategy still assumes "no CI exists" (CI already exists)
- Auth/realtime/storage treated as easy-first migration
