# Phase Dependency Map

**Analyst:** AI Assistant  
**Date:** 2026-04-10  
**Scope:** All phases in `migration-plan-agents/`

---

## 1. Executive Summary

| Metric | Value |
|--------|-------|
| Total Phases | 8 (including Cross-Cutting) |
| Entry Point | Phase -1 (Reality Sync) |
| Critical Path Length | 8 phases |
| Parallelization Opportunities | 2 streams |
| Estimated Total Duration | ~72 weeks (~1,060 hours) |

---

## 2. Dependency Graph (Visual)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CRITICAL PATH                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ Phase -1 │───▶│ Phase 0A│───▶│ Phase 1A │───▶│ Phase 2  │───▶│ Phase 6  │   │
│  │ REALITY  │    │   API   │    │   Auth   │    │   CRUD   │    │DECOMMISSION│  │
│  │   SYNC   │    │Abstract │    │Scaffold  │    │  Batch   │    │           │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │                                                                          │
│       │              ┌──────────────────────────────────────────┐                │
│       │              │         BLOCKED PHASES                   │                │
│       │              ├──────────────────────────────────────────┤                │
│       │              │ Phase 0B-0G: Frozen until Phase 0A OK  │                │
│       │              │ Phase 1A-1D: Frozen until Phase 0 done │                │
│       │              │ Phase 3-5: Frozen until Phase 2 done    │                │
│       │              └──────────────────────────────────────────┘                │
│       │                                                                         │
│       ▼                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐           │
│  │                    CROSS-CUTTING CONCERNS                         │           │
│  │  (Parallel workstreams: CC1, CC2, CC3, CC4, CC5, CC6, CC7, CC8)  │           │
│  └──────────────────────────────────────────────────────────────────┘           │
│       │                                                                         │
│       ▼                                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                                  │
│  │ Phase 3  │───▶│ Phase 4  │───▶│ Phase 5  │                                  │
│  │  Edge    │    │ Realtime │    │ Storage  │                                  │
│  │Functions │    │          │    │          │                                  │
│  └──────────┘    └──────────┘    └──────────┘                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase Dependency Matrix

| From \ To | Phase -1 | Phase 0A | Phase 1A | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 |
|-----------|----------|----------|----------|---------|---------|---------|---------|---------|
| Phase -1 | - | ✅ | - | - | - | - | - | - |
| Phase 0A | - | - | ✅ | - | - | - | - | - |
| Phase 1A | - | - | - | ✅ | - | - | - | - |
| Phase 2 | - | - | - | - | ✅ | - | - | - |
| Phase 3 | - | - | - | - | - | ✅ | - | - |
| Phase 4 | - | - | - | - | - | - | ✅ | - |
| Phase 5 | - | - | - | - | - | - | - | ✅ |
| Phase 6 | - | - | - | - | - | - | - | - |

**Legend:** ✅ = "To" depends on "From"

---

## 4. Phase-by-Phase Dependencies

### Phase -1: Reality Sync
- **Status:** COMPLETE
- **Entry Requirements:** None (entry point)
- **Exit Requirements:** Reality Sync Baseline completed
- **Dependents:** Phase 0A
- **Blockers:** None
- **Deliverables:**
  - Baseline inventory of all Supabase features
  - Coupling inventory with complexity ratings
  - Migration scope definition
  - Risk register v1

### Phase 0A: API Client Abstraction
- **Status:** NEXT - Ready to start
- **Entry Requirements:**
  - Phase -1 COMPLETE
  - Execution Readiness ≥88/100
  - Gate RS passed
  - Gate 0A passed
- **Exit Requirements:** API client abstraction complete
- **Dependents:** Phase 0B-0G, Phase 1A
- **Blockers:** None (ready)
- **Deliverables:**
  - `src/lib/api/client.ts` abstraction
  - `getApiClient()` function
  - PostgREST format compatibility
  - React Query integration
  - ESLint rules for zero Supabase imports

### Phase 0B-0G: Frontend Abstraction (FROZEN)
- **Status:** FROZEN until Phase 0A complete
- **Entry Requirements:** Phase 0A COMPLETE
- **Blockers:** Phase 0A not started

### Phase 1A: Auth & Scaffold
- **Status:** FROZEN until Phase 0 complete
- **Entry Requirements:**
  - Phase 0 COMPLETE
  - VIL server infrastructure ready
  - Database schema available
- **Exit Requirements:** Auth flow verified
- **Dependents:** Phase 1B-1D, Phase 2
- **Blockers:** Phase 0 incomplete, VIL infrastructure

### Phase 1B-1D: Auth Refinement (FROZEN)
- **Status:** FROZEN until Phase 1A complete
- **Blockers:** Phase 1A not started

### Phase 2: Core CRUD Migration
- **Status:** FROZEN until Phase 1 complete
- **Entry Requirements:**
  - Phase 1 COMPLETE
  - Auth middleware stable
  - Database migrations ready
- **Exit Requirements:** All CRUD endpoints migrated
- **Dependents:** Phase 3
- **Blockers:** Phase 1 incomplete
- **Sub-phases:** Batch 1, Batch 2, Batch 3, Batch 4

