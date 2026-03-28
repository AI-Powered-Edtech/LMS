# Phase 21 — Perfect Score: 100/100 Production Readiness

## Tujuan

Membawa skor evaluasi dari **82/100 → 100/100** di seluruh 4 kategori:

| Kategori        | Sekarang | Target |
| --------------- | -------- | ------ |
| UI/UX           | 78       | 100    |
| Logic & Product | 85       | 100    |
| Code Health     | 84       | 100    |
| Technical       | 88       | 100    |

## Penemuan Kunci dari Deep-Dive Analysis

Sebelum merancang sprint, berikut koreksi dari analisis awal:

1. **Mobile BottomNav SUDAH ADA** — `src/components/layout/BottomNav.tsx` menggunakan `md:hidden` dan sidebar menggunakan `hidden md:flex`. Jadi mobile navigation sudah ada, tapi perlu polish.
2. **404 page SUDAH ADA kontennya** — `src/pages/NotFound.tsx` memiliki heading, text, dan CTA button. Masalah: `text-slate-200` pada light mode membuat "404" near-invisible.
3. **Circular dependencies = 0** — `madge --circular` sudah clean.
4. **`any` types = 0** — ESLint enforces `no-explicit-any`.
5. **Console.log sudah enforced** — `no-console` rule active, only warn/error allowed.
6. **`window.supabase` sudah guarded** — `import.meta.env.DEV` check ada di `src/services/supabase/client.ts:10`.
7. **Form validation = 14 instances** — Banyak form masih pakai raw useState tanpa schema validation.
8. **22 SECURITY DEFINER tanpa search_path** — Semua di `000_baseline.sql`.

---

## Sprint 21A — UI/UX Polish (Target: 78→100)

### Scope

Fix semua visual, UX, heuristic, dan responsiveness issues.

### Tasks

#### A1. Fix 404 Page Visibility

**File:** `src/pages/NotFound.tsx`
**Problem:** Line 21 `text-slate-200` pada bg-slate-50 = near-invisible
**Fix:**

- Ubah `text-slate-200` → `text-slate-300` (cukup visible sebagai decorative)
- Tambahkan ilustrasi SVG sederhana (compass/map icon dari Lucide)
- Tambahkan breadcrumb: "Beranda" link + "Cari halaman" search suggestion
- Tambahkan animasi subtle fade-in via motion

#### A2. Fix Session Expiry UX

**Files:**

- `src/contexts/AuthContext.tsx` (lines 497-502)
- `src/components/SessionManager.tsx`
  **Problem:** Jika session Supabase (JWT) expired tanpa user activity timeout, useAuth() throws karena AuthContext belum update. Saat lazy-loaded page renders sebelum auth state update, crash terjadi.
  **Fix:**
- Di `AuthContext.tsx`, tambahkan `onAuthStateChange` handler untuk event `TOKEN_REFRESHED` dan `SIGNED_OUT`
- Jika session null tapi user masih di protected route, redirect ke `/login` dengan toast "Sesi Anda telah berakhir"
- Tambahkan `useEffect` di setiap layout (StudentLayout, TeacherLayout, AdminLayout) yang checks `!user && !isLoading` → navigate('/login')
- Di FeatureErrorBoundary, detect "useContext" error → show "Sesi berakhir" message + redirect button instead of generic error

#### A3. Lazy Load Timeout

**File:** `src/app/routes.tsx` (lines 83-90, S() wrapper)
**Problem:** Suspense waits forever jika chunk gagal load.
**Fix:**

- Buat `LazyLoadTimeout.tsx` component:
  ```tsx
  function LazyLoadTimeout({ children, timeout = 15000 }) {
    const [timedOut, setTimedOut] = useState(false)
    useEffect(() => {
      const timer = setTimeout(() => setTimedOut(true), timeout)
      return () => clearTimeout(timer)
    }, [timeout])
    if (timedOut) return <ChunkLoadError onRetry={() => window.location.reload()} />
    return children
  }
  ```
