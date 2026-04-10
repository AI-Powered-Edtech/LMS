# Next Action: Phase 0A — API Client Abstraction

**Priority:** START IMMEDIATELY  
**Estimated Duration:** 4 weeks (~60 hours)  
**Goal:** Create `src/services/api/` abstraction layer so feature code never imports Supabase directly

---

## What is Phase 0A?

Phase 0A creates the API client abstraction that all feature modules will use instead of importing Supabase directly. This is the foundation for the entire migration — without it, no subsequent phase can proceed.

**Why?** After Phase 0A:

- Feature code imports `apiClient.query()` instead of `supabase.from()`
- Swapping Supabase for VIL becomes a one-file change (`apiClient` implementation)
- All 129 Supabase import sites get funneled through a single abstraction

---

## Prerequisites Checklist

Before starting Phase 0A, verify:

- [x] Phase -1 Reality Sync complete (all 5 workstreams closed)
- [x] Phase -1 outputs available:
  - `docs/migration/REALITY_SYNC_BASELINE.md`
  - `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
  - `docs/migration/GAP_RECLASSIFICATION.md`
  - `docs/migration/MIGRATION_SCOPE_MATRIX.md`
- [x] Revised Phase 0 plan reviewed: `plans/REVISED_PHASE_0.md`
- [ ] `pnpm` installed and working
- [ ] Repository cloned and `pnpm install` succeeds
- [ ] `pnpm typecheck && pnpm build` passes on current `main`

### Verify with bash

```bash
# Phase -1 outputs exist
ls docs/migration/REALITY_SYNC_BASELINE.md \
   docs/migration/SUPABASE_COUPLING_INVENTORY.md \
   docs/migration/GAP_RECLASSIFICATION.md \
   docs/migration/MIGRATION_SCOPE_MATRIX.md \
   plans/REVISED_PHASE_0.md \
&& echo "PASS: all Phase -1 outputs present" \
|| echo "FAIL: missing Phase -1 outputs"

# src/services/api/ should NOT exist yet
[ ! -d src/services/api ] && echo "PASS: api/ not yet created" || echo "INFO: api/ already exists"

# Build passes
pnpm typecheck && pnpm build && echo "PASS: build clean" || echo "FAIL: fix build first"
```

---

## How to Start Phase 0A

### Step 1: Create Branch

```bash
git checkout -b phase-0/api-abstraction main
```

### Step 2: Create API Client Directory

```bash
mkdir -p src/services/api
```

### Step 3: Follow Task Queue

The detailed task queue for Phase 0A is in:

```
migration-plan-agents/02_PHASE_0_FRONTEND_ABSTRACTION/
```

Review `plans/REVISED_PHASE_0.md` for scope adjustments from Phase -1.

---

## Phase 0A Exit Criteria

Before entering Phase 0B, ALL must be true:

- [ ] `src/services/api/apiClient.ts` exists with typed interface
- [ ] `src/services/api/supabaseApiClient.ts` implements interface using current Supabase client
- [ ] At least one feature module migrated to use `apiClient` instead of direct Supabase imports
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] No regressions in existing E2E tests

### Verify with bash

```bash
# API client files exist
ls src/services/api/apiClient.ts \
   src/services/api/supabaseApiClient.ts \
&& echo "PASS: api client created" \
|| echo "FAIL: api client missing"

# TypeScript compiles
pnpm typecheck && echo "PASS: types clean" || echo "FAIL: type errors"

# Build succeeds
pnpm build && echo "PASS: build clean" || echo "FAIL: build broken"
```

### No-Go Conditions

**DO NOT enter Phase 0B if:**

- API client interface is incomplete or untyped
- Build is broken
- Feature module migration pattern is not proven on at least one module
- CI is not passing

---

## Phase 0A Timeline

| Week | Task | Output |
| --- | --- | --- |
| Week 1 | Design `ApiClient` interface | `src/services/api/apiClient.ts` |
| Week 2 | Implement `SupabaseApiClient` | `src/services/api/supabaseApiClient.ts` |
| Week 3 | Migrate first feature module batch | Updated imports in `src/features/` |
| Week 4 | Migrate remaining + verify | All features using abstraction |

---

## After Phase 0A

1. Run full verification: `pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build`
2. Update `CURRENT_STATUS.md` with Phase 0A completion
3. Update execution readiness score (target: +15 points toward 88/100)
4. Proceed to Phase 0B only after Gate 0A passes

---

## Frozen Phases (DO NOT START)

The following phases are **DITUNDA** until Gate 0A passes and execution readiness reaches 88/100:

- Phase 0B: Service Files Refactoring
- Phase 0C: Auth Abstraction
- Phase 0D: Realtime Abstraction
- Phase 0E: Compatibility Contract Freeze
- Phase 0F: Direct Dependency Audit + CI Guard
- Phase 0G: Verification
- Phase 1 (1A, 1B, 1C, 1D): Auth + Scaffold

---

## Related Documents

- [Current Status](./CURRENT_STATUS.md)
- [Global Rules](./GLOBAL_RULES.md)
- [Phase 0 Directory](../02_PHASE_0_FRONTEND_ABSTRACTION/)
- [Revised Phase 0 Plan](../../plans/REVISED_PHASE_0.md)
- [Coupling Inventory](../../docs/migration/SUPABASE_COUPLING_INVENTORY.md)
- [Architecture Doc](../../docs/ARCHITECTURE.md)
