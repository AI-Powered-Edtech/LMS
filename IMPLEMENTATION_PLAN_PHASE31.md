# Phase 31: Production Readiness Hardening — Implementation Plan

> **Created:** 2026-04-06
> **Status:** Proposed
> **Scope:** Address gaps identified in Codebase Analysis Report (April 2026)
> **Predecessor:** Phase 30 (Principal Dashboard) — COMPLETED

---

## Executive Summary

Setelah Phase 26-30 selesai, codebase memiliki **49 feature modules** dan **26 edge functions** dengan status production-ready. Plan ini fokus pada **meningkatkan skor kategori yang di bawah threshold** dan **membersihkan technical debt** sebelum production deployment.

### Target Skor

| Kategori              | Skor Saat Ini | Target | Gap  |
| --------------------- | ------------- | ------ | ---- |
| AI Features           | 71/100        | 85/100 | +14  |
| Integrations          | 77/100        | 85/100 | +8   |
| Notifications         | 75/100        | 85/100 | +10  |
| ESLint Warnings       | 2300          | <500   | -80% |
| Test Coverage         | ~40%          | 70%    | +30% |

---

## Phase 31A: AI Features Hardening (2 minggu) — Skor 71 → 85

### 31A.1 Consistent Error Handling & Fallbacks

**Problem:** AI modules (ai-authoring, ai-quiz-gen, ai-recommendations, creator) tidak memiliki error handling yang konsisten. Tidak ada fallback saat Groq API down/rate-limited.

**Impact:** HIGH — User experience buruk saat AI service gagal

**Solution:**

- Buat shared `AIErrorBoundary` component untuk semua AI features
- Implementasi exponential backoff retry logic untuk semua AI calls
- Tambah graceful fallback: tampilkan cached results atau manual mode
- Standardize error messages dalam Bahasa Indonesia
- Tambah circuit breaker pattern untuk prevent cascade failures

**Files touched:**

- `src/features/ai-tutor/components/AIErrorBoundary.tsx` — new component
- `src/features/ai-tutor/utils/aiRetryStrategy.ts` — new utility
- `src/features/ai-authoring/api/aiAuthoringService.ts` — add error handling
- `src/features/ai-quiz-gen/api/aiQuizGenService.ts` — add error handling
- `src/features/ai-recommendations/api/recommendationService.ts` — add error handling
- `src/features/creator/api/creatorApi.ts` — add error handling
- `src/shared/components/AIErrorFallback.tsx` — shared fallback component

**Estimasi:** 4 hari

### 31A.2 AI Rate Limiting & Quota Management

**Problem:** Tidak ada visual feedback untuk user saat mendekati API quota limit

**Impact:** MEDIUM — User bisa kehabisan quota tanpa warning

**Solution:**

- Tambah AI usage counter di user dashboard
- Implementasi rate limit indicator (progress bar)
- Tambah warning saat 80% quota terpakai
- Graceful degradation saat quota habis

**Files touched:**

- `src/features/ai-tutor/components/AIUsageIndicator.tsx` — new component
- `src/features/ai-tutor/hooks/useAIQuota.ts` — new hook
- `supabase/migrations/031_ai_quota_tracking.sql` — migration
- `src/features/dashboards/components/AIUsageWidget.tsx` — new widget

**Estimasi:** 3 hari

### 31A.3 AI Content Quality Validation

**Problem:** AI-generated content tidak divalidasi sebelum disimpan

**Impact:** MEDIUM — Risiko konten tidak sesuai atau malformed

**Solution:**

- Tambah validation layer untuk AI-generated content
- Check untuk: profanity, inappropriate content, malformed JSON
- Auto-flag suspicious content untuk moderation review
- Tambah "Report AI Content" button

**Files touched:**

- `src/features/ai-authoring/utils/contentValidator.ts` — new utility
- `src/features/moderation/components/AIContentReview.tsx` — new component
- `supabase/migrations/031_ai_content_validation.sql` — migration

