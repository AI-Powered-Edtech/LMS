# Assessment Plan: TASK_QUEUE_0A — API Client Abstraction

## Confidence Assessment

**Overall Confidence: 88% (High Confidence)**

### Breakdown by Task:

| Task | Complexity | Confidence | Risk Level |
|------|------------|------------|------------|
| 0A-1: types.ts | Low | 95% | Minimal |
| 0A-2: apiClient.ts | Low | 95% | Minimal |
| 0A-3: supabaseApiClient.ts | Medium | 90% | Low |
| 0A-4: vilApiClient.ts | Low | 95% | Minimal |
| 0A-5: index.ts | Low | 98% | Minimal |
| 0A-6: env.schema.ts patch | Low | 92% | Low |
| 0A-7: main.tsx patch | Medium | 88% | Medium |
| 0A-8: courseService.ts refactor | Medium | 85% | Medium |
| 0A-9: Routing Decision doc | Low | 95% | Minimal |
| 0A-10: CI Workflow doc | Low | 90% | Low |
| 0A-11: Full Verification | Medium | 88% | Medium |

### Strengths:
1. Task queue sangat detail dengan kode yang hampir lengkap
2. Scope sangat jelas dengan DO NOT TOUCH boundaries
3. Prerequisites sudah ter-checklist
4. Praktik CI sudah ada (commit, typecheck, lint per task)
5. Codebase EduSync sudah well-structured

### Risks Identified:

| Risk | Mitigation |
|------|------------|
| CI workflow YAML issue (line 55-56 di luar job) | Task 0A-10 hanya VERIFIKASI, tidak fix |
| courseService.ts memiliki banyak method | Refactor hanya import swap, logika tetap sama |
| Missing `docs/migration/` directory | Buat directory jika perlu (read-only operation) |
| Phase -1 belum complete | Task prerequisites harus verified sebelum exec |

---

## Implementation Steps

### Pre-Execution Checklist:
- [ ] Verify Phase -1 Reality Sync is COMPLETE
- [ ] Run baseline: `pnpm typecheck && pnpm lint`
- [ ] Verify `src/services/api/` does NOT exist yet

### Execution Sequence:

**Phase 1: Create Abstraction Layer (Tasks 0A-1 to 0A-5)**

1. **0A-1**: Create `src/services/api/types.ts`
   - Copy exact interface definitions from task queue
   - Verify: `pnpm typecheck`

2. **0A-2**: Create `src/services/api/apiClient.ts`
   - Singleton pattern dengan backend switching
   - Verify: `pnpm typecheck`

3. **0A-3**: Create `src/services/api/supabaseApiClient.ts`
   - Wrap existing supabase singleton
   - Verify: `pnpm typecheck`

4. **0A-4**: Create `src/services/api/vilApiClient.ts`
   - Stub implementation dengan notImplementedError
   - Verify: `pnpm typecheck`

5. **0A-5**: Create `src/services/api/index.ts`
   - Re-export public API
   - Verify: `pnpm typecheck`

**Phase 2: Configuration & Bootstrap (Tasks 0A-6 to 0A-7)**

6. **0A-6**: Patch `src/config/env.schema.ts`
   - Add `VITE_API_BACKEND` optional field
   - Verify: `pnpm typecheck`

7. **0A-7**: Patch `src/main.tsx`
   - Add `initApiClient()` call after validateEnv
   - Verify: `pnpm typecheck && pnpm lint`

**Phase 3: POC Refactoring (Task 0A-8)**

8. **0A-8**: Refactor `src/features/courses/api/courseService.ts`
   - Replace `import { supabase } from '@/services/supabase/client'`
   - Replace with `import { getApiClient } from '@/services/api'`
   - Replace ALL `supabase.from()` calls with `getApiClient().from()`
   - Verify: `pnpm typecheck && pnpm lint`
   - Verify: `grep -n "from '@/services/supabase/client'" src/features/courses/api/courseService.ts` returns 0

**Phase 4: Documentation (Tasks 0A-9 to 0A-10)**

9. **0A-9**: Create `docs/migration/ROUTING_COMPATIBILITY_DECISION.md`
   - Document path-based routing decision

10. **0A-10**: Create `docs/migration/CI_WORKFLOW_VERIFICATION.md`
    - Verify CI workflow structure
    - Note any issues (YAML indentation)

**Phase 5: Final Verification (Task 0A-11)**

11. **0A-11**: Run Full Verification
    - `pnpm typecheck` → 0 errors
    - `pnpm lint` → no new errors
    - `pnpm test:ci` → all pass
    - `pnpm build` → success
    - Final grep checks

---

## Commit Strategy

Each task followed by:
```bash
git add -A && git commit -m "checkpoint: before task 0A-XX"
pnpm typecheck && pnpm lint
# If clean:
git add -A && git commit -m "feat(phase-0a): task 0A-XX completed"
```

---

## Rollback Plan

If any task fails:
```bash
git checkout -- <files>
git commit -m "rollback: task 0A-XX failed"
```

---

## Definition of Done 0A (PR-1)

- [ ] `src/services/api/` has 5 files (types.ts, apiClient.ts, supabaseApiClient.ts, vilApiClient.ts, index.ts)
- [ ] `main.tsx` calls `initApiClient()`
- [ ] `courseService.ts` uses `getApiClient()` (0 direct supabase imports)
- [ ] `pnpm typecheck` = 0 errors
- [ ] `pnpm lint` = no new errors
- [ ] `pnpm test:ci` = all tests pass
- [ ] `pnpm build` = success
- [ ] No auth/realtime/storage files modified

---

## Notes for User

1. **Task ini BUKAN bodoh** - ini adalah standard adapter pattern yang well-understood
2. **VIL stub** sengaja belum implemented (will be done in later phases)
3. **Risk utama**: courseService.ts refactor karena ada fallback logic yang perlu preserved
4. **CI workflow YAML issue** di line 55-56 akan di-NOTED tapi tidak di-FIX dalam task ini
5. **Bahasa Indonesia** harus digunakan untuk semua teks UI baru (sudah di-handle oleh task queue)
