# Task Queue Validation Matrix

**Analyst:** AI Assistant  
**Date:** 2026-04-10  
**Scope:** All task queues in `migration-plan-agents/`

---

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| Total Task Queues | 15 files |
| Total Tasks (estimated) | 200+ |
| Tasks Ready to Start | ~50 (Phase 0A) |
| Tasks Frozen/Blocked | ~150 |
| Potential Gaps | 5 identified |
| Potential Duplicates | 2 identified |

---

## 2. Task Queue Inventory

| Phase | File | Tasks | Status | Notes |
|-------|------|-------|--------|-------|
| -1 | TASK_QUEUE.md | 10 | COMPLETE | Reality Sync done |
| 0A | TASK_QUEUE_0A.md | 15 | READY | Next to execute |
| 0B-0D | TASK_QUEUE_0B_0D.md | 30+ | FROZEN | Depends on 0A |
| 1A | TASK_QUEUE_1A.md | 13 | FROZEN | Depends on Phase 0 |
| 1B | TASK_QUEUE_1B.md | 26 | FROZEN | Depends on 1A |
| 1C-1D | TASK_QUEUE_1C_1D.md | 24 | FROZEN | Depends on 1B |
| 2 Batch 1 | TASK_QUEUE_BATCH_1.md | 27 | FROZEN | Depends on Phase 1 |
| 2 Batch 2 | TASK_QUEUE_BATCH_2.md | TBD | FROZEN | - |
| 2 Batch 3 | TASK_QUEUE_BATCH_3.md | TBD | FROZEN | - |
| 2 Batch 4 | TASK_QUEUE_BATCH_4.md | TBD | FROZEN | - |
| 3A-3B | TASK_QUEUE_3A_3B.md | 12 | FROZEN | - |
| 3C-3E | TASK_QUEUE_3C_3E.md | 18 | FROZEN | - |
| 4 | TASK_QUEUE.md | 13 | FROZEN | - |
| 5 | TASK_QUEUE.md | 12 | FROZEN | - |
| 6 | TASK_QUEUE.md | 14 | FROZEN | - |

---

## 3. Phase-by-Phase Validation

### Phase -1: Reality Sync ✅ COMPLETE

| Task | Status | Validation |
|------|--------|------------|
| RS-01 | ✅ DONE | Baseline documented |
| RS-02 | ✅ DONE | Feature inventory complete |
| RS-03 | ✅ DONE | Coupling inventory done |
| RS-04 | ✅ DONE | Risk register v1 done |

**Validation:** Phase -1 deliverables match control tower claims.

---

### Phase 0A: API Client Abstraction

| Task | Status | Ready | Notes |
|------|--------|-------|-------|
| 0A-1 | PENDING | ✅ | Service structure |
| 0A-2 | PENDING | ✅ | getApiClient() |
| 0A-3 | PENDING | ✅ | Courses API client |
| 0A-4 | PENDING | ✅ | PostgREST format |
| 0A-5 | PENDING | ✅ | Error shape |
| 0A-6 | PENDING | ✅ | React Query adapter |
| 0A-7 | PENDING | ✅ | ESLint rules |
| 0A-8 | PENDING | ✅ | Courses module verification |

**Gap Analysis:** None - all prerequisites ready.

**Validation:** Tasks align with Phase 0 README requirements.

---

### Phase 0B-0D: Auth/Realtime/Storage Abstraction

| Wave | Tasks | Status | Dependencies |
|------|-------|--------|--------------|
| 0-INIT | Provider Init | BLOCKED | 0A must complete |
| 0B | Auth Abstraction | BLOCKED | 0A + 0-INIT |
| 0C | Realtime Abstraction | BLOCKED | 0A + 0-INIT |
| 0D | Storage Abstraction | BLOCKED | 0A + 0-INIT |

**Gap Analysis:**
- **Gap #1:** 0B-0D consumer files list may be incomplete
  - Need to verify against actual codebase
  - 9 realtime consumers listed, verify with grep
  - 5 storage consumers listed, verify with grep

**Validation:** Waves can run in parallel after 0A complete.

---

### Phase 1A: VIL Server Scaffold

| Task | Status | Dependencies | Notes |
|------|--------|--------------|-------|
| 1A-0 | BLOCKED | None | VIL API verification |
| 1A-1 | BLOCKED | 1A-0 | Cargo workspace |
| 1A-2 | BLOCKED | 1A-1 | AppState + DB |
| 1A-3 | BLOCKED | 1A-2 | Model structs |
| 1A-4 | BLOCKED | 1A-2 | VilApp bootstrap |
| ... | ... | ... | 13 tasks total |

**Gap Analysis:**
- **Gap #2:** VIL repo accessibility not confirmed
  - Task 1A-0 clones VIL repo - what if repo is private?
  - Recommendation: Verify VIL repo access early

**Validation:** Dependency chain is sound.

---

### Phase 1B: Auth Implementation

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| 1B-00 | BLOCKED | Low | Schema audit |
| 1B-01 | BLOCKED | High | Users table migration |
| 1B-02 | BLOCKED | Medium | Error types |
| 1B-03 | BLOCKED | High | Dual-format password hash |
| 1B-04 | BLOCKED | Medium | JWT issuance |
| ... | ... | ... | 26 tasks total |

