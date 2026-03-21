# EduSync LMS — Changelog

## Phase 3: Polish & Optimize (2026-03-22)

### Sprint 3.0 — Bundle Surgery & Performance

- Removed `html2canvas` + `jspdf` (-594 kB), replaced with Supabase Edge Function `generate-pdf`
- Added PWA support (`vite-plugin-pwa`): installable, offline fallback, runtime caching
- Added Core Web Vitals monitoring (`web-vitals` reporting to Supabase `activity_events`)
- Added route prefetching on hover/focus (`src/utils/prefetch.ts`)
- Added `OptimizedImage` component with lazy loading and placeholder
- Created bundle budget CI enforcement (`bundlesize.config.json` + CI workflow)
- Added `pnpm analyze` for bundle visualization via `rollup-plugin-visualizer`
- Created DB performance indexes migration (`001_performance_indexes.sql`)

### Sprint 3.1 — UI/UX Foundation

- Design system tokens (`src/styles/tokens.css`) with light/dark mode CSS custom properties
- Enhanced UI components: Button (5 variants, 3 sizes), Card, Input, Modal (focus trap), Badge
- New components: Select, Toast, Avatar, Tooltip, Spinner, MathRenderer (KaTeX)
- Storybook setup (`.storybook/`) with 14 stories for all UI components, dark mode addon
- 7 content-aware skeleton loading screens (`src/components/skeletons/`)
- Error boundaries on 6 feature sections (Dashboard, Lesson Viewer, Quiz, Leaderboard, Course Analytics, Analytics)
- `ErrorBoundary` and `ErrorFallback` reusable components

### Sprint 3.2 — Accessibility & Responsiveness

- WCAG 2.1 AA: skip navigation, ARIA labels/landmarks, keyboard navigation, focus indicators (`focus-visible`)
- Responsive audit across 5 breakpoints with mobile bottom-sheet modals
- `useReducedMotion` hook for `prefers-reduced-motion` — applied to 5 animated components
- Minimum 44x44px touch targets on all interactive elements (Header, BottomNav, Modal, NotificationBell)
- i18n infrastructure (`src/i18n/`) with Bahasa Indonesia string extraction ready

### Sprint 3.3 — Testing & Documentation

- 352 tests across 43 files — all passing (UI component tests added)
- `docs/upgrade-guide.md` — migration path for all major dependencies
- `docs/dependency-decisions.md` — rationale for each dependency choice
- `docs/design-system.md` — design system documentation
- `docs/phase3-report.md` — full exit criteria verification with build metrics
- `docs/SETUP_GUIDE.md` — developer onboarding guide
- `docs/business-model.md`, `docs/competitive-analysis.md`, `docs/user-personas.md`, `docs/ux-audit.md`
- CI: bundle size enforcement, coverage reporting
- Lint status: **26 warnings, 0 errors** (down from 225+ warnings/2 errors)

### Build Metrics (Post-Phase 3)

- vendor-pdf chunk: **eliminated** (was 594.76 kB)
- Main bundle (index): 497.00 kB (150.93 kB gzip)
- Total initial JS: ~500 kB gzip (down from ~700 kB excl. lazy)
- PWA: v1.2.0, service worker active
- Build time: 15.54s

---

## Sprint 3.2 Day 7: Accessibility Audit — WCAG 2.1 AA (2026-03-22)

**Global Focus Indicator**

- Ditambah `:focus-visible` outline global (`2px solid #2563eb`, offset 2px) di `index.css`
- Dark mode variant menggunakan `#60a5fa`

**Skip Navigation Link**

- Ditambah link "Langsung ke konten utama" sebagai elemen fokus pertama di `StudentLayout`, `TeacherLayout`, `AdminLayout`
- Ditambah `id="main-content"` pada elemen `<main>` di ketiga layout

**Semantic HTML & ARIA**