**Estimasi:** 3 hari

---

## Phase 31B: Integration Hardening (2 minggu) — Skor 77 → 85

### 31B.1 LTI 1.3 Edge Case Handling

**Problem:** LTI integration tidak handle edge cases: expired tokens, malformed launches, platform-specific quirks

**Impact:** HIGH — LTI launch gagal di production

**Solution:**

- Tambah comprehensive error handling untuk LTI flows
- Handle: expired JWT, missing claims, invalid signatures
- Tambah LTI launch diagnostics panel untuk debugging
- Implementasi LTI launch retry dengan user-friendly messages
- Tambah LTI health check endpoint

**Files touched:**

- `src/features/lti/api/ltiService.ts` — enhance error handling
- `src/features/lti/components/LTILaunchDiagnostics.tsx` — new component
- `src/features/lti/components/LTIErrorBoundary.tsx` — new component
- `src/features/lti/utils/ltiErrorHandler.ts` — new utility
- `supabase/functions/lti-launch/index.ts` — enhance error handling
- `docs/features/lti.md` — update documentation

**Estimasi:** 4 hari

### 31B.2 Video Playback Resilience

**Problem:** Video playback tidak handle network interruptions, CORS issues, atau format incompatibilities

**Impact:** MEDIUM — Student tidak bisa nonton video

**Solution:**

- Tambah video playback retry logic
- Implementasi quality auto-downgrade saat bandwidth rendah
- Tambah offline fallback: show transcript saat video gagal load
- Handle CORS errors dengan graceful messaging
- Tambah video diagnostics panel untuk troubleshooting

**Files touched:**

- `src/features/video/components/SmartVideoPlayer.tsx` — enhance existing
- `src/features/video/hooks/useVideoResilience.ts` — new hook
- `src/features/video/utils/videoErrorHandler.ts` — new utility
- `src/features/lessons/components/VideoFallbackHandler.tsx` — new component

**Estimasi:** 3 hari

### 31B.3 XAPI/LRS Robustness

**Problem:** XAPI statements bisa fail tanpa user feedback, tidak ada offline queue

**Impact:** LOW-MEDIUM — Learning analytics tidak akurat

**Solution:**

- Implementasi XAPI statement queue dengan retry
- Offline queue: store statements saat offline, sync saat online
- Tambah XAPI diagnostics panel
- Validate statements sebelum send

**Files touched:**

- `src/features/xapi/services/xapiQueue.ts` — new service
- `src/features/xapi/hooks/useXAPIStatement.ts` — enhance existing
- `src/features/xapi/components/XAPIDiagnostics.tsx` — new component
- `src/features/xapi/utils/statementValidator.ts` — new utility

**Estimasi:** 3 hari

---

## Phase 31C: Notification System Upgrade (1 minggu) — Skor 75 → 85

### 31C.1 Replace Polling with Batching

**Problem:** Notifications menggunakan polling setiap 30 detik — tidak efisien dan tidak real-time

**Impact:** MEDIUM — Battery drain, server load, delayed notifications

**Solution:**

- Ganti polling dengan Supabase Realtime subscriptions (WebSocket)
- Implementasi notification batching: group similar notifications
- Tambah notification preferences per type
- Implementasi smart polling: hanya saat user active

**Files touched:**

- `src/features/notifications/services/notificationRealtime.ts` — new service
- `src/features/notifications/hooks/useNotificationBatching.ts` — new hook
- `src/features/notifications/components/NotificationPreferences.tsx` — new component
- `src/features/notifications/api/notificationApi.ts` — refactor polling logic
- `supabase/migrations/031_notification_batching.sql` — migration

**Estimasi:** 4 hari

### 31C.2 Notification Delivery Channels

**Problem:** Hanya in-app notifications, tidak ada email/push/WhatsApp integration

**Impact:** LOW — User miss important notifications

**Solution:**