- Wrap di dalam Suspense fallback: `<Suspense fallback={<LazyLoadTimeout><AppLoading /></LazyLoadTimeout>}>`

#### A4. Mobile UX Polish

**Files:**

- `src/components/layout/BottomNav.tsx`
- `src/components/layout/Header.tsx`
  **BottomNav sudah ada, tapi perlu polish:**
- Tambahkan haptic feedback pattern (vibrate API on tap)
- Tambahkan badge count pada icon (unread notifications, pending assignments)
- Fix header gamification bar: pada mobile, XP bar + level badge + streak harus stack vertical atau hide detail, show only icons
- Tambahkan pull-to-refresh gesture pada mobile dashboard
- Pastikan semua modal/drawer menggunakan `max-h-[90vh]` dan scrollable pada mobile

#### A5. Animation & Micro-interactions

**Files:** Various components
**Current:** Page transitions ada (fade+slide), tapi kurang micro-interactions
**Add:**

- Card hover → subtle scale(1.02) + shadow increase (sudah ada di beberapa, standardize)
- List item stagger animation: `staggerChildren: 0.05` pada card grids (dashboard classes, courses)
- Button click feedback: scale(0.98) on press
- Skeleton shimmer → replace CSS `animate-pulse` dengan gradient shimmer (lebih modern)
- Tab switch animation (slide underline indicator)
- Badge unlock celebration animation (confetti/glow)

#### A6. Heuristic Improvements

**Add:**

- **Undo support**: Toast dengan "Batal" action button untuk destructive actions (delete assignment, remove student)
- **In-app help**: Floating help button (?) di corner → contextual tooltips per page
- **Breadcrumb navigation**: Tambahkan breadcrumb di semua nested pages (course → module → lesson → quiz)
- **Consistent empty states**: Audit semua empty states — tambahkan illustration + CTA untuk setiap satu
- **Confirmation dialogs**: Audit semua destructive actions → pastikan semua punya confirmation modal

#### A7. Accessibility Enhancements

**Current:** Skip-to-content ada, aria-labels ada, focus trap di Modal ada
**Add:**

- Arrow key navigation pada sidebar menu items (up/down to move, enter to select)
- `aria-label` pada classroom dropdown toggle di Sidebar (line 71 Sidebar.tsx)
- `role="listbox"` pada classroom dropdown container
- Focus visible ring consistency check: semua interactive elements harus punya `focus-visible:ring-2`
- High contrast mode support: tambahkan `forced-colors: active` media query adjustments
- Announce route changes via `aria-live="polite"` region (screen reader friendly)

#### A8. Dark Mode Refinement

**Fix:**

- 404 page: `text-slate-200 dark:text-slate-700` → pastikan visible di kedua mode
- Audit semua `bg-white` tanpa `dark:bg-*` — scan dan fix
- Tambahkan smooth transition saat toggle dark mode: `transition-colors duration-300` pada html/body
- Pastikan semua shadow menggunakan dark variant (`shadow-slate-200 dark:shadow-slate-900`)

### Acceptance Criteria Sprint 21A

- [ ] 404 page menampilkan konten yang jelas visible di light & dark mode
- [ ] Session expiry → graceful redirect ke login (tidak crash)
- [ ] Lazy load timeout setelah 15 detik menampilkan error fallback
- [ ] Mobile: header gamification bar tidak overflow
- [ ] Semua card grids memiliki stagger animation
- [ ] Undo toast pada minimal 3 destructive actions
- [ ] Breadcrumb pada semua nested pages
- [ ] Arrow key nav pada sidebar
- [ ] `aria-live` route change announcer
- [ ] Dark mode transition smooth (300ms)

---

## Sprint 21B — Logic & Product Completion (Target: 85→100)

### Scope

Complete semua feature stubs, standardize error handling, strengthen form validation.

### Tasks