- `Sidebar`: `aria-expanded` + `aria-haspopup` pada dropdown kelas, `aria-current="page"` pada nav link aktif, `aria-label` pada nav + input kelas baru, `type="button"` pada semua non-form button
- `BottomNav`: `aria-current="page"` pada link aktif, `aria-label` pada `<nav>`
- `Header`: `aria-expanded` + `aria-haspopup` pada profile dropdown, `aria-label="Menu profil"`, label dark mode toggle diterjemahkan ke Bahasa Indonesia, alt text avatar diperbaiki, `type="button"` pada semua button
- `Login.tsx`: `htmlFor`/`id` pair pada semua label-input (login + register), `role="alert"` pada pesan error, `aria-describedby` menghubungkan input ke error, `aria-pressed` pada tab switcher, `type="button"` pada non-submit button
- `Dashboard.tsx`: Clickable div assignment/announcement ditambah `role="button"`, `tabIndex={0}`, `onKeyDown` untuk keyboard (Enter/Space), `aria-label` deskriptif

**Modal Focus Trap & Labelling**

- `Modal.tsx`: Focus trap sejati (Tab cycling antara elemen pertama/terakhir), `aria-labelledby` terhubung ke `ModalHeader` title via React context + `useId`, `aria-hidden="true"` pada backdrop, prop `ariaLabel` baru untuk modal tanpa header

**Toast Container**

- `ToastContainer`: Ditambah `aria-live="polite"` + `role="region"` pada container

**Image Alt Text**

- `CommentSection.tsx`: Kosong `alt=""` diganti dengan `"Foto profil {nama}"`
- `Forum.tsx`: Kosong `alt=""` diganti dengan `"Foto profil {author}"`

---

## Sprint 3.2 Day 8: Responsive & Animation Performance (2026-03-22)

**useReducedMotion Hook**

- Dibuat `src/hooks/useReducedMotion.ts` — hook untuk mendeteksi preferensi `prefers-reduced-motion: reduce`
- Digunakan untuk menonaktifkan animasi dekoratif bagi pengguna yang mengaktifkan pengaturan aksesibilitas

**Reduced Motion — 5 Komponen Diperbaiki**

- `ModuleCompletionModal` — confetti dinonaktifkan, semua spring/infinite animation dihormati
- `BadgeRewardModal` — infinite 3D rotation dihentikan saat reduced motion
- `StreakCounter` — infinite pulse animation dihentikan saat reduced motion
- `BadgeShowcase` — scale entrance dan hover animation dinonaktifkan
- `XPProgressBar` — progress bar width animation langsung tanpa transisi

**Responsive: Modal Bottom-Sheet Mobile**

- `Modal.tsx` — tampil sebagai bottom-sheet (`rounded-t-2xl`, `items-end`) di mobile, modal centered di `sm+`
- Tinggi maksimum disesuaikan: `90dvh` mobile, `85vh` desktop

**Touch Target Minimum 44x44px**

- `Modal` close button: `p-1.5` -> `p-2.5` + `min-w/min-h [44px]`
- `NotificationBell`: `w-9 h-9` -> `w-11 h-11` + `min-w/min-h [44px]`
- `NotificationCenter` bell: `p-2` -> `p-2.5` + `min-w/min-h [44px]` + dark mode variants
- `Header` profile avatar: `w-9 h-9` -> `w-11 h-11` + `min-w/min-h [44px]`
- `Header` dark mode toggle: `p-2` -> `p-2.5` + `min-w/min-h [44px]`
- `BottomNav` links: ditambah `min-h-[44px]` untuk touch target
- `ModuleCompletionModal` close button: `p-2` -> `p-2.5` + `min-w/min-h [44px]`

---

## Developer Onboarding Guide (2026-03-22)

- Dibuat `docs/SETUP_GUIDE.md` — panduan lengkap step-by-step untuk setup EduSync di Supabase project baru
- Mencakup: prerequisite, migration, seed, custom access token hook, edge functions, pg_cron, frontend .env, troubleshooting
- Dokumentasi struktur folder `supabase/` dan daftar edge functions beserta secret yang dibutuhkan

## Sprint 2.1 Day 4: Security Hardening (2026-03-21)

**Dependency Audit**

- Ran `npm audit` across 535 packages (281 prod, 161 dev, 132 optional): 0 vulnerabilities found
- Documented full audit results in `docs/security-audit.md` with accepted risks and recommendations

**OWASP Top 10 Self-Assessment**

- Created `docs/owasp-assessment.md` with per-category analysis against OWASP 2021
- 8 of 10 categories rated **Protected**, 2 rated **Partial** (A05 Security Misconfiguration, A09 Logging)
- Identified actionable gaps: CSP enforcement, CORS production config, centralized log aggregation, admin action audit trail

