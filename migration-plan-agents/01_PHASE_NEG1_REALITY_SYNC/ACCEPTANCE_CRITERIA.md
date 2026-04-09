# Phase -1 Acceptance Criteria

## Exit Gate: Reality Sync Complete

All criteria below must pass before entering Phase 0.

---

## Criterion 1: Single Baseline Document Agreed Upon

- [ ] `REALITY_SYNC_BASELINE.md` created
- [ ] Contains current repo state: modules, Edge Functions, CI status
- [ ] Confirms 81/100 readiness score with evidence
- [ ] Lists any remaining critical vulnerabilities
- [ ] Reviewed and signed off by stakeholder

**Evidence Required:** File exists at `migration-plan-agents/01_PHASE_NEG1_REALITY_SYNC/REALITY_SYNC_BASELINE.md`

---

## Criterion 2: All Major Supabase Touchpoints Inventoried

- [ ] `SUPABASE_COUPLING_INVENTORY.md` created
- [ ] All 7 buckets classified with file counts:
  - [ ] Auth: session management, getAuthBootstrap, MFA
  - [ ] RPCs: 21+ analytics procedures
  - [ ] Realtime: 9 hooks + 5 services
  - [ ] Storage: upload/delete/getPublicUrl calls
  - [ ] Edge Functions: 22 functions catalogued
  - [ ] Schema: RLS policies, triggers, functions
  - [ ] Fallback: polling mechanisms
- [ ] Each bucket has migration phase assignment

**Evidence Required:** File exists at `migration-plan-agents/01_PHASE_NEG1_REALITY_SYNC/SUPABASE_COUPLING_INVENTORY.md`

---

## Criterion 3: All Old Blockers Classified

- [ ] `GAP_RECLASSIFICATION.md` created
- [ ] All blockers from old roadmap classified as:
  - [ ] **Live:** Still blocking migration
  - [ ] **Stale:** Already fixed/resolved
  - [ ] **Competing:** New blockers surfaced
- [ ] Stale tasks removed from Phase 0 task list
- [ ] Live blockers have resolution owners assigned

**Evidence Required:** File exists at `migration-plan-agents/01_PHASE_NEG1_REALITY_SYNC/GAP_RECLASSIFICATION.md`

---

## Criterion 4: Migration Objective Reframed

- [ ] Document confirms: "Migration = safe surface reduction, not full replacement"
- [ ] Explicit decision that auth/realtime/storage may stay on Supabase
- [ ] Go/No-Go gates confirmed realistic
- [ ] Gate 2 (Auth Parity) is hard stop — stay with Supabase Auth if failed

**Evidence Required:** Statement in `MIGRATION_SCOPE_MATRIX.md`

---

## Criterion 5: Revised Phase 0 Contains No Duplicate/Obsolete Tasks

- [ ] `REVISED_PHASE_0.md` created
- [ ] No tasks referencing "no CI exists"
- [ ] Auth abstraction moved AFTER CRUD service refactoring
- [ ] All 51 E2E tests acknowledged
- [ ] Compatibility contract tasks included

**Evidence Required:** File exists at `migration-plan-agents/01_PHASE_NEG1_REALITY_SYNC/REVISED_PHASE_0.md`

---

## Criterion 6: Domain List: Migrate-First / Later / Stay

| Category             | Domains                                                            |
| -------------------- | ------------------------------------------------------------------ |
| **Migrate-first**    | API Client, Course CRUD (POC vertical slice)                       |
| **Migrate-later**    | Auth (Phase 1), Analytics RPCs (Phase 2), Edge Functions (Phase 3) |
| **Stay-on-supabase** | Realtime (if Gate 4 fails), Storage (cost/effort decision)         |

**Evidence Required:** Table in `MIGRATION_SCOPE_MATRIX.md`

---

## No-Go Checklist

If ANY of these are true, do NOT enter Phase 0:

- [ ] Readiness source of truth still ambiguous
- [ ] Coupling inventory incomplete (missing buckets)
- [ ] Migration tasks still mixed with already-fixed issues
- [ ] CI strategy still assumes "no CI exists"
- [ ] Auth/realtime/storage treated as easy-first migration

---

## Sign-Off

| Role     | Name | Date | Signature |
| -------- | ---- | ---- | --------- |
| Owner    |      |      |           |
| Reviewer |      |      |           |

**Date of Entry to Phase 0:** **\*\***\_\_\_**\*\***
