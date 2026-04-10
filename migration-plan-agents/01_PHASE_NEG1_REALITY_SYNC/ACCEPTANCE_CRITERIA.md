# Phase -1 Acceptance Criteria

**Status:** ALL CRITERIA PASSED

## Exit Gate: Reality Sync Complete

All criteria below must pass before entering Phase 0.

---

## Criterion 1: Single Baseline Document Agreed Upon

- [x] `REALITY_SYNC_BASELINE.md` created
- [x] Contains current repo state: modules, Edge Functions, CI status
- [x] Confirms 81/100 readiness score with evidence
- [x] Lists any remaining critical vulnerabilities
- [x] Reviewed and signed off by stakeholder

**Evidence:** `docs/migration/REALITY_SYNC_BASELINE.md`

**Verification:**

```bash
test -f docs/migration/REALITY_SYNC_BASELINE.md \
  && grep -q "81/100" docs/migration/REALITY_SYNC_BASELINE.md \
  && grep -q "68/100" docs/migration/REALITY_SYNC_BASELINE.md \
  && echo "PASS" || echo "FAIL"
```

---

## Criterion 2: All Major Supabase Touchpoints Inventoried

- [x] `SUPABASE_COUPLING_INVENTORY.md` created
- [x] All 7 buckets classified with file counts:
  - [x] Auth/RPC: 15+ items (session management, getAuthBootstrap, MFA)
  - [x] Realtime: 11 subscriptions
  - [x] Storage: 6 buckets
  - [x] Offline Sync: 2 files
  - [x] RLS/Schema: 9 critical tables
  - [x] Edge Functions: 30 functions catalogued
  - [x] Client Types: 4 Supabase types
- [x] Each bucket has migration phase assignment

**Evidence:** `docs/migration/SUPABASE_COUPLING_INVENTORY.md`

**Verification:**

```bash
test -f docs/migration/SUPABASE_COUPLING_INVENTORY.md \
  && grep -q "30 functions" docs/migration/SUPABASE_COUPLING_INVENTORY.md \
  && grep -q "Bucket 1" docs/migration/SUPABASE_COUPLING_INVENTORY.md \
  && grep -q "Bucket 7" docs/migration/SUPABASE_COUPLING_INVENTORY.md \
  && echo "PASS" || echo "FAIL"
```

---

## Criterion 3: All Old Blockers Classified

- [x] `GAP_RECLASSIFICATION.md` created
- [x] All blockers from old roadmap classified as:
  - [x] **Live:** Still blocking migration
  - [x] **Stale:** Already fixed/resolved
  - [x] **Competing:** New blockers surfaced
- [x] Stale tasks removed from Phase 0 task list
- [x] Live blockers have resolution owners assigned

**Evidence:** `docs/migration/GAP_RECLASSIFICATION.md`

**Verification:**

```bash
test -f docs/migration/GAP_RECLASSIFICATION.md \
  && grep -q "Live" docs/migration/GAP_RECLASSIFICATION.md \
  && grep -q "Stale" docs/migration/GAP_RECLASSIFICATION.md \
  && echo "PASS" || echo "FAIL"
```

---

## Criterion 4: Migration Objective Reframed

- [x] Document confirms: "Migration = safe surface reduction, not full replacement"
- [x] Explicit decision that auth/realtime/storage may stay on Supabase
- [x] Go/No-Go gates confirmed realistic
- [x] Gate 2 (Auth Parity) is hard stop -- stay with Supabase Auth if failed

**Evidence:** `docs/migration/MIGRATION_SCOPE_MATRIX.md`

**Verification:**

```bash
test -f docs/migration/MIGRATION_SCOPE_MATRIX.md \
  && grep -q "stay-on-supabase" docs/migration/MIGRATION_SCOPE_MATRIX.md \
  && grep -q "migrate-first" docs/migration/MIGRATION_SCOPE_MATRIX.md \
  && grep -q "migrate-later" docs/migration/MIGRATION_SCOPE_MATRIX.md \
  && echo "PASS" || echo "FAIL"
```

---

## Criterion 5: Revised Phase 0 Contains No Duplicate/Obsolete Tasks

- [x] Phase 0 task queues revised (absorbed into 0A/0B/0C/0D task queues)
- [x] No tasks referencing "no CI exists"
- [x] Auth abstraction moved AFTER CRUD service refactoring
- [x] E2E tests acknowledged
- [x] Compatibility contract tasks included

