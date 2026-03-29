# EduSync LMS — Engineering Roadmap

From prototype to production. Built on a Supabase-centric serverless architecture.

---

## Phase Status

| Phase | Nama                                                             | Status      | Tanggal Selesai |
| ----- | ---------------------------------------------------------------- | ----------- | --------------- |
| 1-20  | Core Platform                                                    | Completed   | 2026-03-20      |
| 21    | Production Hardening                                             | Completed   | 2026-03-25      |
| 22    | Feature Expansion (LTI/SCORM, Group Assignments, Public Profile) | Completed   | 2026-03-24      |
| 22A   | Bug Fixes & Security Patches                                     | Completed   | 2026-03-25      |
| 22D   | E2E Test Expansion                                               | Completed   | 2026-03-25      |
| 4     | Dark Mode Polish & Test Coverage                                 | Completed   | 2026-03-26      |
| 25A   | Gap Closure & Verification                                       | In Progress | -               |

## Current Focus: Sprint 25A

Gap closure sprint — menyelesaikan gap yang tersisa dari Phase 21 gap analysis.

### Remaining Gaps

- Gap 13: Status badge strings — raw/English status di 11 UI files
- Gap 14: ESLint rules — `ban-ts-comment` belum di-enforce
- Gap 17: Visual regression — belum pakai `toHaveScreenshot()` pixel-diff
- Gap 7: FeatureErrorBoundary — no auth error detection

### Closed Gaps (verified)

- Gap 1: LazyLoadTimeout — sudah di-wire via `S` wrapper di `src/app/routes/utils.tsx`
- Gap 11: Proactive token refresh — interval 60s di `AuthContext.tsx:525-569`
- Gap 16: E2E flows — semua 5 flow sudah ada di `e2e/flows/`

---

## Architecture Overview

- **Frontend:** React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **State:** React Query v5 (server), Zustand v5 (local quiz state)
- **Routing:** React Router v7 (hash routing)
- **Testing:** Vitest (unit, 120 files, 717 tests), Playwright (E2E, 24 flows + cross-cutting)
- **CI/CD:** GitHub Actions (typecheck, lint, test, build, bundle size check)

## Key Metrics

| Metric              | Value                     |
| ------------------- | ------------------------- |
| Test files           | 120/120 passing           |
| Unit tests           | 717/717 passing           |
| E2E flows            | 24 + 4 cross-cutting      |
| Feature modules      | 24                        |
| Database tables      | 84                        |
| RLS policies         | 194                       |
| Edge Functions       | 16                        |
| Coverage thresholds  | Enforced in vitest.config |

## Sprint History

| Sprint | Tanggal    | Fokus                                           |
| ------ | ---------- | ----------------------------------------------- |
| 25A    | 2026-03-30 | Gap closure (status i18n, ESLint, visual reg)   |
| 4      | 2026-03-26 | Dark mode polish, test coverage 717 tests       |
| 22D    | 2026-03-25 | E2E test expansion (5 new flows)                |
| 22A    | 2026-03-25 | Bug fixes, security patches                     |
| 22     | 2026-03-24 | LTI/SCORM, Group Assignments, Public Profile    |
| 21     | 2026-03-25 | Production hardening (security, a11y, code health)|
| 1-20   | 2026-03-20 | Core platform build                             |