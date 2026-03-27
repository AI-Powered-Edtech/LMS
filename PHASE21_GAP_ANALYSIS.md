// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
# Phase 21 — Gap Analysis & Revised Scorecard

**Tanggal audit:** 25 Maret 2026
**Scope:** Verifikasi 42 acceptance criteria dari Sprint 21A–21D
**Metode:** Static code analysis + file inspection (50+ files dibaca)

---

## Skor Sebelum vs Sesudah Phase 21

| Kategori | Sebelum | Sesudah | Gap ke 100 |
|----------|---------|---------|------------|
| UI/UX | 78 | **81** | 19 poin |
| Logic & Product | 85 | **89** | 11 poin |
| Code Health | 84 | **93** | 7 poin |
| Technical | 88 | **95** | 5 poin |
| **Total** | **82** | **89** | **11 poin** |

---

## Sprint 21A — UI/UX (78 → 81)

### ✅ DIIMPLEMENTASI (8 items)

| Item | Bukti |
|------|-------|
| 404 page: Compass icon + fade animation | `NotFound.tsx:1,26` — Compass imported, `motion.div` dengan `opacity: 0→1` |
| 404 kontras diperbaiki | `NotFound.tsx:30` — `text-slate-300` (naik dari slate-200) |
| 404 focus-visible ring | `NotFound.tsx:47` — `focus-visible:ring-2 focus-visible:ring-offset-2` |
| Session expiry — 3 layouts redirect ke login | `StudentLayout.tsx:29`, `TeacherLayout.tsx:29`, `AdminLayout.tsx:27` |
| Tabs: animated underline indicator | `Tabs.tsx:51` — `motion.span` dengan `layoutId` + spring transition |
| RouteAnnouncer component | `src/components/layout/RouteAnnouncer.tsx` — `aria-live="polite"`, digunakan di 3 layouts |
| Sidebar aria-label dropdown | `Sidebar.tsx:75` — `aria-label="Pilih kelas aktif: {name}"` |
| Dark mode transition via ThemeContext | `ThemeContext.tsx:42` — `transition: background-color 0.3s ease, color 0.3s ease` |

### ❌ BELUM DIIMPLEMENTASI (7 items)

#### Gap 1 — LazyLoadTimeout tidak di-wire ke routing
**File ada:** `src/components/ui/LazyLoadTimeout.tsx` ✅
**Problem:** Component tidak digunakan di `src/app/routes/index.tsx` — Suspense fallback masih pakai `<AppLoading />` tanpa timeout wrapper.
**Fix:**
```tsx
// src/app/routes/index.tsx — di S() wrapper
<Suspense fallback={<LazyLoadTimeout timeout={15000}><AppLoading /></LazyLoadTimeout>}>
```

#### Gap 2 — BottomNav tidak punya badge slots
**File:** `src/components/layout/BottomNav.tsx:76`
**Problem:** Hanya menampilkan `{item.name}`, tidak ada badge/counter untuk unread notifications atau pending assignments.
**Fix:** Tambahkan `badgeCount` prop ke setiap navItem yang memiliki notification context (Tugas, Jadwal, Pengumuman).

#### Gap 3 — Stagger animations pada card grids
**Problem:** Dashboard pages (StudentDashboard, TeacherDashboard) tidak memiliki `staggerChildren` animation pada card grid layouts. Setiap card muncul serentak bukan berurutan.
**Fix:** Wrap card containers dengan `motion.div` menggunakan `variants={%DOPEN% container: { staggerChildren: 0.05 } %DCLOSE%}`.

#### Gap 4 — Undo/Batal toast pattern
**Problem:** 0 implementasi `undo` action pada destructive operations. Delete class, remove student, delete assignment — semua langsung execute tanpa undo option.
**Fix:** Buat `useUndoableAction` hook yang wrap destructive mutations dengan delayed execution + toast "Batal" button.

#### Gap 5 — In-app contextual help
**Problem:** Tidak ada floating help button atau contextual tooltip system per-page.
**Fix:** Buat `HelpButton` component + `usePageHelp` hook yang menampilkan kontekstual hint per route.

#### Gap 6 — Keyboard arrow navigation di sidebar
**Problem:** Sidebar item tidak bisa di-navigate dengan keyboard arrow up/down.
**Fix:** Tambahkan `onKeyDown` handler di sidebar nav items dengan `ArrowUp`/`ArrowDown` key handling.