**Dependabot Configuration**

- Created `.github/dependabot.yml` for weekly npm dependency update PRs (Monday schedule)
- Groups minor/patch updates, labels with `dependencies`, uses `chore(deps)` commit prefix

---

## Phase 1: Foundation Fix (2026-03-21) — DB Cleanup, Testing, DevOps

### Sprint 1.1 — DB Cleanup + DevOps

**Migration Squash**

- Archived 181 individual migration files to `supabase/migrations/_archive/`
- Created `supabase/migrations/000_baseline.sql` as the single authoritative schema baseline (84 tables, 194 RLS policies, 213 SQL functions)
- Removed all `.ignored` files from the migrations directory

**Seed Improvements**

- Added primary `@edusync.dev` dev accounts with fixed UUIDs to `seed/seed_users.sql`:
  - `teacher@edusync.dev` → `00000000-0000-0000-0000-000000000101`
  - `student@edusync.dev` → `00000000-0000-0000-0000-000000000102`
  - `admin@edusync.dev` → `00000000-0000-0000-0000-000000000103`
- Created `seed/seed_gamification.sql`: XP, streaks, badges, learning events, leaderboard
- Updated `seed/seed_demo.sql` to prefer `@edusync.dev` accounts with legacy fallback

**Documentation**

- Created `docs/schema-erd.md` with 7 Mermaid ERD diagrams (84-table inventory, cross-domain FK reference)

**DevOps**

- Created `.github/workflows/ci.yml`: type-check, build, migration validation, unit tests
- Created `.github/pull_request_template.md` with security and RLS checklists
- Verified `.env.example` is complete (already existed)

### Sprint 1.2 — Testing

**Vitest Coverage**

- Added v8 coverage config to `vitest.config.ts` with 60% thresholds
- Created 35+ test files covering:
  - Utils: `clientCompute`, `videoUtils`, `cache`, `cn`, `slugify`
  - Hooks: `useAuth`, `useQuizTimer`, `useSmartPlayer`, `useLeaderboard`, `useBadges`
  - Feature service APIs: `analyticsService`, `gamificationService`, `quizAnalyticsService`, `assignmentService`, `courseService`, `lessonService`, `trackingService`, `aiTutorService`, `certificateService`, `attendanceService`

### Sprint 1.3 — E2E + Docs

**Playwright E2E**

- Expanded `e2e/auth.spec.ts`: login visibility, form inputs, Bahasa Indonesia text, route protection
- Expanded `e2e/core.spec.ts`: app shell integrity, navigation, mobile viewport, error handling
- Expanded `e2e/course.spec.ts`: auth-required routes, course/lesson load integrity
- Expanded `e2e/quiz.spec.ts`: quiz player, gradebook, result page, quiz manager auth
- Created `e2e/admin.spec.ts`: admin dashboard, user management, settings route protection
- Created `e2e/gamification.spec.ts`: leaderboard route protection and load integrity

**Architecture Decision Records**

- Created `docs/adr/ADR-001-supabase-centric-architecture.md`
- Created `docs/adr/ADR-002-row-level-security-tenant-isolation.md`
- Created `docs/adr/ADR-003-event-driven-telemetry-pipeline.md`
- Created `docs/adr/ADR-004-frontend-state-management.md`

**Docker**

- Created `Dockerfile` (multi-stage: deps → builder → nginx runner)
- Created `docker-compose.yml` with app service and optional e2e profile
- Created `docker/nginx.conf` (SPA routing, gzip, security headers, `/healthz` endpoint)

**Scripts**

- Created `scripts/validate-migrations.sh`: checks RLS enablement, policy presence, tenant_id references, no DISABLE RLS, filename conventions
- Added migration validation step to CI

---

## v1.0-rc2 (2026-03-21) — Post-Ship Release Hardening

### Bug Fixes

- **BUG-C2-006 (CLOSED)**: Admin dashboard "Failed to fetch tenant modules" console error silenced. `administrationService.getTenantModules()` now uses a left join instead of inner join on `modules` table, filters null rows, and demotes the log from `error` to `warn`. The dashboard still falls back to hardcoded defaults when no DB rows exist.

### Database

