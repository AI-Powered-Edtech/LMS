# Current Status

**Last Updated:** 2026-04-09  
**Current Phase:** Pre-Phase -1 (Planning)
**Execution Readiness:** 68/100 → Target: 88/100

---

## Phase Completion Checklist

### Phase -1: Reality Sync

- [ ] **A: Baseline Truth Refresh**
  - [ ] Create `docs/migration/REALITY_SYNC_BASELINE.md`
  - [ ] Document current repo state (81/100 production candidate)
  - [ ] Inventory all Supabase touchpoints
- [ ] **B: Supabase Coupling Inventory**
  - [ ] Create `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
  - [ ] Classify 7 buckets of coupling
- [ ] **C: Gap Classification**
  - [ ] Create `docs/migration/GAP_RECLASSIFICATION.md`
  - [ ] Classify as Live vs Stale vs Competing
- [ ] **D: Scope Narrowing Matrix**
  - [ ] Create `docs/migration/MIGRATION_SCOPE_MATRIX.md`
  - [ ] Decisions: migrate-first / migrate-later / stay-on-supabase
- [ ] **E: Revised Phase 0 Prep**
  - [ ] Create `plans/REVISED_PHASE_0.md`
  - [ ] Remove duplicate/obsolete tasks

### Phase 0: Frontend Abstraction Layer

- [ ] 0A: API Client Abstraction (Weeks 1-4)
- [ ] 0B: Service Files Refactoring (Weeks 2-6)
- [ ] 0C: Auth Abstraction (Weeks 6-8)
- [ ] 0D: Realtime Abstraction (Weeks 8-9)
- [ ] 0E: Compatibility Contract Freeze (Weeks 8-9)
- [ ] 0F: Direct Dependency Audit + CI Guard (Weeks 9-10)
- [ ] 0G: Verification

### Phase 1: Auth + Scaffold

- [ ] 1A: VIL Scaffold (Weeks 11-14)
- [ ] 1B: Auth Implementation (Weeks 14-20)
- [ ] 1C: Tenant & RBAC Middleware (Weeks 18-20)
- [ ] 1D: Verification

### Phase 2: Core CRUD Endpoints

- [ ] Batch 1: Courses, Classes, Lessons (Weeks 23-28)
- [ ] Batch 2: Assignments, Quizzes, Gradebook (Weeks 28-32)
- [ ] Batch 3: Users, Analytics, Progress (Weeks 32-36)
- [ ] Batch 4: Remaining (Weeks 36-38)

### Phase 3: Edge Functions

- [ ] 3A: AI Functions (Weeks 39-43)
- [ ] 3B: LTI 1.3 Functions (Weeks 43-46)
- [ ] 3C: Notification/Communication (Weeks 46-49)
- [ ] 3D: Processing & Misc (Weeks 49-52)
- [ ] 3E: Background Jobs/Cron (Weeks 50-52)

### Phase 4: Realtime

- [ ] 4A: WebSocket Server (Weeks 53-55)
- [ ] 4B: Port 9 Realtime Consumers (Weeks 55-58)
- [ ] 4C: Verification (Weeks 58-60)

### Phase 5: Storage

- [ ] Deploy MinIO/S3/R2
- [ ] Dual-write period
- [ ] Background migration
- [ ] Switch reads + URL rewriting

### Phase 6: Decommission

- [ ] Remove `@supabase/supabase-js`
- [ ] Remove Edge Functions
- [ ] Remove Supabase config
- [ ] Final E2E + load test

---

## Gate Status

| Gate                     | Status          | Notes                         |
| ------------------------ | --------------- | ----------------------------- |
| Gate 1 (Phase 0)         | **NOT REACHED** | After Phase 0 completion      |
| Gate 2 (Phase 1 Auth)    | **NOT REACHED** | **CRITICAL** — Stop if failed |
| Gate 3 (Phase 2 Batch 1) | **NOT REACHED** | Security check                |
| Gate 4 (Phase 3)         | **NOT REACHED** | Stability check               |
| Gate 5 (Phase 4)         | **NOT REACHED** | Realtime reliability          |
| Gate 6 (Phase 6)         | **NOT REACHED** | Final success                 |

---

## Next Immediate Action Items

1. **Execute Phase -1 Reality Sync**
   - Day 1: Create `docs/migration/` directory
   - Day 1-2: Baseline Truth Refresh
   - Day 2-3: Supabase Coupling Inventory
   - Day 3-4: Gap Classification
   - Day 4-5: Scope Narrowing Matrix
   - Day 5: Revised Phase 0 Prep

2. **Phase -1 Exit Criteria Verification**
   - Single baseline document agreed
   - All major Supabase touchpoints inventoried
   - All old blockers classified
   - Migration objective reframed
   - No-Go conditions cleared

---

## Repository Readiness Status

| Component       | Status             | Notes                                       |
| --------------- | ------------------ | ------------------------------------------- |
| CI/CD           | ✅ Exists          | GitHub Actions, ESLint, Playwright          |
| CI Status       | ⚠️ Exists          | Needs verification (workflow indent issues) |
| E2E Tests       | ✅ 400+ scenarios  | Playwright framework                        |
| Feature Modules | ✅ 48+             | Organized by domain                         |
| Auth            | ✅ Supabase        | Needs abstraction                           |
| Realtime        | ✅ 9 hooks         | Needs abstraction                           |
| Storage         | ✅ Supabase        | Needs abstraction                           |
| Edge Functions  | ✅ 28              | Need VIL port                               |
| Routing         | ✅ Hash-based (#/) | Active                                      |
| TypeScript      | ✅ v5.8            | Strict mode                                 |
| Dark Mode       | ✅ Tailwind        | Need `dark:` variants                       |

---

## Risk Status

| Risk                            | Level        | Mitigation             |
| ------------------------------- | ------------ | ---------------------- |
| Password hash mismatch          | **Critical** | Dual-hash verification |
| Scope creep                     | **High**     | Strict phase gates     |
| Team burnout                    | **High**     | Realistic timeline     |
| Routing mismatch (hash vs path) | **High**     | Sync with plan         |
| Abstraction layer not started   | **High**     | Must complete 0A first |
| CI gate unverified              | **Medium**   | Prove before relying   |
| VIL stability                   | Medium       | Fork to Axum if needed |
| RLS→middleware bugs             | Medium       | Shadow mode testing    |
| MFA gaps                        | Medium       | Port existing logic    |

---

## Success Metrics

### Phase 0

- [ ] Zero Supabase imports in features/
- [ ] Full vertical slice (courses) verified
- [ ] All 400+ E2E scenarios pass
- [ ] `VITE_API_BACKEND=supabase` identical to pre-refactor

### Phase 1

- [ ] All 3 dev accounts can login via VIL
- [ ] `get_auth_bootstrap` shape identical
- [ ] MFA works
- [ ] Multi-tenant isolation verified

## Catatan Penting

Phase 0B, 0C, 0D, 0E, 0F, 0G dan Phase 1 (1A, 1B, 1C, 1D) adalah **DITUNDA** hingga:

- Gate RS (Reality Sync) passed
- Gate 0A passed
- Execution readiness mencapai 88/100
