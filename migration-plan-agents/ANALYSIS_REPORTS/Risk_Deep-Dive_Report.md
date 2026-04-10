# Risk Deep-Dive Report

**Analyst:** AI Assistant  
**Date:** 2026-04-10  
**Scope:** All phases in `migration-plan-agents/`

---

## 1. Executive Summary

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Documented Risks | 15 | 3 | 5 | 5 | 2 |
| Gaps Identified | 7 | 2 | 3 | 2 | 0 |
| **Total Risks** | **22** | **5** | **8** | **7** | **2** |

---

## 2. Consolidated Risk Register

### 2.1 Critical Risks (Stop/Block Issues)

| # | Risk | Phase | Impact | Mitigation | Status |
|---|------|-------|--------|------------|--------|
| CR-1 | Password hash mismatch (bcrypt → Argon2) | Phase 1B | Users locked out | Dual-format verification + gradual rehash | ⚠️ HIGH PRIORITY |
| CR-2 | Gate 2 failure (Auth parity) | Phase 1 | All subsequent phases blocked | Shadow mode + extensive testing | ⚠️ HIGH PRIORITY |
| CR-3 | REALITY_SYNC_BASELINE.md is empty template | Phase -1 | No baseline to measure progress | Complete baseline documentation | 🔴 CRITICAL GAP |

### 2.2 High Risks (Major Concerns)

| # | Risk | Phase | Impact | Mitigation | Status |
|---|------|-------|--------|------------|--------|
| HR-1 | Team burnout (long timeline) | All | Project abandonment | Milestones + breaks | ⚠️ |
| HR-2 | Scope creep | All | Timeline extends | Strict scope control | ⚠️ |
| HR-3 | Routing mismatch (hash vs path) | Phase 1 | OAuth broken | Verify before Phase 1B | ⚠️ |
| HR-4 | Abstraction layer bugs | Phase 0 | All phases affected | Comprehensive testing | ⚠️ |
| HR-5 | VIL repository accessibility | Phase 1A | 1A blocked | Verify access early | ⚠️ |
| HR-6 | `get_auth_bootstrap` shape mismatch | Phase 1B | Frontend breaks | Capture exact output first | ⚠️ |
| HR-7 | Batch 2-4 task queues missing | Phase 2 | Phase 2 cannot execute | Add before Phase 1 ends | ⚠️ |
| HR-8 | Execution Readiness score accuracy | All | False confidence | Validate against REALITY_SYNC | ⚠️ |

### 2.3 Medium Risks (Notable Concerns)

| # | Risk | Phase | Impact | Mitigation | Status |
|---|------|-------|--------|------------|--------|
| MR-1 | VIL stability (new framework) | Phase 1+ | Runtime errors | Staging testing + monitoring | ⚠️ |
| MR-2 | RLS → Middleware translation bugs | Phase 1C | Security vulnerabilities | Security audit + penetration testing | ⚠️ |
| MR-3 | MFA gaps | Phase 1B | Security risk | Comprehensive MFA testing | ⚠️ |
| MR-4 | CI gate unverified | All | Regression risk | Test CI before Phase 0A | ⚠️ |
| MR-5 | Realtime reliability < 99.9% | Phase 4 | Poor UX | May need to keep Supabase Realtime | ⚠️ |
| MR-6 | Storage migration data loss | Phase 5 | User data loss | Dual-write + checksum verification | ⚠️ |
| MR-7 | Control Tower documents inconsistent | All | Confusion | Update documents (see Control Tower Report) | ⚠️ |

### 2.4 Low Risks (Minor Concerns)

| # | Risk | Phase | Impact | Mitigation | Status |
|---|------|-------|--------|------------|--------|
| LR-1 | SCORM sandbox limitation | Phase 3D | Some content may not work | Accept limitation | ✅ |
| LR-2 | WhatsApp API changes | Phase 3C | Webhook breaks | Monitor API changes | ✅ |

---

## 3. Gap Analysis Against REALITY_SYNC

### 3.1 REALITY_SYNC_BASELINE.md Issues

| Section | Current State | Issue | Recommended Fix |
|---------|---------------|-------|-----------------|
| Build & Test Status | Template (empty) | No baseline data | Run commands, fill results |
| Repository Metrics | Template (empty) | No counts | Run grep commands, fill |
| Supabase Direct Imports | Template (empty) | No import counts | Run grep, document |
| CI/CD Pipeline | Template (empty) | No status | Verify GitHub Actions |
| Readiness Score | Template (empty) | No self-assessment | Complete assessment |
| Critical Vulnerabilities | Template (empty) | No vulnerability scan | Run security audit |
| Schema Sync Status | Template (empty) | No schema status | Verify Supabase CLI |

**Critical Gap:** REALITY_SYNC_BASELINE.md is 100% template - no actual data!

### 3.2 SUPABASE_COUPLING_INVENTORY.md Analysis

| Bucket | Items Listed | Verified | Notes |
|--------|-------------|----------|-------|
| 1: Auth | 12 | ⚠️ Partial | Needs verification against codebase |
| 2: RPCs | 21+ | ⚠️ Partial | List not exhaustive |
| 3: Realtime | 14 | ✅ Looks complete | 9 hooks + 5 services |
| 4: Storage | 5+ | ⚠️ Partial | Need bucket verification |
| 5: Edge Functions | 22 | ⚠️ Partial | List looks comprehensive |
| 6: Schema | 20+ | ⚠️ Partial | Need actual count |
| 7: Polling | 10+ | ⚠️ Partial | Pattern-based |

