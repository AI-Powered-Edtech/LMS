# Next Action: Phase 0A - API Client Abstraction

**Priority:** START IMMEDIATELY  
**Estimated Duration:** 1 week (~40 hours)  
**Goal:** Synchronize migration plan with actual repository state

---

## What is Phase -1?

Phase -1 is a preflight check to reconcile the migration plan with the current repository state. The repo is already at **81/100 Production Candidate**, but some plan assumptions may reference older baselines.

**Why?** Prevent entering Phase 0 with:

- Ambiguous source of truth
- Incomplete coupling inventory
- Tasks mixed with already-fixed issues
- CI strategy assuming "no CI exists" (CI already exists)

---

## Prerequisites Checklist

Before starting Phase -1, verify:

- [ ] Access to repository (check CLAUDE.md for current path)
- [ ] `pnpm` installed and working
- [ ] Access to Supabase project dashboard
- [ ] Access to VIL framework documentation
- [ ] Read the migration plan in `migration-plan-agents/` directory

---

## How to Start Phase -1

### Step 1: Create Working Directory

```bash
mkdir -p docs/migration
cd docs/migration
```

### Step 2: Execute Workstream A — Baseline Truth Refresh

Create `REALITY_SYNC_BASELINE.md`:

```markdown
# Reality Sync Baseline

**Date:** YYYY-MM-DD
**Author:** [Agent Name]

## Current Repository State

- Git hash: [latest]
- Production readiness: 81/100
- Feature modules: [count]
- E2E scenarios: 400+ passing (Playwright)

## Supabase Touchpoints

[Inventory all direct Supabase usage]

## Critical Vulnerabilities Status

[Verify if any from old roadmap are already fixed]
```

### Step 3: Execute Workstream B — Coupling Inventory

Create `SUPABASE_COUPLING_INVENTORY.md`:

Document 7 buckets:

1. **Auth/RPC/Functions** — Direct dependency
2. **Realtime** — Active with polling fallback
3. **Storage** — Upload/delete/public URL
4. **Offline sync** — Queue writes
5. **RLS policies** — Security layer
6. **Edge Functions** — 30 functions
7. **Client SDK** — Type definitions

### Step 4: Execute Workstream C — Gap Classification

Create `GAP_RECLASSIFICATION.md`:

| Gap     | Old Status | New Status           | Reason   |
| ------- | ---------- | -------------------- | -------- |
| [gap 1] | [old]      | Live/Stale/Competing | [reason] |

### Step 5: Execute Workstream D — Scope Narrowing

Create `MIGRATION_SCOPE_MATRIX.md`:

| Domain | Decision       | Rationale                  |
| ------ | -------------- | -------------------------- |
| [TBD]  | TBD - Decision | Requires Reality Sync data |
| [TBD]  | TBD - Decision | Requires Reality Sync data |
| ...    | ...            | ...                        |

NOTE: All domain decisions (migrate-first / migrate-later / stay-on-supabase) will be determined by Reality Sync workstream D. Do NOT pre-assign.

### Step 6: Execute Workstream E — Revised Phase 0

Create `plans/REVISED_PHASE_0.md`:

- Remove tasks already completed
- Remove duplicate tasks
- Align with CI-aware approach
- Add tasks discovered in workstreams A-D

---

## Phase -1 Exit Criteria

Before entering Phase 0, ALL must be true:

- [ ] Single baseline document agreed upon
- [ ] All major Supabase touchpoints inventoried
- [ ] All old blockers classified (Live vs Stale vs Competing)
- [ ] Migration objective reframed as "safe surface reduction"
- [ ] Revised Phase 0 contains no duplicate/obsolete tasks
- [ ] Domain list: migrate-first / migrate-later / stay-on-supabase

### No-Go Conditions

**DO NOT enter Phase 0 if:**

- Readiness source of truth still ambiguous
- Coupling inventory incomplete
- Migration tasks still mixed with already-fixed issues
- CI strategy still assumes "no CI exists"
- Auth/realtime/storage treated as easy-first

---

## Phase -1 Timeline

| Day     | Workstream            | Output                           |
| ------- | --------------------- | -------------------------------- |
| Day 1   | A: Baseline Truth     | `REALITY_SYNC_BASELINE.md`       |
| Day 1-2 | B: Coupling Inventory | `SUPABASE_COUPLING_INVENTORY.md` |
| Day 3   | C: Gap Classification | `GAP_RECLASSIFICATION.md`        |
| Day 4   | D: Scope Narrowing    | `MIGRATION_SCOPE_MATRIX.md`      |
| Day 5   | E: Revised Phase 0    | `plans/REVISED_PHASE_0.md`       |

---

## After Phase -1

1. Review deliverables with stakeholders
2. Update master plan if needed
3. Begin Phase 0 with confidence
4. Target: Execution Readiness 88/100

---

## Key Contacts for Phase -1

| Role                     | Responsibility            |
| ------------------------ | ------------------------- |
| Agent executing Phase -1 | All workstreams           |
| Architect                | Baseline truth approval   |
| Product Owner            | Scope narrowing decisions |

---

## Related Documents

- [Control Tower Documents](./)
- [Architecture Doc](../../docs/ARCHITECTURE.md)
- [Database Schema](../../docs/DATABASE.md)
- [Phase 0 Directory](../02_PHASE_0_FRONTEND_ABSTRACTION/)

---

## Status Terkini

Execution Readiness: **88/100** → Target: 88/100

**FROZEN:**

- Phase 0B, 0C, 0D, 0E, 0F, 0G — DITUNDA hingga Gate 0A passed
- Phase 1 (1A, 1B, 1C, 1D) — DITUNDA hingga Gate 1A passed

**ALLOWED NOW:**

- Phase 0A only (API Client Abstraction)