**Gap Analysis:**
- **Gap #3:** `get_auth_bootstrap` RPC output must match Supabase exactly
  - Critical path - frontend depends on exact shape
  - Recommendation: Capture Supabase output before migration

**Validation:** Comprehensive auth flow coverage.

---

### Phase 1C-1D: Tenant & RBAC

| Task | Status | Complexity | Notes |
|------|--------|------------|-------|
| 1C-01 | BLOCKED | High | TenantGuard |
| 1C-02 | BLOCKED | High | RbacGuard with 5 roles |
| 1C-03 | BLOCKED | Medium | SET LOCAL injection |
| ... | ... | ... | 24 tasks total |

**Validation:** 5 roles match spec: admin, principal, teacher, student, parent.

---

### Phase 2: Core CRUD (Batches 1-4)

| Batch | Tasks | Status | Notes |
|-------|-------|--------|-------|
| Batch 1 | 27 | BLOCKED | Courses, Lessons, Classroom, Builder |
| Batch 2 | TBD | BLOCKED | - |
| Batch 3 | TBD | BLOCKED | - |
| Batch 4 | TBD | BLOCKED | - |

**Gap Analysis:**
- **Gap #4:** Batch 2-4 task queues have no content (TBD)
  - Need to populate before Phase 2 can execute
  - Recommendation: Add Batches 2-4 task queues

**Validation:** Batch 1 dependency chain is well-structured.

---

### Phase 3: Edge Functions

| Sub-phase | Tasks | Status |
|-----------|-------|--------|
| 3A | 8 | BLOCKED |
| 3B | 4 | BLOCKED |
| 3C | 7 | BLOCKED |
| 3D | 6 | BLOCKED |
| 3E | 2 | BLOCKED |

**Validation:** Comprehensive coverage of edge functions.

---

### Phase 4-6: Realtime, Storage, Decommission

| Phase | Tasks | Validation |
|-------|-------|------------|
| 4 | 13 | 9 realtime consumers listed - needs verification |
| 5 | 12 | Storage buckets listed - needs verification |
| 6 | 14 | No rollback - final phase |

**Gap Analysis:**
- **Gap #5:** 9 realtime consumers list may need verification
  - Verify with actual grep of `supabase.channel()`
- **Gap #6:** Storage buckets may need verification
  - List: videos, submissions, avatars, documents, certificates

---

## 4. Duplicate Task Check

| Potential Duplicate | Status | Resolution |
|---------------------|--------|------------|
| 0B-6.5: useRoleResolution.ts | OK | Different from 0B-7/0B-8 |
| Cross-cutting task definitions | OK | 0X tasks are additive |

**No significant duplicates found.**

---

## 5. Missing Task Check

| Expected Task | Found | Status |
|----------------|-------|--------|
| Offline queue refactor | ✅ In 0A | Covered |
| Edge function consumers | ✅ In 0X-2 | Covered |
| CI Guard enforce | ✅ In 0X-3 | Covered |

**All major categories covered.**

---

## 6. Realistic Effort Assessment

| Phase | Estimated | Realistic | Notes |
|-------|-----------|-----------|-------|
| Phase 0A | ~40 jam | ~40-50 jam | API abstraction straightforward |
| Phase 0B-0D | ~80 jam | ~100-120 jam | 3 parallel waves may overlap |
| Phase 1A | ~25-35 jam | ~30-40 jam | VIL integration adds complexity |
| Phase 1B | ~95-115 jam | ~120-150 jam | Auth is critical path |
| Phase 1C-1D | ~63-80 jam | ~80-100 jam | Testing may take longer |
| Phase 2 | ~320-400 jam | ~400-500 jam | 4 batches × ~100 jam |
| Phase 3 | ~160 jam | ~180-200 jam | AI functions are complex |
| Phase 4 | ~120 jam | ~140-160 jam | Realtime is tricky |
| Phase 5 | ~80 jam | ~80-100 jam | Storage migration |
| Phase 6 | ~50 jam | ~50-60 jam | Cleanup |

**Total Estimated:** ~1,060 jam  
**Total Realistic:** ~1,200-1,400 jam

---

## 7. Recommendations

### Immediate Actions

1. **Add Batch 2-4 task queues** - Currently TBD
2. **Verify VIL repo access** - Required for Phase 1A
3. **Capture `get_auth_bootstrap` output** - Required before Phase 1B

### Short-term Actions

4. **Verify realtime consumer count** - grep `supabase.channel()`
5. **Verify storage buckets** - List from Supabase dashboard
6. **Add buffer time** - Estimate may be 15-20% short

### Process Improvements

7. **Track actual hours** - Compare with estimates
8. **Add acceptance criteria** - Each task should have clear verify command

---

## 8. Verdict

| Aspect | Score | Notes |
|--------|-------|-------|
| Task Completeness | 8/10 | Most tasks detailed, some TBD |
| Dependency Clarity | 9/10 | Clear dependency graphs |
| Realism | 7/10 | Estimates may be 15-20% short |
| Coverage | 9/10 | All major areas covered |

**Overall Assessment:** ⚠️ **GOOD WITH GAPS**

Task queues are comprehensive but need:
1. Batch 2-4 task content
2. Verification of consumer counts
3. Buffer time adjustment

---

**Report Generated:** 2026-04-10  
**Next Review:** After Phase 0A completion