- Tambah email notification delivery (gunakan Supabase Edge Functions)
- Tambah browser push notifications (Web Push API)
- Tambah notification channel preferences
- Implementasi notification digest (daily/weekly summary)

**Files touched:**

- `supabase/functions/send-notification-email/index.ts` — new Edge Function
- `supabase/functions/send-push-notification/index.ts` — new Edge Function
- `src/features/notifications/services/pushNotificationService.ts` — new service
- `src/features/notifications/components/ChannelPreferences.tsx` — new component

**Estimasi:** 3 hari

---

## Phase 31D: ESLint Cleanup (1 minggu) — 2300 → <500 warnings

### 31D.1 Add Missing Return Types

**Problem:** ~1500 warnings dari missing return type annotations pada functions

**Impact:** LOW — TypeScript strictness, maintainability

**Solution:**

- Run ESLint dengan `--fix` untuk auto-fixable rules
- Manual add return types untuk complex functions
- Tambah ESLint rule: `@typescript-eslint/explicit-function-return-type` (warn level)
- Focus pada: hooks, API services, utilities

**Files touched:**

- `src/features/**/*.ts` — batch update return types
- `eslint.config.js` — adjust rules
- `.eslintrc.json` — update if needed

**Estimasi:** 3 hari

**Approach:**

```bash
# 1. Auto-fix what we can
pnpm lint --fix

# 2. Generate report of remaining warnings
pnpm lint > eslint-report.txt 2>&1

# 3. Batch fix by file group
# Use TS server quick fixes for return types
```

### 31D.2 Reduce `any` Usage

**Problem:** ~800 warnings dari `no-explicit-any` rule

**Impact:** MEDIUM — Type safety compromised

**Solution:**

- Replace `any` dengan proper types: `unknown`, generics, specific interfaces
- Tambah `@typescript-eslint/no-explicit-any` rule (warn level)
- Focus pada: API responses, event handlers, dynamic data

**Files touched:**

- `src/features/**/*.ts` — replace `any` with proper types
- `src/shared/**/*.ts` — replace `any` with proper types
- `src/utils/**/*.ts` — replace `any` with proper types

**Estimasi:** 4 hari

### 31D.3 Other ESLint Warnings

**Problem:** Sisa warnings: unused vars, missing key props, deprecated APIs

**Impact:** LOW — Code quality

**Solution:**

- Fix unused imports/vars
- Add missing `key` props in lists
- Replace deprecated API calls
- Enable stricter ESLint rules gradually

**Estimasi:** 2 hari

---

## Phase 31E: Test Coverage Expansion (2 minggu) — ~40% → 70%

### 31E.1 Unit Tests for AI Modules

**Problem:** AI modules tidak ada tests atau tests minimal

**Impact:** HIGH — Regression risk

**Solution:**

- Tambah unit tests untuk AI service layers
- Mock Groq API calls
- Test error handling paths
- Test retry logic

**Files touched:**

- `src/features/ai-authoring/__tests__/aiAuthoringService.test.ts` — enhance
- `src/features/ai-quiz-gen/__tests__/aiQuizGenService.test.ts` — enhance
- `src/features/ai-recommendations/__tests__/` — new test files
- `src/features/ai-tutor/__tests__/aiTutorService.test.ts` — enhance
- `src/features/creator/__tests__/` — new test files

**Estimasi:** 4 hari

### 31E.2 Unit Tests for Integrations

**Problem:** LTI, video, xapi modules tidak ada tests

**Impact:** MEDIUM — Integration failures

**Solution:**

- Tambah unit tests untuk LTI service
- Test video player edge cases
- Test XAPI statement validation
- Mock external API calls

**Files touched:**

- `src/features/lti/__tests__/ltiService.test.ts` — new test files
- `src/features/video/__tests__/videoPlayer.test.tsx` — new test files
- `src/features/xapi/__tests__/xapiService.test.ts` — new test files

**Estimasi:** 3 hari

### 31E.3 Integration Tests for Critical Flows