- **Migration 840**: Enables RLS on `tenant_modules` table (previously had no policies despite GRANT ALL). Adds admin SELECT + UPDATE policies scoped to `get_my_tenant_id()`. Seeds missing `tenant_modules` rows for existing tenants that predate the `auto_add_modules_for_tenant` trigger.

### Documentation

- **`docs/DEVELOPER_RUNBOOK.md`** (new): Complete developer onboarding guide covering prerequisites, environment setup, database seeding, test accounts, migration checklist, golden paths per role, common issues, and offline/dark mode notes.

---

## v1.0-rc (2026-03-21) — Initial Ship-Ready Release

### Features

**Smart Player (SP-0 → SP-12)**

- Article, video, and quiz lesson types
- Sidebar with module/lesson navigation and progress indicators
- ScrollProgressBar for article lessons
- Auto-advance and SmartNextButton for lesson completion
- ModuleCompletionModal on module finish
- AI Tutor integration within lesson context
- Recommendations feed for next lesson suggestions

**Quiz Engine**

- Multi-type questions: MCQ, True/False, Multiple Select, Short Answer, Essay
- Autosave with partial answer persistence
- Timer with clamping and late submission handling
- Review screen after submission
- QuizResultsView with score labels in Bahasa Indonesia
- Question Palette for navigation during quiz
- Question Bank for reusable questions

**Analytics**

- Teacher analytics dashboard: completion %, struggle score, time spent, quiz avg
- 4 engagement segments: Aktif, Berkembang, Perlu Perhatian, Pasif
- Struggle detection (0–11 composite score)
- Cohort retention, funnel analysis, path analysis
- Predictive at-risk alerts
- pg_cron-based aggregation pipeline

**Gamification v2**

- XP transactions and level progression (10 levels)
- Badge definitions with rarity tiers
- Leaderboard v2 (tenant-scoped)
- Daily streaks with streak_current/streak_longest
- Confetti on quiz pass

**Auth & Multi-Tenant**

- Google OAuth (optional)
- Class join-code enrollment
- Multi-step onboarding wizard
- TenantGuard + RoleGuard routing
- custom_access_token_hook for JWT claims

**Other**

- In-app guidance: walkthroughs, tooltips, banners
- Attendance system: teacher scan, student view
- Course builder with publish/draft/archive workflow
- Gradebook, SpeedGrader, AssignmentGradebook, QuizGradebook
- Announcements with unread state

### Security Hardening

5 HIGH vulnerabilities patched (migration 836):

- `award_quiz_xp`: added `auth.uid() = p_user_id` identity check
- `v1_get_quiz_results`: added `SET search_path TO 'public'`
- `aggregation_state`: enabled RLS, restricted to admin/service role
- `student_lesson_signals`: tightened RLS to own-data-only for students
- `quiz_submission_queue`: removed `user_id IS NULL` wildcard INSERT policy

### QA Sprint Results (2026-03-21)

Full QA sprint with 7 cycles (Pre + QA-1..4 + Dev-1..3):

- 40+ bugs found and fixed
- All CRITICAL and HIGH bugs resolved
- Known limitations documented in `qa-dev-state.md`

### Architecture

- 157 migration files (001–836)
- 7 Edge Functions deployed
- Feature module architecture: `src/features/{domain}/`
- 4 React contexts (down from 13)
- Bundle splitting: 7 manual chunks for optimal loading

### Known Limitations (Post-Ship Backlog)

| ID          | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| BUG-C3-006  | QuizPlayer: `isOnline` hardcoded — offline warning dead code |
| BUG-C3-008  | HubView: no empty-state for zero items                       |
| NEW-QA4-002 | Gradebook: local mock data, no Supabase persistence yet      |
| FG-PRE-001  | No self-serve school registration wizard                     |
| BUG-C2-002  | Student course discovery is join-code only (by design)       |
| BUG-PRE-006 | Workspace selector text partially in English                 |

---

## Historical Phases

---

## Phase 13 — Ship Ready QA (2026-03-21)

Final QA pass before release candidate. All CRITICAL and HIGH bugs resolved.

### Fixed

- ProtectedRoute React hooks ordering violation causing unmount crash
- AI Tutor network error messages localized to Bahasa Indonesia
- seed_base SQL syntax errors preventing fresh database seeding
- Admin dashboard tenant module fetch failures (left join fix)
- 40+ bugs across 7 QA cycles (Pre, QA-1..4, Dev-1..3)