#### B1. Complete Group Assignments Feature

**Files:**

- `src/features/assignments/components/groups/StudentGroupView.tsx`
- `src/features/assignments/components/groups/TeacherGroupView.tsx`
  **Problem:** TODO: Replace with real data from Supabase API
  **Fix:**
- Buat RPC `get_student_group_assignments(p_user_id uuid, p_classroom_id uuid)` → returns group info, members, tasks, submissions
- Buat RPC `get_teacher_group_overview(p_classroom_id uuid)` → returns all groups, progress, grades
- Buat `groupAssignmentService.ts` di `src/features/assignments/api/`
- Buat `useGroupAssignments()` dan `useTeacherGroups()` hooks
- Connect StudentGroupView dan TeacherGroupView ke real data
- Add loading states, empty states, error handling
- Buat migration file: `supabase/migrations/20260325_group_assignments_rpc.sql`

#### B2. Complete AI Creator Backend

**File:** `src/pages/Creator.tsx`
**Problem:** TODO: AI generation will be routed through backend API (Phase 5)
**Fix:**

- Wire ke existing `generate-ai-content` edge function
- Buat `useAICreator()` hook dengan React Query mutation
- Add loading state dengan progress indicator
- Add error handling untuk rate limiting, quota exceeded
- Tambahkan content type selector (quiz, lesson outline, flashcards)
- Tambahkan revision/edit flow setelah AI generates content

#### B3. Complete Public Profile

**File:** `src/pages/PublicProfile.tsx`
**Problem:** Mock data, renders "coming soon"
**Fix:**

- Buat RPC `get_public_profile(p_user_id uuid)` → returns display name, avatar, badges, courses completed, streak
- Design profile card component
- Add privacy controls (apa yang visible ke public)
- Connect ke gamification data (badges, XP, level)

#### B4. Standardize Form Validation

**Problem:** Hanya 14 instances of react-hook-form. Banyak form pakai raw useState.
**Fix:**

- Audit semua forms di codebase (target: 30+ forms)
- Buat shared schemas di `src/shared/schemas/`:
  - `classroomSchema.ts` — create/edit classroom
  - `assignmentSchema.ts` — create/edit assignment
  - `announcementSchema.ts` — create/edit announcement
  - `profileSchema.ts` — edit profile
  - `settingsSchema.ts` — app settings
  - `quizSchema.ts` — extend existing quiz schema
- Migrate semua form ke react-hook-form + valibotResolver pattern
- Standardize error display: red border + error text below field
- Add real-time validation (onBlur + onChange after first submit)

#### B5. Global Error Handling

**Fix:**

- Tambahkan `window.addEventListener('unhandledrejection', handler)` di `main.tsx`
- Log ke Sentry, show generic toast "Terjadi kesalahan tak terduga"
- Tambahkan React Query global `onError` di `queryClient.ts` untuk queries (sudah ada untuk mutations)
- Add `onSettled` callback pada critical mutations untuk ensure UI state consistency
- FeatureErrorBoundary: detect "Failed to fetch dynamically imported module" → show "Perbarui halaman" button

#### B6. Token Refresh Monitoring

**File:** `src/contexts/AuthContext.tsx`
**Fix:**

- Tambahkan JWT expiry check: `const expiresAt = session.expires_at * 1000`
- Set interval (every 60s) to check if token expires within 5 minutes
- If approaching expiry, call `supabase.auth.refreshSession()`
- If refresh fails, redirect to login with message
- Log token refresh events ke Sentry breadcrumbs

#### B7. Offline Resilience Extension

**Current:** Quiz + Builder offline support
**Extend:**

- Tambahkan offline cache untuk announcements (read-only)
- Tambahkan offline cache untuk course catalog (read-only)
- Tambahkan offline indicator pada setiap form: "Anda sedang offline. Perubahan akan disimpan saat online."
- Add retry queue visualization: "X perubahan menunggu sinkronisasi"