**Problem:** Tidak ada integration tests untuk user flows penting

**Impact:** HIGH — End-to-end failures

**Solution:**

- Tambah integration tests untuk:
  - Student quiz submission flow
  - Teacher grading flow
  - Course enrollment flow
  - Parent portal login flow
- Gunakan Vitest dengan Supabase test database

**Files touched:**

- `tests/integration/quizSubmission.test.ts` — new file
- `tests/integration/gradingFlow.test.ts` — new file
- `tests/integration/enrollmentFlow.test.ts` — new file
- `tests/integration/parentPortal.test.ts` — new file

**Estimasi:** 5 hari

### 31E.4 Component Tests for UI Primitives

**Problem:** UI components tidak ada tests

**Impact:** MEDIUM — UI regressions

**Solution:**

- Tambah component tests untuk UI primitives
- Test rendering, props, interactions
- Test dark mode variants
- Test accessibility (axe-core)

**Files touched:**

- `src/components/ui/__tests__/Button.test.tsx` — new file
- `src/components/ui/__tests__/Modal.test.tsx` — new file
- `src/components/ui/__tests__/DataTable.test.tsx` — new file
- `src/components/ui/__tests__/FormFields.test.tsx` — new file

**Estimasi:** 3 hari

---

## Phase 31F: Performance Optimization (1 minggu)

### 31F.1 Code Splitting & Lazy Loading

**Problem:** Beberapa route tidak lazy-loaded, initial bundle besar

**Impact:** MEDIUM — Slow initial load

**Solution:**

- Tambah `React.lazy()` untuk semua route-level components
- Implementasi route-based code splitting
- Tambah loading skeletons untuk lazy routes
- Analyze bundle dengan `pnpm analyze`

**Files touched:**

- `src/app/routes.tsx` — add lazy loading
- `src/app/routes/*.tsx` — convert to lazy components
- `vite.config.ts` — optimize build config

**Estimasi:** 2 hari

### 31F.2 Database Query Optimization

**Problem:** Beberapa queries tidak optimized, missing indexes

**Impact:** MEDIUM — Slow page loads

**Solution:**

- Review slow queries dengan EXPLAIN ANALYZE
- Tambah missing indexes untuk frequently-queried columns
- Implementasi materialized views untuk complex analytics
- Add query result caching dengan React Query

**Files touched:**

- `supabase/migrations/031_performance_indexes.sql` — new migration
- `src/features/analytics/api/analyticsApi.ts` — add caching
- `src/features/gradebook/api/gradebookApi.ts` — optimize queries

**Estimasi:** 3 hari

### 31F.3 Image & Asset Optimization

**Problem:** Images tidak optimized, tidak ada lazy loading

**Impact:** LOW-MEDIUM — Bandwidth waste

**Solution:**

- Implementasi lazy loading untuk images
- Convert ke WebP/AVIF format
- Tambah responsive images dengan `srcset`
- Audit asset sizes

**Files touched:**

- `src/components/**/*.tsx` — add lazy loading
- `public/` — optimize images
- `vite.config.ts` — add image optimization plugin

**Estimasi:** 2 hari

---

## Phase 31G: Documentation & DX (Parallel)

### 31G.1 Update Feature Documentation

**Problem:** Beberapa feature modules tidak ada README atau dokumentasi outdated

**Impact:** LOW — Developer onboarding lambat

**Solution:**

- Tambah README.md untuk semua feature modules yang belum ada
- Update dokumentasi yang outdated
- Tambah architecture diagrams untuk AI features
- Update API_REFERENCE.md

**Files touched:**

- `src/features/ai-*/README.md` — new/updated
- `src/features/lti/README.md` — update
- `src/features/video/README.md` — update
- `src/features/xapi/README.md` — update
- `docs/API_REFERENCE.md` — update

**Estimasi:** 3 hari

### 31G.2 Developer Runbook Updates

**Problem:** DEVELOPER_RUNBOOK.md tidak mencakup troubleshooting untuk AI features