### Changed

- All user-facing error messages verified as Bahasa Indonesia
- QA dev state documented with known limitations and backlog items

---

## Phase 11–12 — Smart Player v2 (2026-03-19)

Complete learning experience rebuild: SP-0 through SP-12 milestone tickets.

### Added

- **Smart Player core** (SP-0 → SP-4): lesson event system, progress tracking hooks, sidebar navigation with module/lesson tree
- **Smart Player advanced** (SP-5 → SP-11): article renderer with ScrollProgressBar, video player with progress tracking, quiz lesson integration, auto-advance between lessons, SmartNextButton, ModuleCompletionModal
- **SP-12**: AI Tutor panel within lesson context, recommendations feed for next lesson suggestions
- Batch B1–B6: dark mode support for all player components, responsive layout, loading skeletons, error boundaries

### Changed

- Quiz flow integrated as a lesson type within Smart Player (not standalone page)
- Lesson progress events feed into `student_lesson_signals` table
- Course progress recomputed via database triggers on lesson completion

---

## Phase 9–10 — UI Overhaul & Polish (2026-03-18)

Major visual redesign and codebase health improvements.

### Changed

- 46 files redesigned for consistent visual language across all views
- Responsive design applied to all pages (mobile, tablet, desktop breakpoints)
- Dark mode support (`dark:` Tailwind variants) added to all components
- Codebase health pass: fixed migration conflicts, updated schema baseline

### Fixed

- All 95 database migrations verified to apply cleanly in sequence
- Schema baseline updated to reflect current database state
- Migration filename conventions standardized

---

## Phase 7–8 — Feature Module Refactor + Dead Code Cleanup (2026-03-20)

Structural reorganization from flat `services/` to domain-based `features/` architecture.

### Changed

- Migrated all service files from `src/services/` to `src/features/{domain}/api/` pattern
- Completed modules: quizzes, analytics, gamification, guidance, struggle, courses
- Reduced React contexts from 13 to 4 (AuthContext, ThemeContext, QuizPlayerContext, BuilderContext)
- Removed dead code, unused imports, and orphaned components

### Added

- Feature module structure: `api/`, `queries/`, `hooks/`, `store/`, `types/`, `components/`, `utils/` per domain
- Barrel exports for each feature module

---

## Phase 5–6 — QA Rounds (2026-03-16 – 2026-03-17)

Two rounds of quality assurance covering quiz flow, auth, multi-tenant isolation, and code health.

### Fixed

- Quiz flow: tenant_id propagation in `assignQuizToClasses`, auto-assign in `createQuiz`
- Quiz service layer refactored for multi-class assignment support
- Class join and enrollment bugs resolved
- Auth flow edge cases fixed (role resolution, session handling)
- Offline progress queue secured in local storage (encrypted storage keys)
- Gradebook multi-tenant isolation enforced
- Debug `console.log` removed from Dashboard and AuthContext
- Explicit `any` types removed from QuizManager component
- AI Tutor `askTutor` edge case handling improved

### Added

- Unit tests for `useTenantQuery` hook
- Unit tests for gradebook data transformation
- Comprehensive audit report for V2 Quiz Engine
- Supabase security audit report and remediation SQL

---

## Phase 4 — Security Audit & Production Hardening (2026-03-15 – 2026-03-16)

Security-focused sprint: audit, remediation, and hardening.

### Security

- Production hardening phases 1–4 applied across codebase
- Supabase security audit completed with remediation SQL
- Multi-tenant isolation hardened in gradebook service
- Offline progress queue encrypted to prevent local storage tampering
- V2 Quiz Engine audit: all findings documented and remediated

### Added

- AI essay grading service and Edge Function (`ai-grade-essay`)
- AI content generation Edge Function (`generate-ai-content`)
- Quiz assignments schema migration with architecture docs update
- `docs/TENANT_SECURITY_AUDIT.md` with full audit findings

### Fixed

- 4 HIGH vulnerabilities identified and patched (predecessor to migration 836 fixes)
- RLS policies tightened on tenant-scoped analytics tables
- `search_path` injection vectors closed on SECURITY DEFINER functions

---

## Phase 3 — Learning Analytics & Progress Engine (2026-03-14 – 2026-03-15)