#### Gap 7 — FeatureErrorBoundary tidak detect "useContext" error secara spesifik
**Problem:** `FeatureErrorBoundary.tsx` detect chunk load errors, tapi "Cannot read properties of null (reading 'useContext')" masih menampilkan generic error daripada "Sesi berakhir" message.
**Fix:** Tambahkan check di `componentDidCatch`: `if (error.message.includes("useContext") || error.message.includes("null")) → show session expired UI`.

---

## Sprint 21B — Logic & Product (85 → 89)

### ✅ DIIMPLEMENTASI (4 items)

| Item | Bukti |
|------|-------|
| AI Creator terhubung ke edge function | `Creator.tsx:126` — `supabase.functions.invoke('generate-ai-content')` |
| Rate-limit error detection | `Creator.tsx:138-141` — detect 429 + Bahasa Indonesia error message |
| Global unhandledrejection handler | `main.tsx:16-59` — chunk/auth/network/generic classification |
| QueryClient global error handler | `queryClient.ts:42-72` — query + mutation error handlers |

### ❌ BELUM DIIMPLEMENTASI (6 items)

#### Gap 8 — Group Assignments masih TODO
**Files:**
- `StudentGroupView.tsx:41` → `// TODO: Replace with real data from Supabase API` (masih ada)
- `TeacherGroupView.tsx:21` → `// TODO: Replace with real data from Supabase API` (masih ada)

**Missing:** `groupAssignmentService.ts`, `useGroupAssignments` hook, migration `20260325_group_assignments_rpc.sql`
**Fix:** Sprint tersendiri — perlu 2 RPC baru, service layer, hooks, dan migration.

#### Gap 9 — Public Profile masih placeholder
**File:** `src/pages/PublicProfile.tsx`
**Content:** Hanya menampilkan "Fitur profil publik sedang dalam pengembangan"
**Missing:** RPC `get_public_profile`, schema `username`/`followers` columns
**Fix:** Sprint tersendiri — perlu schema changes + RPC + UI design.

#### Gap 10 — Form validation tidak ter-standardize
**Problem:** `react-hook-form` tidak ditemukan di codebase (0 `useForm` occurrences). Forms masih menggunakan raw `useState`.
**Note:** Plan sprint 21B menyebut "migrate ke react-hook-form", tapi ini adalah major refactoring yang mungkin belum dijalankan oleh agents karena scope-nya besar.
**Fix:** Mulai dari forms baru, bukan migrasi forms lama — gunakan valibot schema validation + react-hook-form pada setiap form baru.

#### Gap 11 — Proactive token refresh
**Problem:** `AuthContext.tsx` mendeteksi session expiry secara reactive, tapi tidak ada `setInterval` yang proactively check JWT expiry 5 menit sebelum habis.
**Fix:**
```tsx
// AuthContext.tsx — dalam useEffect setelah session load
const checkInterval = setInterval(() => {
  if (session && session.expires_at * 1000 - Date.now() < 5 * 60 * 1000) {
    supabase.auth.refreshSession()
  }
}, 60_000)
```

#### Gap 12 — OfflineFormNotice dan OfflineIndicator pending count
**Problem:** `OfflineFormNotice` component tidak ditemukan (`src/components/ui/OfflineFormNotice.tsx`). `OfflineIndicator` ada (`src/components/OfflineIndicator.tsx`) tapi tidak menampilkan pending count dari `offlineStorage.getPendingCount()`.
**Fix:** Buat component + integrate ke forms yang menampilkan "X perubahan menunggu sinkronisasi".

#### Gap 13 — "PUBLISHED" string masih uppercase di beberapa tempat
**Finding:** Grep untuk "PUBLISHED" ditemukan di 30 files — sebagian besar di status comparison (OK), tapi beberapa di UI badges masih menampilkan `"PUBLISHED"` bukan `"Diterbitkan"`.
**Fix:** Audit UI badge strings — ganti status display strings ke Bahasa Indonesia.

---

## Sprint 21C — Code Health (84 → 93)

### ✅ DIIMPLEMENTASI PENUH (6/8 items)

| Item | Bukti |
|------|-------|
| routes.tsx split | `routes.tsx` — 6 LOC (re-export), folder `routes/` dengan 7 domain files |
| Semua pages < 400 LOC | Max 347 LOC (Quiz.tsx + LessonViewer.tsx). ClassManagement: 127, Gradebook: 150 |
| Service splits | scormApiBridge+DataModel+ErrorHandler, quizAttempt+Timer+CRUD, analyticsService 171 LOC |
| Deep imports fixed | Semua `@/` alias, 0 `../../../` patterns |
| Coverage thresholds | `vitest.config.ts` — 5 directories: utils, features/api, hooks, contexts, features/hooks |
| CI coverage step | `ci.yml:50` — `pnpm test --run --coverage` |