#### B8. i18n Cleanup

**Fix English strings yang masih ada:**

- `"DEV QUICK LOGIN"` → hapus di production (wrap dengan `import.meta.env.DEV`)
- `"PUBLISHED"` → `"DITERBITKAN"` (di course cards)
- `"KELAS AKTIF"` → ini sudah Indonesian, tapi casing "AKTIF" sebaiknya "Aktif"
- Audit semua status badges: "Active" → "Aktif", "Draft" → "Draf", "In Review" → "Dalam Peninjauan"
- Audit console/error messages yang user-facing

### Acceptance Criteria Sprint 21B

- [ ] Group assignments connected ke Supabase (StudentGroupView + TeacherGroupView)
- [ ] AI Creator connected ke generate-ai-content edge function
- [ ] Public Profile menampilkan real user data
- [ ] 100% forms menggunakan react-hook-form + valibot
- [ ] Global unhandledrejection handler active
- [ ] Token refresh proactive sebelum expiry
- [ ] Offline cache untuk announcements dan courses
- [ ] 0 English strings di user-facing UI (selain dev-only)

---

## Sprint 21C — Code Health Excellence (Target: 84→100)

### Scope

Refactor large files, strengthen ESLint, maximize test coverage.

### Tasks

#### C1. Refactor routes.tsx (765 LOC → ~150 LOC)

**File:** `src/app/routes.tsx`
**Split into:**

- `src/app/routes/studentRoutes.tsx` — semua student routes
- `src/app/routes/teacherRoutes.tsx` — semua teacher routes
- `src/app/routes/adminRoutes.tsx` — semua admin routes
- `src/app/routes/sharedRoutes.tsx` — shared/public routes
- `src/app/routes/index.tsx` — main router assembly (~150 LOC)

#### C2. Refactor Top 10 Large Page Components

**Target: Semua pages < 400 LOC**

| File                | Current | Target | Strategy                                                        |
| ------------------- | ------- | ------ | --------------------------------------------------------------- |
| ClassManagement.tsx | 701     | <350   | Extract useClassManagementState hook + ClassTable + ClassModals |
| Gradebook.tsx       | 685     | <300   | Extract GradebookTable + GradebookStats + useGradebookFilters   |
| QuizBlockEditor.tsx | 674     | <300   | Extract QuestionList + EditorToolbar + useQuizEditorState       |
| LessonViewer.tsx    | 658     | <300   | Extract ScormPlayer + LessonSidebar + LessonContent             |
| QuizGradebook.tsx   | 649     | <300   | Extract QuizGradebookTable + QuizGradebookFilters               |
| Analytics.tsx       | 616     | <300   | Extract AnalyticsCharts + AnalyticsFilters + useAnalyticsData   |
| Login.tsx           | 615     | <300   | Extract LoginForm + RegisterForm + OAuthButtons + DevQuickLogin |
| UserManagement.tsx  | 612     | <300   | Extract UserTable + UserFilters + BulkImportDialog              |
| Quiz.tsx            | 609     | <300   | Extract useQuizAttemptState hook + QuizTimer + QuizNavigation   |
| QuizViewer.tsx      | 541     | <300   | Extract ReviewPanel + QuestionDisplay                           |

**Pattern untuk setiap refactor:**

1. Extract state management → custom hook (`use[Feature]State.ts`)
2. Extract table/grid → presentational component (`[Feature]Table.tsx`)
3. Extract modals → separate component (`[Feature]Modals.tsx`)
4. Extract filters → separate component (`[Feature]Filters.tsx`)
5. Page component menjadi thin orchestrator (<300 LOC)

#### C3. Refactor Large Services (>450 LOC)