Analytics pipeline from raw events to teacher dashboard.

### Added

- **3A — Gradebook UI**: teacher gradebook with SpeedGrader, AssignmentGradebook, QuizGradebook, export support
- **3B — Course Progress Engine**: `lesson_progress` and `course_progress` tables, `recompute_course_progress` trigger, event-driven recalculation on lesson/quiz completion
- **3C — Teacher Analytics Dashboard**: `course_stats` aggregation table, `get_teacher_analytics()` RPC with cursor-based pagination, `refresh_course_stats()` scheduled via pg_cron
- 4 engagement segments (Aktif, Berkembang, Perlu Perhatian, Pasif) via `817_engagement_scoring.sql`
- Struggle detection (0–11 composite score) via `814_struggle_detection.sql`
- Cohort retention analysis, funnel analysis, path analysis RPCs
- Predictive at-risk alerts via `get_at_risk_students()` and `get_struggle_alerts()`
- `student_lesson_signals` table for per-lesson telemetry aggregation

### Changed

- Analytics route (`/#/analytics`) restricted to teacher and admin roles

---

## Phase 2 — Assessment Enhancement (2026-03-13 – 2026-03-14)

Quiz engine v2 with advanced question types, autosave, and anti-cheat.

### Added

- Multi-type questions: MCQ, True/False, Multiple Select, Short Answer, Essay
- Quiz autosave with partial answer persistence
- Timer with clamping and late submission handling
- Review screen after quiz submission
- QuizResultsView with score labels in Bahasa Indonesia
- Question Palette for in-quiz navigation
- Question Bank for reusable question management
- Quiz versioning and atomic save support
- Quiz status workflow (draft → published → archived)

### Changed

- Quiz submission flow: `v1_submit_quiz_attempt()` RPC with server-side grading
- Quiz data loading moved to `load-quiz-data` Edge Function for security

---

## Phase 1 — Core LMS Foundation (2026-03-08 – 2026-03-13)

Initial platform build: auth, multi-tenancy, courses, and quiz v1.

### Added

- **Multi-tenant auth**: Supabase Auth with email/password, `profiles` table with `tenant_id`, `user_roles` table, `get_my_tenant_id()` function
- **Tenant isolation**: RLS enabled on all tenant-scoped tables, `TenantGuard` and `RoleGuard` route components
- **Course system**: `courses`, `course_modules`, `lessons`, `lesson_resources` tables with full CRUD, publish/draft/archive workflow
- **Quiz v1**: basic quiz schema (`quizzes`, `quiz_questions`, `quiz_options`, `quiz_attempts`), submission and grading RPCs
- **Edge Functions**: `ai-tutor`, `grade-quiz-attempt`, `load-quiz-data`, `progress-events`, `process-progress-events`
- **Frontend foundation**: React 19 + Vite + TypeScript + Tailwind, hash routing, role-based navigation
- **Announcements**: teacher announcements with unread state tracking
- Class enrollment system with join codes
- `custom_access_token_hook` for injecting role and tenant claims into JWT

### Changed

- Project initialized from template, removed unrelated Stash & Game code

---

## Phase A–F — Prototype & Infrastructure (2026-03-01 – 2026-03-08)

Initial setup from prototype to deployed Supabase project.

### Added

- **Phase A**: Full frontend prototype with mock data (React + Vite + Tailwind)
- **Phase B**: Supabase project setup, auth configuration, database schema design (84 tables)
- **Phase C**: Edge Functions deployed (7 functions)
- **Phase D**: Service layer migrated from mock data to live Supabase client
- **Phase E**: Consumer page TypeScript types fixed across all pages
- **Phase F**: Initial documentation (`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/AUTH.md`)
- Supabase project deployed: `omfnkoufjqjqilswldtz`

---

## Phase G–I — Testing, Hardening & Deployment (2026-03-08 – 2026-03-10)

Quality gates and production deployment.

### Added

- **Phase G**: Vitest and Playwright configured with initial test suites
- **Phase H**: RLS audit completed, security migrations applied, `docs/SECURITY.md` created
- **Phase I**: Production deployment to Supabase cloud, environment variables configured

### Security

- RLS audit on all 26 tenant-scoped tables
- `has_role()` function hardened against cross-tenant escalation
- `search_path` set on all SECURITY DEFINER functions