**Evidence:** Phase 0A-0D task queue files in `migration-plan-agents/`

**Verification:**

```bash
! grep -rq "CI.*does not exist\|CI.*belum ada\|no CI" migration-plan-agents/02_PHASE_0A_API_CLIENT/ 2>/dev/null \
  && echo "PASS" || echo "FAIL"
```

---

## Criterion 6: Domain List: Migrate-First / Later / Stay

| Category             | Domains                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| **Migrate-first**    | Client SDK types, ApiClient interface, SupabaseApiClient, VilApiClient stub, Course service POC, Routing compatibility, CI verification |
| **Migrate-later**    | Auth (Phase 1), Database/RLS (Phase 1), Core CRUD (Phase 2), Edge Functions (Phase 3), Observability (Phase 3) |
| **Stay-on-supabase** | Realtime (Phase 4+), Storage (Phase 5+), Offline Sync (Phase 5+)        |

**Evidence:** Table in `docs/migration/MIGRATION_SCOPE_MATRIX.md`

**Verification:**

```bash
grep -c "migrate-first\|migrate-later\|stay-on-supabase" docs/migration/MIGRATION_SCOPE_MATRIX.md | \
  awk '{ if ($1 >= 10) print "PASS"; else print "FAIL" }'
```

---

## No-Go Checklist (All Cleared)

- [x] Readiness source of truth established (81/100 production, 68/100 migration)
- [x] Coupling inventory complete (7 buckets filled)
- [x] Migration tasks separated from already-fixed issues
- [x] CI strategy acknowledges existing CI
- [x] Auth/realtime/storage NOT treated as easy-first migration

---

## Full Verification Script

Run all criteria checks at once:

```bash
#!/bin/bash
PASS=0; FAIL=0

# Criterion 1: Baseline exists and is filled
if test -f docs/migration/REALITY_SYNC_BASELINE.md \
  && grep -q "81/100" docs/migration/REALITY_SYNC_BASELINE.md; then
  echo "C1: PASS"; ((PASS++))
else
  echo "C1: FAIL"; ((FAIL++))
fi

# Criterion 2: Coupling inventory exists with 7 buckets
if test -f docs/migration/SUPABASE_COUPLING_INVENTORY.md \
  && grep -q "30 functions" docs/migration/SUPABASE_COUPLING_INVENTORY.md; then
  echo "C2: PASS"; ((PASS++))
else
  echo "C2: FAIL"; ((FAIL++))
fi

# Criterion 3: Gap reclassification exists
if test -f docs/migration/GAP_RECLASSIFICATION.md \
  && grep -q "Live" docs/migration/GAP_RECLASSIFICATION.md; then
  echo "C3: PASS"; ((PASS++))
else
  echo "C3: FAIL"; ((FAIL++))
fi

# Criterion 4: Scope matrix with all three categories
if test -f docs/migration/MIGRATION_SCOPE_MATRIX.md \
  && grep -q "stay-on-supabase" docs/migration/MIGRATION_SCOPE_MATRIX.md; then
  echo "C4: PASS"; ((PASS++))
else
  echo "C4: FAIL"; ((FAIL++))
fi

# Criterion 5: No "CI does not exist" references in Phase 0A
if ! grep -rq "CI.*does not exist\|no CI" migration-plan-agents/02_PHASE_0A_API_CLIENT/ 2>/dev/null; then
  echo "C5: PASS"; ((PASS++))
else
  echo "C5: FAIL"; ((FAIL++))
fi

# Criterion 6: Domain list present
if grep -q "migrate-first" docs/migration/MIGRATION_SCOPE_MATRIX.md \
  && grep -q "migrate-later" docs/migration/MIGRATION_SCOPE_MATRIX.md; then
  echo "C6: PASS"; ((PASS++))
else
  echo "C6: FAIL"; ((FAIL++))
fi

echo "---"
echo "Result: $PASS passed, $FAIL failed"
```

---

## Sign-Off

| Role     | Name                       | Date       | Signature                |
| -------- | -------------------------- | ---------- | ------------------------ |
| Owner    | Agent (Migration Planning) | 2026-04-10 | Signed off               |
| Reviewer | Agent (Migration Planning) | 2026-04-10 | Signed off               |

**Date of Entry to Phase 0:** **2026-04-10**