| File                   | Current | Strategy                                                                  |
| ---------------------- | ------- | ------------------------------------------------------------------------- |
| scormApiBridge.ts      | 495     | Split: scormDataModel.ts + scormErrorHandler.ts + scormApiBridge.ts       |
| analyticsService.ts    | 485     | Split: analyticsQueries.ts + analyticsAggregation.ts + analyticsExport.ts |
| quizPlayer.service.ts  | 481     | Split: quizAttemptService.ts + quizTimerService.ts + quizStateService.ts  |
| quizManager.service.ts | 463     | Split: quizCRUD.ts + quizVersioning.ts + quizPublishing.ts                |

#### C4. Strengthen ESLint Rules

**File:** `eslint.config.js`
**Add rules:**

```js
'@typescript-eslint/no-floating-promises': 'error',  // Prevent unhandled async
'@typescript-eslint/explicit-function-return-types': ['warn', {
  allowExpressions: true,
  allowTypedFunctionExpressions: true,
}],
'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
'@typescript-eslint/ban-ts-comment': ['error', {
  'ts-expect-error': 'allow-with-description',
  'ts-ignore': false,
}],
'no-restricted-imports': ['error', {
  patterns: ['../../../*'],  // Max 2 levels of relative imports
}],
```

#### C5. Fix 3 Deep Relative Imports

- `src/features/courses/queries/courseQueries.ts:3` → `@/src/contexts/AuthContext`
- `src/features/announcements/queries/announcementQueries.ts:3` → `@/src/contexts/AuthContext`
- `src/features/quizzes/components/analytics/QuizStatsOverview.tsx:6` → `@/src/utils/cn`

#### C6. Add Coverage Thresholds

**File:** `vitest.config.ts`
**Add:**

```ts
thresholds: {
  'src/utils/**': { statements: 80, branches: 70, functions: 70, lines: 80 },
  'src/features/**/api/**': { statements: 50, branches: 40, functions: 50, lines: 50 },
  // NEW:
  'src/hooks/**': { statements: 70, branches: 60, functions: 70, lines: 70 },
  'src/contexts/**': { statements: 60, branches: 50, functions: 60, lines: 60 },
  'src/features/**/hooks/**': { statements: 60, branches: 50, functions: 60, lines: 60 },
}
```

#### C7. Add Missing Unit Tests

**Priority tests to add:**

- `src/utils/offlineStorage.ts` — test IndexedDB operations (mock with fake-indexeddb)
- `src/contexts/AuthContext.tsx` — test session handling, role resolution, tenant switching
- `src/features/courses/builder/useBuilderOffline.ts` — test auto-save, sync, dirty state
- `src/hooks/useToast.ts` — test queue, auto-dismiss, max limit
- `src/hooks/useNetworkStatus.ts` — test online/offline events

#### C8. Enable Coverage Reporter in CI

**File:** `.github/workflows/ci.yml`
**Add:**

```yaml
- name: Run unit tests with coverage
  run: pnpm vitest run --coverage --reporter=json --outputFile=coverage/coverage-summary.json
- name: Check coverage thresholds
  run: pnpm vitest run --coverage --check
- name: Upload coverage badge
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
```

### Acceptance Criteria Sprint 21C

- [ ] routes.tsx < 200 LOC (split into 4 domain files)
- [ ] 0 page files > 400 LOC
- [ ] 0 service files > 400 LOC
- [ ] ESLint no-floating-promises rule active
- [ ] max-lines rule at 400 (warn level)
- [ ] 0 deep relative imports (>2 levels)
- [ ] Coverage thresholds untuk hooks/ dan contexts/
- [ ] 5 new test suites untuk critical untested modules
- [ ] Coverage reporter running in CI

---

## Sprint 21D — Technical Hardening (Target: 88→100)

### Scope

Security fixes, performance budgets, complete test coverage, production infrastructure.

### Tasks

#### D1. Fix 22 SECURITY DEFINER Functions

**File:** Buat migration `supabase/migrations/20260325_fix_search_path.sql`
**Fix semua 22 functions di 000_baseline.sql:**