**Impact:** LOW — Debugging sulit

**Solution:**

- Tambah section: AI features troubleshooting
- Tambah section: LTI debugging guide
- Tambah section: Performance profiling guide
- Tambah section: Common ESLint fixes

**Files touched:**

- `docs/DEVELOPER_RUNBOOK.md` — update

**Estimasi:** 1 hari

### 31G.3 CHANGELOG Updates

**Problem:** CHANGELOG.md tidak update untuk beberapa recent changes

**Impact:** LOW — Release tracking

**Solution:**

- Consolidate recent changes into CHANGELOG
- Format: date, type, description, PR number

**Files touched:**

- `CHANGELOG.md` — update

**Estimasi:** 1 hari

---

## Timeline & Dependencies

```
Week 1-2:  Phase 31A (AI Features Hardening)
Week 3-4:  Phase 31B (Integration Hardening)
Week 5:    Phase 31C (Notification System Upgrade)
Week 6-7:  Phase 31D (ESLint Cleanup)
Week 8-9:  Phase 31E (Test Coverage Expansion)
Week 10:   Phase 31F (Performance Optimization)
Parallel:  Phase 31G (Documentation & DX)
```

### Dependency Graph

```
Phase 31A (AI Hardening) ──────────────────────────────────────┐
Phase 31B (Integrations) ──────────────────────────────────────┤
Phase 31C (Notifications) ─────────────────────────────────────┤──→ Phase 31E (Tests)
Phase 31D (ESLint) ────────────────────────────────────────────┤    (needs clean codebase)
Phase 31E (Tests) ─────────────────────────────────────────────┤
Phase 31F (Performance) ───────────────────────────────────────┘
Phase 31G (Docs) ──────────────────────────────────────────────→ Parallel, update setelah setiap phase
```

---

## Risk Assessment

| Risk                                    | Impact | Probability | Mitigation                                   |
| --------------------------------------- | ------ | ----------- | -------------------------------------------- |
| ESLint fixes introduce breaking changes | MEDIUM | MEDIUM      | Run full test suite setelah setiap batch fix |
| AI API rate limits during testing       | MEDIUM | HIGH        | Mock API calls di tests, use local fallback  |
| LTI testing requires external platform  | HIGH   | MEDIUM      | Use LTI testing tools, mock platform         |
| Test coverage target terlalu agresif    | MEDIUM | HIGH        | Start dengan 60%, iterate ke 70%             |
| Performance regression dari new features| MEDIUM | MEDIUM      | Lighthouse CI setelah setiap merge           |
| Notification realtime connection limits | LOW    | MEDIUM      | Implementasi connection pooling, fallback ke polling |

---

## Success Metrics

| Metric                        | Target              | Measurement              |
| ----------------------------- | ------------------- | ------------------------ |
| AI Features skor              | 85/100              | Code review + testing    |
| Integrations skor             | 85/100              | Code review + testing    |
| Notifications skor            | 85/100              | Code review + testing    |
| ESLint warnings               | <500                | `pnpm lint` output       |
| Test coverage                 | 70%+                | `pnpm test:ci` output    |
| Initial bundle size           | <300KB gzipped      | `pnpm analyze` output    |
| Page load time (Lighthouse)   | <2s                 | Lighthouse CI            |
| AI API error recovery time    | <5s                 | Manual testing           |
| LTI launch success rate       | 99%+                | Production monitoring    |

---

## Acceptance Criteria

### Phase 31A (AI Features)

- [ ] Semua AI modules punya error boundary
- [ ] Retry logic implemented untuk semua AI calls
- [ ] Graceful fallback saat AI service down
- [ ] AI quota indicator di dashboard
- [ ] Content validation untuk AI-generated content
- [ ] Error messages dalam Bahasa Indonesia

### Phase 31B (Integrations)

