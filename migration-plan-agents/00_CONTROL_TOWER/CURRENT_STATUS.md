# Current Status

**Last Updated:** 2026-04-10  
**Current Phase:** Phase -1 (COMPLETE)
**Execution Readiness:** 68/100 → Target: 88/100

---

## Codebase Facts (verified 2026-04-10)

### Supabase Import Count

| Location | Count |
| --- | --- |
| `src/features/` | 120 |
| `src/contexts/` | 1 |
| `src/utils/` | 7 |
| `src/components/` | 2 |
| **Total** | **129** |

### Edge Functions: 30

All 30 functions in `supabase/functions/`:

1. `ai-grade-essay`
2. `ai-tutor`
3. `bulk-import-users`
4. `check-plagiarism`
5. `check-rate-limit`
6. `generate-ai-content`
7. `generate-course-outline`
8. `generate-executive-report`
9. `generate-lesson-draft`
10. `generate-parent-report`
11. `generate-pdf`
12. `generate-quiz-from-content`
13. `grade-quiz-attempt`
14. `health-check`
15. `load-quiz-data`
16. `lti-grade-passback`
17. `lti-jwks`
18. `lti-launch`
19. `lti-oidc-login`
20. `process-progress-events`
21. `progress-events`
22. `recommend-learning-path`
23. `scorm-extract`
24. `send-email-digest`
25. `send-parent-digest`
26. `send-parent-otp`
27. `send-push`
28. `transform-course-content`
29. `video-webhook`
30. `whatsapp-webhook`

### Key Path Facts

- `src/services/api/` does NOT exist yet (Phase 0A creates it)
- Hash routing `/#/` is active (HashRouter, not BrowserRouter)
- Phase -1 filled outputs are at `docs/migration/` (4 files):
  - `docs/migration/REALITY_SYNC_BASELINE.md`
  - `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
  - `docs/migration/GAP_RECLASSIFICATION.md`
  - `docs/migration/MIGRATION_SCOPE_MATRIX.md`
- Revised Phase 0 plan is at `plans/REVISED_PHASE_0.md`

### Execution Readiness Score Breakdown: 68/100

| Category | Score | Max | Notes |
| --- | --- | --- | --- |
| Phase -1 deliverables complete | 15 | 15 | All 5 workstreams closed |
| Codebase baseline documented | 10 | 10 | 81/100 production candidate |
| Supabase coupling inventoried | 10 | 10 | 7 buckets classified |
| Gap reclassification done | 8 | 10 | Done, needs agent-executable verification |
| Scope narrowing matrix done | 8 | 10 | Done, needs agent-executable verification |
| Phase 0A task queue ready | 5 | 15 | Task queue exists but not 10/10 execution ready |
| CI gate verified | 2 | 10 | CI exists but not proven green on migration branch |
| Abstraction layer started | 0 | 10 | Not started (Phase 0A) |
| End-to-end verification scripts | 10 | 10 | Playwright framework in place |
| **Total** | **68** | **100** | |

To reach 88/100: complete Phase 0A task queue (full +10), verify CI gate (+8), start abstraction layer (+2).

---

## Phase Completion Checklist

### Phase -1: Reality Sync

- [x] **A: Baseline Truth Refresh**
  - [x] Create `docs/migration/REALITY_SYNC_BASELINE.md`
  - [x] Document current repo state (81/100 production candidate)
  - [x] Inventory all Supabase touchpoints
- [x] **B: Supabase Coupling Inventory**
  - [x] Create `docs/migration/SUPABASE_COUPLING_INVENTORY.md`
  - [x] Classify 7 buckets of coupling
- [x] **C: Gap Classification**
  - [x] Create `docs/migration/GAP_RECLASSIFICATION.md`
  - [x] Classify as Live vs Stale vs Competing
- [x] **D: Scope Narrowing Matrix**
  - [x] Create `docs/migration/MIGRATION_SCOPE_MATRIX.md`
  - [x] Decisions: migrate-first / migrate-later / stay-on-supabase
- [x] **E: Revised Phase 0 Prep**
  - [x] Create `plans/REVISED_PHASE_0.md`
  - [x] Remove duplicate/obsolete tasks

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

1. **Execute Phase -1 Reality Sync** COMPLETE
   - All 5 workstreams closed
   - Outputs available in `docs/migration/` and `plans/`

2. **Phase -1 Exit Criteria Verification** COMPLETE
   - Single baseline document agreed
   - All major Supabase touchpoints inventoried
   - All old blockers classified
   - Migration objective reframed
   - No-Go conditions cleared

3. **Proceed to Phase 0A: API Client Abstraction**
   - Review `plans/REVISED_PHASE_0.md` for updated scope
   - Start with `src/services/api/` foundation

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
| Edge Functions  | ✅ 30              | Need VIL port                               |
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

## Phase -1 Reality Sync Status

| Workstream               | Status    | Output                                          |
| ------------------------ | --------- | ----------------------------------------------- |
| A: Reality Sync Baseline | COMPLETE  | `docs/migration/REALITY_SYNC_BASELINE.md`       |
| B: Coupling Inventory    | COMPLETE  | `docs/migration/SUPABASE_COUPLING_INVENTORY.md` |
| C: Gap Reclassification  | COMPLETE  | `docs/migration/GAP_RECLASSIFICATION.md`        |
| D: Scope Narrowing       | COMPLETE  | `docs/migration/MIGRATION_SCOPE_MATRIX.md`      |
| E: Revised Phase 0       | COMPLETE  | `plans/REVISED_PHASE_0.md`                      |

### Phase -1: COMPLETE

**Next executable scope:** Phase 0A only

**Frozen:**

- Phase 0B (Auth Abstraction)
- Phase 0C (Realtime Abstraction)
- Phase 0D (Storage Abstraction)
- Phase 0E (Verification)
- Phase 1 (Auth + Scaffold)

## Catatan Penting

Phase 0B, 0C, 0D, 0E, 0F, 0G dan Phase 1 (1A, 1B, 1C, 1D) adalah **DITUNDA** hingga:

- Gate RS (Reality Sync) passed
- Gate 0A passed
- Execution readiness mencapai 88/100