```sql
-- For each function, add SET search_path:
ALTER FUNCTION public_lookup_class SET search_path TO 'public';
ALTER FUNCTION public_search_tenants SET search_path TO 'public';
ALTER FUNCTION expire_dead_attempt SET search_path TO 'public';
ALTER FUNCTION rpc_reorder_course_modules SET search_path TO 'public';
ALTER FUNCTION rpc_reorder_module_lessons SET search_path TO 'public';
ALTER FUNCTION rpc_reorder_lesson_resources SET search_path TO 'public';
ALTER FUNCTION rpc_publish_course SET search_path TO 'public';
ALTER FUNCTION add_question_to_quiz SET search_path TO 'public';
ALTER FUNCTION add_user_points SET search_path TO 'public';
ALTER FUNCTION admin_activate_user SET search_path TO 'public';
ALTER FUNCTION admin_assign_role SET search_path TO 'public';
ALTER FUNCTION admin_create_invitation SET search_path TO 'public';
ALTER FUNCTION admin_list_tenants SET search_path TO 'public';
ALTER FUNCTION admin_list_users SET search_path TO 'public';
ALTER FUNCTION admin_revoke_invitation SET search_path TO 'public';
ALTER FUNCTION admin_suspend_user SET search_path TO 'public';
ALTER FUNCTION analytics_health_check SET search_path TO 'public';
ALTER FUNCTION archive_question SET search_path TO 'public';
ALTER FUNCTION auto_add_module_for_all_tenants SET search_path TO 'public';
ALTER FUNCTION auto_add_modules_for_tenant SET search_path TO 'public';
ALTER FUNCTION auto_set_tenant_id SET search_path TO 'public';
ALTER FUNCTION award_badge_if_qualified SET search_path TO 'public';
```

#### D2. Enforce CSP Headers

**File:** `vercel.json`
**Current:** `Content-Security-Policy-Report-Only`
**Fix:**

- Upgrade to enforcing `Content-Security-Policy`
- Generate nonces for inline scripts via Vercel Edge Middleware
- Replace `'unsafe-inline'` dengan nonce-based CSP
- Add `frame-ancestors 'self'` (prevent clickjacking)
- Add `base-uri 'self'` (prevent base tag injection)

#### D3. Rate Limiting Edge Functions

**Files:** All edge functions in `supabase/functions/`
**Add:**

- Buat shared rate limiter using Supabase table `rate_limits`:
  ```sql
  CREATE TABLE rate_limits (
    key text PRIMARY KEY,
    count int DEFAULT 0,
    window_start timestamptz DEFAULT now(),
    CONSTRAINT rate_limits_tenant_id_fkey...
  );
  CREATE FUNCTION check_rate_limit(p_key text, p_max int, p_window interval) ...
  ```
- Apply ke: `ai-grade-essay` (10/min), `ai-tutor` (30/min), `generate-ai-content` (5/min), `generate-pdf` (10/min)
- Return 429 Too Many Requests with `Retry-After` header

#### D4. Performance Budget CI

**File:** `.github/workflows/ci.yml`
**Add step after build:**

```yaml
- name: Check bundle sizes
  run: |
    node scripts/check-bundle-size.js
```

**Create `scripts/check-bundle-size.js`:**

- Parse `dist/assets/*.js` sizes
- Enforce budgets:
  - Total initial JS: < 25KB gzip
  - vendor-react: < 50KB gzip
  - vendor-supabase: < 40KB gzip
  - Any single chunk: < 200KB gzip
- Fail CI if over budget

#### D5. Add Missing E2E Flows

**New test files:**

- `e2e/flows/offline-sync.spec.ts` — test offline quiz submission + sync
- `e2e/flows/lti-launch.spec.ts` — test LTI OIDC login flow (mock)
- `e2e/flows/file-upload.spec.ts` — test assignment file upload
- `e2e/flows/notification-push.spec.ts` — test push notification permission
- `e2e/flows/csv-export.spec.ts` — test gradebook CSV export
- `e2e/flows/forum-discussion.spec.ts` — test forum create/reply flow
- `e2e/flows/course-builder.spec.ts` — test full course creation flow