### ❌ BELUM DIIMPLEMENTASI (2/8 items)

#### Gap 14 — 3 ESLint rules missing
**File:** `eslint.config.js`
**Missing:**
```js
// Belum ada:
'@typescript-eslint/no-floating-promises': 'error',
'@typescript-eslint/explicit-function-return-types': ['warn', { allowExpressions: true }],
'@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': false }],
```
**Impact:** Unhandled async calls tidak terdeteksi oleh linter, bisa menyebabkan silent failures.

#### Gap 15 — 4 unit test files missing
**Missing:**
- `src/contexts/__tests__/AuthContext.test.ts` — critical auth flow tests
- `src/hooks/__tests__/useToast.test.ts` — toast queue behavior tests
- `src/hooks/__tests__/useNetworkStatus.test.ts` — online/offline event tests
- `src/utils/__tests__/offlineStorage.test.ts` — IndexedDB operation tests (excluded dari coverage tapi perlu ada)

---

## Sprint 21D — Technical (88 → 95)

### ✅ DIIMPLEMENTASI PENUH (9/11 items)

| Item | Bukti |
|------|-------|
| 19 SECURITY DEFINER + search_path | `20260325_fix_search_path.sql` — 91 LOC, 19 functions |
| CSP enforced (bukan report-only) | `vercel.json:13` — enforcing CSP + frame-ancestors + base-uri + object-src |
| Rate limiting (ai-tutor) | `ai-tutor/index.ts` — `ai_tutor_rate_limits` table |
| Bundle size CI check | `scripts/check-bundle-size.js` (167 LOC) + `ci.yml:63-111` |
| Sentry auth filter + INP + long task | `sentry.ts:49,50,61-88` — `enableInp`, `enableLongTask`, Authorization filtered |
| Deploy pipeline aktif | `deploy.yml` — preview on PR + production on main, 0 `if: false` |
| Disaster Recovery docs | `docs/DISASTER_RECOVERY.md` — 291 LOC, 30 sections |
| Push notification | `usePushSubscription.ts` + `PushPermissionPrompt.tsx` implemented |
| PWA: screenshots + shortcuts + categories | `vite.config.ts` — manifest dengan 2 screenshots, 2 shortcuts, `education` category |

### ❌ BELUM DIIMPLEMENTASI (2/11 items)

#### Gap 16 — 5 E2E test flows missing
**Missing dari specs yang direncanakan:**
- `e2e/offline-sync.spec.ts` — test offline quiz submission + sync
- `e2e/file-upload.spec.ts` — test assignment file upload
- `e2e/csv-export.spec.ts` — test gradebook CSV export
- `e2e/forum-discussion.spec.ts` — test forum create/reply
- `e2e/course-builder.spec.ts` — test full course creation flow

**Ada 11 E2E files saat ini** (auth, core, course, dark-mode, error-handling, navigation, quiz, responsive, visual-regression, gamification, admin).
**Target:** 16+ E2E spec files untuk coverage yang comprehensive.

#### Gap 17 — Visual regression testing tidak dikonfigurasi di Playwright
**Problem:** `playwright.config.ts` tidak punya project untuk visual comparison. `visual-regression.spec.ts` ada tapi tidak dikonfigurasi sebagai dedicated Playwright project dengan snapshot tolerance.
**Fix:**
```typescript
// playwright.config.ts
projects: [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  {
    name: 'visual',
    use: { ...devices['Desktop Chrome'] },
    testMatch: '**/visual-regression.spec.ts',
    expect: { toHaveScreenshot: { maxDiffPixels: 100 } },
  },
]
```

---

## Ringkasan: 17 Gaps Tersisa