### Phase 3: Edge Functions Migration
- **Status:** FROZEN until Phase 2 complete
- **Entry Requirements:** Phase 2 COMPLETE
- **Exit Requirements:** All edge functions migrated to VIL
- **Dependents:** Phase 4
- **Blockers:** Phase 2 incomplete

### Phase 4: Realtime Migration
- **Status:** FROZEN until Phase 3 complete
- **Entry Requirements:** Phase 3 COMPLETE
- **Exit Requirements:** Realtime working via VIL
- **Dependents:** Phase 5
- **Blockers:** Phase 3 incomplete

### Phase 5: Storage Migration
- **Status:** FROZEN until Phase 4 complete
- **Entry Requirements:** Phase 4 COMPLETE
- **Exit Requirements:** Supabase Storage decommissioned
- **Dependents:** Phase 6
- **Blockers:** Phase 4 incomplete

### Phase 6: Decommission
- **Status:** FROZEN until Phase 5 complete
- **Entry Requirements:** Phase 5 COMPLETE
- **Exit Requirements:** Supabase fully decommissioned
- **Blockers:** Phase 5 incomplete

---

## 5. Cross-Cutting Concerns Dependencies

Cross-cutting concerns span multiple phases:

| CC | Description | Starts | Depends On | Blocks |
|----|-------------|--------|------------|--------|
| CC1 | Monitoring & Observability | Phase 1 | VIL server | Phase 2+ |
| CC2 | Database Migration Strategy | Phase 0 | Supabase CLI | Phase 1+ |
| CC3 | Staging Environment | Phase 1 | Infrastructure | Phase 2+ |
| CC4 | Rate Limiting | Phase 2 | Auth & CRUD | Phase 3+ |
| CC5 | Graceful Degradation | Phase 3 | CRUD ready | Phase 4+ |
| CC6 | Offline Queue Semantics | Phase 1 | PWA ready | Phase 2+ |
| CC7 | Worker Queue Runtime | Phase 2 | Auth ready | Phase 3+ |
| CC8 | Frontend Runtime Compatibility | Phase 1 | Feature flags | Phase 2+ |

---

## 6. Gate Dependencies

| Gate | Name | Prerequisite Phases | Blocks |
|------|------|-------------------|--------|
| Gate 0A | API Abstraction | Phase -1 | Phase 0B-G |
| Gate 0 | Frontend Abstraction | Phase 0 complete | Phase 1 |
| Gate 1 | Auth & Scaffold | Phase 1 | Phase 2 |
| Gate 2 | Core CRUD (CRITICAL) | Phase 2 Batch 1 | Phase 2 Batches 2-4, Phase 3 |
| Gate 3 | Edge Functions | Phase 3 | Phase 4 |
| Gate 4 | Realtime | Phase 4 | Phase 5 |
| Gate 5 | Storage | Phase 5 | Phase 6 |
| Gate 6 | Final | Phase 6 | None |

---

## 7. Critical Path Analysis

### Critical Path (Longest Chain)
```
Phase -1 → Phase 0A → Phase 1A → Phase 2 → Phase 6
```
**Duration:** ~72 weeks (as estimated)

### Parallelization Opportunities

| Stream | Phases | Can Run Parallel To |
|--------|--------|---------------------|
| Auth Flow | Phase 1A-1D | Phase 2 Batch 1 |
| Edge Functions | Phase 3 | Phase 4 Realtime |
| Storage | Phase 5 | - |

### Bottlenecks

1. **Phase 0A:** Single dependency for all Phase 1+
2. **Phase 1A:** Critical gate for Phase 2
3. **Phase 2 Batch 1:** Gate 2 blocks all Phase 3+
4. **Phase 6:** Final dependency with no rollback

---

## 8. Circular Dependency Check

| Check | Result |
|-------|--------|
| Phase A needs B, B needs A | ✅ None found |
| Self-referential tasks | ✅ None found |
| Missing prerequisites | ✅ None found |

---

## 9. Recommendations

### Quick Wins

1. **Parallelize Phase 0B-0G work early** - Start planning while Phase 0A executes
2. **Decouple CC4-CC5 from critical path** - These can start later without blocking

### Risk Mitigation

3. **Add buffer after Gate 2** - Phase 2 Batch 1 is critical path
4. **Early VIL infrastructure setup** - Blocked phases depend on VIL being ready

### Process Improvements

5. **Document phase handoffs** - Each phase should have clear acceptance criteria
6. **Track cross-phase dependencies explicitly** - CC1-CC8 span multiple phases

---

## 10. Verdict

| Aspect | Score | Notes |
|--------|-------|-------|
| Dependency Clarity | 9/10 | Clear chain with blockers |
| Parallelization | 7/10 | Limited opportunities |
| Gate Soundness | 10/10 | Logical progression |
| Risk Distribution | 8/10 | Concentrated risk at Gate 2 |

**Overall Assessment:** ✅ **SOUND STRUCTURE**

The phase dependencies are well-defined with clear blocking relationships. Critical path is straightforward. Main concern is limited parallelization opportunities.

---

**Report Generated:** 2026-04-10  
**Next Review:** After Phase 0A completion