---

## 4. Cross-Reference: Risks vs Mitigations

| Risk | Mitigation Provided | Adequate? | Gap |
|------|-------------------|-----------|-----|
| CR-1: Password hash | Dual-format verification | ✅ | None |
| CR-2: Gate 2 failure | Shadow mode + testing | ✅ | None |
| CR-3: Empty baseline | (None) | ❌ | Fill template ASAP |
| HR-1: Team burnout | Milestones | ⚠️ | Need explicit breaks |
| HR-2: Scope creep | Scope control | ⚠️ | Need scope document |
| HR-3: Routing mismatch | Verify before Phase 1B | ⚠️ | Add verification task |
| HR-4: Abstraction bugs | Comprehensive testing | ⚠️ | Need integration tests |
| HR-5: VIL accessibility | (None) | ❌ | Add verification task |
| HR-6: Bootstrap mismatch | Capture output first | ⚠️ | Add capture task |
| HR-7: Missing task queues | (None) | ❌ | Add before Phase 1 |
| HR-8: Score accuracy | (None) | ❌ | Validate baseline |

---

## 5. Missing Mitigations

| Risk | Missing Mitigation | Priority |
|------|-------------------|----------|
| CR-3 | Complete REALITY_SYNC_BASELINE.md | CRITICAL |
| HR-5 | VIL repo accessibility verification | HIGH |
| HR-7 | Add Batch 2-4 task queues | HIGH |
| HR-8 | Execution Readiness validation | HIGH |
| HR-3 | Add OAuth routing verification task | MEDIUM |
| HR-4 | Add integration test suite for abstraction | MEDIUM |

---

## 6. Risk Concentration Analysis

| Phase | Critical Risks | High Risks | Total | Bottleneck? |
|-------|----------------|------------|-------|-------------|
| Phase -1 | 1 | 0 | 1 | No |
| Phase 0A | 0 | 1 | 1 | No |
| Phase 1A | 0 | 2 | 2 | Yes (VIL repo) |
| Phase 1B | 1 | 2 | 3 | Yes (Auth parity) |
| Phase 1C-1D | 0 | 0 | 0 | No |
| Phase 2 | 0 | 1 | 1 | No |
| Phase 3 | 0 | 0 | 0 | No |
| Phase 4 | 0 | 1 | 1 | No |
| Phase 5 | 0 | 1 | 1 | No |
| Phase 6 | 0 | 0 | 0 | No |

**Risk Concentration:** Phase 1 (especially 1A and 1B) has the highest risk concentration.

---

## 7. Effort vs Risk Matrix

| Phase | Effort (hours) | Risk Level | Risk/Effort Ratio |
|-------|----------------|------------|-------------------|
| Phase -1 | 20-30 | Medium | 0.5 |
| Phase 0A | 40-50 | Medium | 0.3 |
| Phase 0B-0D | 100-120 | Medium | 0.25 |
| Phase 1A | 30-40 | **HIGH** | 0.6 |
| Phase 1B | 120-150 | **HIGH** | 0.5 |
| Phase 1C-1D | 80-100 | Medium | 0.3 |
| Phase 2 | 400-500 | Medium | 0.2 |
| Phase 3 | 180-200 | Medium | 0.2 |
| Phase 4 | 140-160 | Medium | 0.2 |
| Phase 5 | 80-100 | Medium | 0.2 |
| Phase 6 | 50-60 | Low | 0.1 |

**Analysis:** Phase 1 (especially 1A and 1B) has disproportionate risk relative to effort.

---

## 8. Recommendations

### Critical (Must Fix Before Phase 1)

1. **Complete REALITY_SYNC_BASELINE.md**
   - Run all build commands
   - Count all imports
   - Complete readiness self-assessment
   - Security audit

2. **Add Batch 2-4 task queues**
   - Cannot execute Phase 2 without these
   - Add before Phase 1 starts

3. **Verify VIL repository access**
   - Clone VIL repo
   - Document API signatures
   - Verify accessibility for CI/CD

### High Priority (Before Phase 1B)

4. **Capture `get_auth_bootstrap` output**
   - Document exact JSON shape
   - Store as reference for parity testing

5. **Add OAuth routing verification task**
   - Verify hash vs path routing
   - Document current state

6. **Validate Execution Readiness score**
   - Cross-reference with REALITY_SYNC
   - Adjust if needed

### Medium Priority (Ongoing)

7. **Add buffer time for Phase 1B**
   - Estimates may be 20-30% short
   - Add 20% buffer

8. **Add integration test suite for Phase 0A**
   - Ensure abstraction layer is solid
   - Prevents cascading bugs

---

## 9. Verdict

| Aspect | Score | Notes |
|--------|-------|-------|
| Risk Coverage | 7/10 | Most risks documented |
| Mitigation Adequacy | 6/10 | Some risks lack mitigation |
| Gap Assessment | 5/10 | Baseline template empty |
| Risk Concentration | 8/10 | Concentrated in Phase 1 |

**Overall Assessment:** ⚠️ **NEEDS ATTENTION BEFORE PHASE 1**

Critical gaps in baseline documentation and missing mitigations for key risks. Phase 1 has disproportionate risk that should be addressed before starting.

---

**Report Generated:** 2026-04-10  
**Next Review:** After REALITY_SYNC_BASELINE.md is completed