| # | Gap | Kategori | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | LazyLoadTimeout tidak di-wire ke routing | UI/UX | 30 mnt | Medium |
| 2 | BottomNav badge slots kosong | UI/UX | 2 jam | Medium |
| 3 | Card stagger animations | UI/UX | 1 jam | Low |
| 4 | Undo/Batal toast pattern | UI/UX | 3 jam | High |
| 5 | In-app contextual help | UI/UX | 4 jam | Medium |
| 6 | Keyboard arrow nav di sidebar | UI/UX | 2 jam | Low |
| 7 | FeatureErrorBoundary detect useContext error | UI/UX | 1 jam | High |
| 8 | Group Assignments masih TODO | Logic | 1–2 hari | **Critical** |
| 9 | Public Profile masih placeholder | Logic | 1 hari | High |
| 10 | Form validation (react-hook-form) | Logic | 2–3 hari | High |
| 11 | Proactive token refresh interval | Logic | 1 jam | High |
| 12 | OfflineFormNotice + OfflineIndicator count | Logic | 2 jam | Medium |
| 13 | "PUBLISHED" string masih muncul | Logic | 30 mnt | Low |
| 14 | 3 ESLint rules missing | Code Health | 30 mnt | Medium |
| 15 | 4 unit test files missing | Code Health | 3 jam | Medium |
| 16 | 5 E2E test flows missing | Technical | 4 jam | Medium |
| 17 | Visual regression tidak dikonfigurasi | Technical | 1 jam | Low |

---

## Revised Sprint Plan: Phase 22 — Close the Gaps

### Sprint 22A — Quick Wins (estimasi: 1 hari)
*Semua item < 2 jam, bisa parallelkan ke 2–3 agents*

- Wire `LazyLoadTimeout` ke `src/app/routes/index.tsx`
- Fix `FeatureErrorBoundary` untuk detect "useContext" error
- Tambahkan proactive token refresh `setInterval` di `AuthContext`
- Tambahkan 3 ESLint rules (`no-floating-promises`, `ban-ts-comment`, `explicit-function-return-types`)
- Fix "PUBLISHED" → "Diterbitkan" di UI badge strings
- Konfigurasi Playwright visual regression project
- Wire `stagger animations` ke card grids di StudentDashboard + TeacherDashboard

### Sprint 22B — UX Polish (estimasi: 1 hari)
*2 agents parallel*

- Implementasi `useUndoableAction` hook + toast "Batal" di 3 destructive actions:
  - Delete class (ClassManagement)
  - Remove student from class
  - Delete assignment
- Implementasi `BottomNav` badge counts (notifications + pending assignments)
- Buat `OfflineFormNotice` component + integrate ke forms
- Update `OfflineIndicator` dengan `getPendingCount()` counter
- Keyboard arrow navigation di Sidebar

### Sprint 22C — Feature Completion (estimasi: 2–3 hari)
*Ini yang terberat — perlu careful planning*

**Group Assignments (Agent 1):**
- Migration: `supabase/migrations/20260326_group_assignments_rpc.sql`
  - RPC `get_student_group_assignments(user_id, classroom_id)`
  - RPC `get_teacher_group_overview(classroom_id)`
  - RLS policies untuk multi-tenant
- `src/features/assignments/api/groupAssignmentService.ts`
- `useGroupAssignments()` + `useTeacherGroups()` hooks
- Connect `StudentGroupView` + `TeacherGroupView` ke real data

**Public Profile (Agent 2):**
- Migration: `supabase/migrations/20260326_public_profile.sql`
  - Column `username` di `user_profiles`
  - RPC `get_public_profile(user_id)`
- `src/pages/PublicProfile.tsx` — real data dengan gamification stats
- Privacy controls component

### Sprint 22D — Test Coverage (estimasi: 1 hari)
*Test files yang missing*

- `src/contexts/__tests__/AuthContext.test.ts` — session handling, role resolution
- `src/hooks/__tests__/useToast.test.ts` — queue, dismiss, max limit
- `src/hooks/__tests__/useNetworkStatus.test.ts` — online/offline events
- `src/utils/__tests__/offlineStorage.test.ts` — IndexedDB mock
- 5 E2E spec files: offline-sync, file-upload, csv-export, forum-discussion, course-builder

---

## Proyeksi Skor Setelah Phase 22

| Kategori | Saat ini (89) | Setelah 22A+22B | Setelah 22C+22D |
|----------|--------------|-----------------|-----------------|
| UI/UX | 81 | **91** | **94** |
| Logic & Product | 89 | **92** | **98** |
| Code Health | 93 | **96** | **98** |
| Technical | 95 | **97** | **100** |
| **Total** | **89** | **94** | **98** |

> **Catatan:** Skor 100/100 di semua kategori secara simultan akan sulit tanpa data produksi nyata (form validation butuh real user flows, visual regression butuh baseline screenshots dari prod-like env, in-app help butuh user research untuk konteks yang tepat). Proyeksi realistis: **98/100** setelah Phase 22 selesai.

---

*Gap analysis oleh Claude — 25 Maret 2026*