#### D6. Visual Regression Testing

**Setup:**

- Install `@playwright/test` snapshot assertions
- Add baseline screenshots untuk semua 3 dashboard roles
- Add screenshot comparison di CI:
  ```yaml
  - name: Visual regression tests
    run: pnpm playwright test --project=visual
  ```
- Configure tolerance: 0.1% pixel difference threshold

#### D7. Sentry Monitoring Enhancement

**File:** `src/utils/sentry.ts`
**Add:**

- Filter Authorization headers dari breadcrumbs
- Add custom performance transactions untuk:
  - Page load time (route-level)
  - Supabase query latency
  - Quiz submission time
- Set up Sentry alerts (document in runbook):
  - Error rate > 1% → alert
  - P95 latency > 3s → alert
  - New error type → Slack notification

#### D8. Enable Deploy Pipeline

**File:** `.github/workflows/deploy.yml`
**Fix:**

- Remove `if: false` guard
- Configure Vercel secrets in GitHub:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`
- Add staging deployment on PR:
  ```yaml
  on:
    pull_request:
      branches: [main]
  # Deploy to preview URL
  ```
- Add production deployment on merge to main:
  ```yaml
  on:
    push:
      branches: [main]
  # Deploy to production
  ```
- Post-deploy health check (already exists, just enable)

#### D9. Database Backup & DR Documentation

**Create:** `docs/DISASTER_RECOVERY.md`
**Content:**

- Supabase Pro PITR (Point-In-Time Recovery) configuration
- Manual backup export script: `supabase db dump`
- Restore procedure documentation
- RTO/RPO targets
- Edge Function rollback procedure
- Migration rollback strategy

#### D10. Push Notification Wiring

**Files:**

- `src/features/notifications/hooks/usePushSubscription.ts` (NEW)
- `src/features/notifications/components/PushPermissionPrompt.tsx` (NEW)
  **Fix:**
- Implement `navigator.serviceWorker.ready` → `pushManager.subscribe()`
- Create permission prompt UI: "Aktifkan Notifikasi Push?"
- Connect subscription to `send-push` edge function
- Store subscription in user profile
- Handle permission denied gracefully

#### D11. PWA Install Prompt

**Files:**

- `src/hooks/usePWAInstall.ts` (NEW)
- `src/components/ui/InstallPrompt.tsx` (NEW)
  **Fix:**
- Listen for `beforeinstallprompt` event
- Show custom install banner: "Pasang EduSync di perangkat Anda"
- Track install status in localStorage
- Don't show again after dismiss (30 days cooldown)
- Add `screenshots` dan `categories` ke PWA manifest

### Acceptance Criteria Sprint 21D

- [ ] 0 SECURITY DEFINER functions tanpa search_path
- [ ] CSP headers enforced (bukan report-only)
- [ ] Rate limiting pada semua AI edge functions (429 responses)
- [ ] Bundle size CI check aktif
- [ ] 7 new E2E test suites
- [ ] Visual regression testing di CI
- [ ] Sentry: auth token filtered, custom performance transactions
- [ ] Deploy pipeline aktif (staging + production)
- [ ] Disaster recovery documentation lengkap
- [ ] Push notification flow end-to-end
- [ ] PWA install prompt UI

---

## Sprint 21E — Documentation & Final Verification (Target: 100/100)

### Scope

Update semua documentation, run final audit, verify semua acceptance criteria.

### Tasks

#### E1. Update docs/DATABASE.md

- Add group_assignments RPCs
- Add rate_limits table
- Add search_path fixes
- Update RPC count dan policy count

#### E2. Update docs/ARCHITECTURE.md

- Add route splitting architecture
- Update component hierarchy
- Add offline resilience diagram
- Add push notification flow

#### E3. Update docs/SECURITY.md

- Add CSP enforcement details
- Add rate limiting configuration
- Add token refresh strategy
- Update SECURITY DEFINER audit results

#### E4. Update docs/ENGINEERING_ROADMAP.md

- Add Phase 21 as completed
- Update current status

#### E5. Update CHANGELOG.md

- Sprint 21A: UI/UX Polish
- Sprint 21B: Feature Completion
- Sprint 21C: Code Health
- Sprint 21D: Technical Hardening
- Sprint 21E: Documentation

#### E6. Final Verification Checklist

Run through every sub-score:

**UI/UX (target 100):**

- [ ] Visual Design 10/10 — 404 visible, dark mode consistent, animations polished
- [ ] UX 10/10 — Session expiry graceful, lazy timeout, undo toast, breadcrumbs
- [ ] Heuristic 10/10 — In-app help, consistent empty states, confirmation dialogs
- [ ] Responsive 10/10 — Mobile BottomNav working, header responsive, modals scrollable

**Logic & Product (target 100):**

- [ ] Concept 10/10 — All user flows complete, no dead ends
- [ ] Features 10/10 — Group assignments, AI Creator, Public Profile complete
- [ ] Error Handling 10/10 — Global handler, token refresh, chunk load error
- [ ] Localization 10/10 — 0 English in user-facing UI

**Code Health (target 100):**

- [ ] Quality 10/10 — ESLint strict, 0 any, 0 deep imports
- [ ] Maintainability 10/10 — 0 files >400 LOC, clean route splitting
- [ ] Architecture 10/10 — Feature modules 100%, 0 circular deps
- [ ] Documentation 10/10 — All docs updated, DR runbook exists

**Technical (target 100):**

- [ ] Security 10/10 — 0 unpatched DEFINER, CSP enforced, rate limiting
- [ ] Performance 10/10 — Bundle budget CI, Web Vitals, prefetch
- [ ] Testing 10/10 — Coverage reporter, 29+ E2E tests, visual regression
- [ ] Infrastructure 10/10 — Deploy active, monitoring, DR docs
- [ ] Dependencies 10/10 — All current, no vulnerabilities

#### E7. Run Full Test Suite

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm playwright test
```