- [ ] LTI handles expired tokens, malformed launches
- [ ] LTI launch diagnostics panel
- [ ] Video playback retry logic
- [ ] Video offline fallback (transcript)
- [ ] XAPI statement queue dengan retry
- [ ] XAPI offline queue

### Phase 31C (Notifications)

- [ ] Realtime notifications (Supabase Realtime)
- [ ] Notification batching implemented
- [ ] User notification preferences
- [ ] Email delivery option
- [ ] Browser push notifications
- [ ] Smart polling (only when active)

### Phase 31D (ESLint)

- [ ] <500 ESLint warnings
- [ ] All functions have return types
- [ ] `any` usage reduced by 80%
- [ ] No unused vars/imports
- [ ] All lists have key props

### Phase 31E (Tests)

- [ ] 70%+ test coverage
- [ ] AI modules have unit tests
- [ ] Integration modules have unit tests
- [ ] Critical flows have integration tests
- [ ] UI primitives have component tests
- [ ] All tests pass in CI

### Phase 31F (Performance)

- [ ] All routes lazy-loaded
- [ ] Initial bundle <300KB gzipped
- [ ] Database queries optimized
- [ ] Missing indexes added
- [ ] Images lazy-loaded
- [ ] Lighthouse score >90

### Phase 31G (Documentation)

- [ ] All feature modules have README.md
- [ ] API_REFERENCE.md updated
- [ ] DEVELOPER_RUNBOOK.md updated
- [ ] CHANGELOG.md updated
- [ ] Architecture diagrams for AI features

---

## File Impact Summary

| Phase     | New Files | Modified Files | Migration Files | Test Files |
| --------- | --------- | -------------- | --------------- | ---------- |
| 31A       | 12        | 8              | 2               | 5          |
| 31B       | 10        | 6              | 1               | 4          |
| 31C       | 6         | 4              | 1               | 2          |
| 31D       | 0         | ~200           | 0               | 0          |
| 31E       | 0         | 0              | 0               | 25         |
| 31F       | 3         | 15             | 1               | 0          |
| 31G       | 5         | 3              | 0               | 0          |
| **Total** | **36**    | **~236**       | **5**           | **36**     |

---

## Budget & Resource Estimation

| Phase     | Duration | Effort (dev-days) | Priority |
| --------- | -------- | ----------------- | -------- |
| 31A       | 2 minggu | 10                | P0       |
| 31B       | 2 minggu | 10                | P0       |
| 31C       | 1 minggu | 7                 | P1       |
| 31D       | 1 minggu | 9                 | P1       |
| 31E       | 2 minggu | 15                | P0       |
| 31F       | 1 minggu | 7                 | P2       |
| 31G       | Parallel | 5                 | P2       |
| **Total** | **9 minggu** | **63**        | -        |

---

## Next Steps

1. **Review & approve plan** — Stakeholder sign-off
2. **Setup CI/CD pipeline** — Lighthouse CI, coverage reporting
3. **Start Phase 31A** — AI Features Hardening (P0)
4. **Weekly check-ins** — Track progress against metrics
5. **Production readiness review** — Setelah semua phases selesai

---

## Appendix: Quick Reference

### ESLint Fix Commands

```bash
# Auto-fix what we can
pnpm lint --fix

# Check remaining warnings
pnpm lint 2>&1 | grep "warning" | wc -l

# Generate detailed report
pnpm lint --format json > eslint-report.json
```

### Test Commands

```bash
# Run all tests with coverage
pnpm test:ci

# Run tests for changed files
pnpm test:changed

# Run specific test file
pnpm test src/features/ai-tutor/__tests__/aiTutorService.test.ts
```

### Performance Commands

```bash
# Analyze bundle
pnpm analyze

# Run Lighthouse
pnpm perf:lighthouse

# Check circular dependencies
pnpm check:circular

# Check unused code
pnpm check:unused
```

---

**Status:** Ready for review
**Owner:** Development Team
**Target Completion:** 9 minggu dari kickoff
**Production Deployment:** Setelah Phase 31 selesai
