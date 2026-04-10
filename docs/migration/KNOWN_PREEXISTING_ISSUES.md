# Known Pre-existing TypeScript Issues

**Status:** Acknowledged pre-Phase-0A issues  
**Date:** 2026-04-10  
**Phase:** Before Phase 0B gate

---

## Issue 1: OfflineSyncIndicator.tsx (13 errors)

**Location:** `src/components/OfflineSyncIndicator.tsx`

**Errors:**
1. `TS2307`: Cannot find module `../utils/conflictResolver`
2. `TS2322`: Type `number` not assignable to `boolean | undefined` (lines 53, 56)
3. `TS18048`: `stats.conflict` possibly undefined (lines 104, 258, 280)
4. `TS2365`: Operator `>` cannot be applied to `boolean` and `number`
5. `TS6133`: `_handleResolveConflict` declared but never read
6. `TS18046`: Various `unknown` type issues (lines 135, 137, 285, 286, 309, 313, 315, 316)

**Root Cause:** Component references `ReplayQueue` utilities that have type mismatches with the component's assumptions. The `ReplayQueueStats` interface may have `conflict: boolean` but the component expects `conflict: number`.

**Impact:** Does not affect Phase 0A API abstraction. Offline sync is a separate feature.

**Recommendation:** Fix in Phase 9 (Deferred/Legacy) or create proper types for ReplayQueue.

---

## Issue 2: useBulkImport.ts (2 errors)

**Location:** `src/features/administration/hooks/useBulkImport.ts`

**Errors:**
1. `TS2459`: `BulkImportResult` not exported from `bulkImportService`
2. `TS2305`: `exportFailedRowsCSV` not exported from `bulkImportService`

**Root Cause:** Import mismatch - the hook imports non-existent exports from the service.

**Impact:** Does not affect Phase 0A or Phase 0B auth abstraction.

**Recommendation:** Fix export mismatch in `bulkImportService.ts` before Phase 2 CRUD migration reaches administration module.

---

## Mitigation

These errors are **not** introduced by Phase 0A implementation. Phase 0A only touches:
- `src/services/api/*` (new)
- `src/config/env.schema.ts` (patch)
- `src/main.tsx` (patch)
- `src/features/courses/api/courseService.ts` (refactor)

**Typecheck status for Phase 0A verification:**
```bash
pnpm typecheck 2>&1 | grep -E "(services/api|courseService)" | wc -l
# Should return 0 (no errors in Phase 0A files)
```

---

## Resolution Options

### Option A: Fix before Phase 0B (recommended for clean CI)
- Fix OfflineSyncIndicator type issues
- Fix bulkImportService exports
- All typecheck errors resolved

### Option B: Acknowledge and proceed (faster gate)
- Document these as known issues
- Add ESLint/tsconfig suppression for these files
- Proceed with Phase 0B

**Decision:** Reserved for Control Tower / Project Owner