### Acceptance Criteria Sprint 21E

- [ ] Semua docs updated
- [ ] CHANGELOG updated
- [ ] Full test suite green
- [ ] Build sukses tanpa warning
- [ ] Skor evaluasi 100/100

---

## Ringkasan Sprint

| Sprint | Focus               | Effort   | Files Changed                |
| ------ | ------------------- | -------- | ---------------------------- |
| 21A    | UI/UX Polish        | 2-3 hari | ~25 files                    |
| 21B    | Logic & Product     | 3-4 hari | ~40 files + 3 migrations     |
| 21C    | Code Health         | 3-4 hari | ~60 files (refactoring)      |
| 21D    | Technical Hardening | 3-4 hari | ~30 files + 1 migration + CI |
| 21E    | Docs & Verification | 1 hari   | ~10 docs                     |

**Total estimated: 12-16 hari kerja (2-3 minggu)**

---

## Catatan untuk Claude Code Agents

Setiap sprint dirancang untuk bisa dijalankan oleh 1-2 agent secara parallel:

- Sprint 21A + 21B bisa parallel (UI vs backend)
- Sprint 21C (refactoring) harus sequential (merge conflicts)
- Sprint 21D bisa parallel per task (D1-D3 = security, D4-D6 = testing, D7-D11 = infra)
- Sprint 21E harus terakhir (depends on all others)

Setiap agent harus:

1. Baca CLAUDE.md sebelum coding
2. Run `pnpm lint && pnpm typecheck` setelah setiap perubahan
3. Update docs/ jika schema berubah
4. Tambahkan entry ke CHANGELOG.md
5. Commit dengan pesan yang jelas dalam format conventional commits
