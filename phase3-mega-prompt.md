# PHASE 3 MEGA PROMPT — Polish & Optimize

> Paste seluruh isi prompt ini ke Claude Code. Agent akan mengerjakan 12 hari kerja dalam satu sesi panjang.
> PENTING: Gunakan `pnpm` (bukan npm). Lock file = `pnpm-lock.yaml`.

---

Kamu adalah senior full-stack engineer yang ditugaskan menyelesaikan **Phase 3 (Polish & Optimize)** untuk EduSync LMS. Baca `CLAUDE.md` di root project untuk konteks lengkap tech stack, konvensi, dan gotchas.

## KONTEKS CODEBASE SAAT INI

- **Package manager**: pnpm (pnpm-lock.yaml)
- **Framework**: React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS v4
- **State**: Supabase JS v2, React Query v5, Zustand v5
- **Routing**: React Router v7, hash routing (`/#/`)
- **Existing UI components** (`src/components/ui/`): Button, Card, Input, Modal, Badge, Breadcrumb, Tabs, Skeleton, EmptyState (+ barrel `index.ts`)
- **CI**: `.github/workflows/ci.yml` sudah ada (lint, typecheck, test, build, e2e)
- **Vite manual chunks**: `vendor-react`, `vendor-supabase`, `vendor-recharts`, `vendor-pdf` (jspdf+html2canvas), `vendor-katex`, `vendor-query`
- **html2canvas + jspdf**: hanya dipakai di `src/pages/Certificates.tsx`. Chunk `vendor-pdf` = ~594kB
- **KaTeX**: `vendor-katex` = ~258kB, loaded eagerly
- **Recharts**: `vendor-recharts` = ~458kB, lazy-loaded via analytics routes
- **Storybook**: belum ada
- **PWA**: belum ada
- **i18n**: belum ada
- **webVitals**: belum ada
- **Semua teks UI**: Bahasa Indonesia (wajib dipertahankan)

## ATURAN WAJIB

1. **Semua teks UI harus Bahasa Indonesia** — tidak boleh ada label, button, heading, error message dalam bahasa Inggris di UI
2. **Dark mode**: semua komponen baru WAJIB punya `dark:` variants
3. **Setiap sprint harus diakhiri dengan**: `pnpm build` sukses, `node_modules/.bin/tsc --noEmit` 0 error
4. **Jangan pakai `npx`** — gunakan `pnpm exec` atau `node_modules/.bin/` langsung
5. **Commit setiap akhir sprint** dengan pesan yang sesuai
6. **Update `CHANGELOG.md`** setiap commit
7. **Update `docs/`** jika ada perubahan schema, arsitektur, atau docs baru

---

## SPRINT 3.0 — Bundle Surgery & Performance (Day 1-3) 🔴 CRITICAL

### Day 1: Kill html2canvas + jspdf, Server-Side PDF

**Langkah:**

1. Deep-dive ke `src/pages/Certificates.tsx` — pahami persis apa yang di-render ke PDF (certificate layout, data fields, styling).
2. Buat **Supabase Edge Function** `supabase/functions/generate-pdf/index.ts`:
   - Gunakan library ringan untuk PDF generation di Deno (misalnya `pdf-lib` yang Deno-compatible, atau raw PDF construction — **JANGAN** pakai `@react-pdf/renderer` karena tidak jalan di Deno Edge Runtime).
   - Accept JSON body: `{ type: 'certificate', data: { studentName, courseTitle, completionDate, tenantName } }`
   - Return `application/pdf` response
   - Template certificate: nama siswa, judul kursus, tanggal selesai, nama sekolah
3. Refactor `src/pages/Certificates.tsx`:
   - Hapus semua import `html2canvas` dan `jspdf`
   - Ganti dengan: `const { data } = await supabase.functions.invoke('generate-pdf', { body: {...} })`
   - Handle response: blob → `URL.createObjectURL(blob)` → download/preview
   - Tambahkan loading state + error handling (Bahasa Indonesia)
4. Hapus deps: `pnpm remove html2canvas jspdf`
5. Hapus `'vendor-pdf': ['jspdf', 'html2canvas']` dari `vite.config.ts` manualChunks
6. **Lazy-load KaTeX**:
   - Buat `src/components/ui/MathRenderer.tsx` — wrapper lazy:
     ```tsx
     const KaTeX = React.lazy(() => import('katex'))
     ```
   - Hanya load KaTeX jika konten lesson mengandung `$$` atau `\\(`
   - Wrap dengan `<Suspense fallback={<Skeleton />}>`
   - Update semua tempat yang import KaTeX langsung untuk pakai `MathRenderer`

**Verifikasi**: `pnpm build` — konfirmasi chunk `vendor-pdf` hilang. Hitung total bundle size reduction.

**Commit**: `perf: server-side PDF generation, remove html2canvas+jspdf (-594kB)`

---

### Day 2: PWA Setup + Image Optimization

**Langkah:**

1. Install: `pnpm add -D vite-plugin-pwa`
2. Konfigurasi di `vite.config.ts`:
   - `registerType: 'autoUpdate'`
   - `workbox.runtimeCaching`:
     - App shell (HTML, CSS, JS) → CacheFirst
     - Supabase API (`*.supabase.co`) → NetworkFirst, timeout 5s
     - Static images → CacheFirst, maxAge 30 hari
     - Fonts → CacheFirst, maxAge 1 tahun
   - `manifest`: name "EduSync LMS", short_name "EduSync", theme_color, background_color, display "standalone"
   - Buat icons PWA: `public/icons/icon-192.png`, `public/icons/icon-512.png` (bisa generate placeholder SVG → PNG)
3. Buat `public/offline.html` — halaman offline sederhana dalam Bahasa Indonesia
4. Tambah `<meta name="theme-color" content="...">` di `index.html`
5. **Image optimization**:
   - Buat `src/components/ui/OptimizedImage.tsx`:
     - Props: `src`, `alt`, `width`, `height`, `className`, `lazy` (default true)
     - `loading="lazy"` otomatis untuk non-hero images
     - Skeleton placeholder saat loading
     - Error fallback image
     - Support dark mode
   - Cari semua `<img` di codebase, tambahkan `loading="lazy"` + `width`/`height` untuk prevent CLS
6. **Route prefetching**:
   - Buat `src/utils/prefetch.ts` — utility untuk prefetch route chunks on hover/focus
   - Prefetch paths: login→dashboard, dashboard→course, course→smart-player
   - Gunakan `<link rel="prefetch">` yang di-inject dinamis

**Verifikasi**: PWA installable di Chrome DevTools → Application. Offline page muncul saat offline.

**Commit**: `perf: add PWA support, image optimization, route prefetching`

---

### Day 3: Bundle Budget + Core Web Vitals + DB Indexes

**Langkah:**

1. **Bundle analysis**:
   - `pnpm add -D rollup-plugin-visualizer`
   - Tambah ke `vite.config.ts` (conditional: `process.env.ANALYZE === 'true'`)
   - Tambah script di `package.json`: `"analyze": "ANALYZE=true vite build"`
   - Buat `bundlesize.config.json`:
     ```json
     {
       "budgets": [
         { "name": "main", "maxSize": "350kB" },
         { "name": "vendor-react", "maxSize": "150kB" },
         { "name": "vendor-supabase", "maxSize": "100kB" },
         { "name": "total-initial", "maxSize": "600kB" }
       ]
     }
     ```
2. **Core Web Vitals monitoring**:
   - `pnpm add web-vitals`
   - Buat `src/utils/webVitals.ts`:
     - Track: LCP, FID/INP, CLS, FCP, TTFB
     - Dev: log ke console
     - Prod: kirim ke Supabase `activity_events` table (sampled 10%)
   - Panggil `reportWebVitals()` di `src/main.tsx`
   - Target: LCP < 2.5s, INP < 200ms, CLS < 0.1
3. **Database performance indexes**:
   - Buat `supabase/migrations/001_performance_indexes.sql`:
     - Composite indexes: `(tenant_id, user_id)` pada tabel yang sering di-filter (enrollments, student_lesson_signals, quiz_attempts, activity_events)
     - Temporal indexes: `created_at` pada activity_events, notifications
     - Status indexes: `status` pada courses, quizzes, assignments
     - Partial indexes: `WHERE status = 'published'` pada courses
     - Setiap index harus ada komentar penjelasan
4. **Evaluasi Recharts**:
   - Cek semua chart types yang dipakai di codebase (cari import dari recharts)
   - Recharts sudah lazy-loaded via analytics routes — dokumentasikan keputusan KEEP + lazy-load agresif
   - Pastikan recharts HANYA di-import di analytics routes, tidak di tempat lain

**Verifikasi**: `pnpm build` menunjukkan reduced bundle. `pnpm run analyze` menghasilkan `stats.html`. Migration SQL valid.

**Commit**: `perf: bundle budget, Core Web Vitals monitoring, DB indexes`

---

## SPRINT 3.1 — UI/UX Foundation (Day 4-6) 🟠 HIGH

### Day 4: Design System Tokens + Component Enhancement

**Langkah:**

1. **Design tokens** — buat `src/styles/tokens.css` (CSS custom properties, Tailwind v4 compatible):
   - Colors: primary (blue), secondary (purple), success (green), warning (amber), danger (red), neutral (gray) — masing-masing 50-950
   - Spacing: 4px base unit, scale xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48)
   - Typography: heading scales, body scales, caption scales
   - Shadows: sm, md, lg, xl
   - Border radius: sm(4), md(8), lg(12), xl(16), full
   - Transitions: fast(150ms), normal(300ms), slow(500ms)
   - Semua tokens harus support dark mode via `[data-theme="dark"]` atau `.dark`
   - Dokumentasikan di `docs/design-system.md`

2. **Enhance existing UI components** (JANGAN break existing usages):
   - `Button.tsx` — tambah variants: `primary`, `secondary`, `outline`, `ghost`, `danger`; sizes: `sm`, `md`, `lg`; loading state (spinner); disabled state. Backward compatible.
   - `Card.tsx` — tambah variants: `default`, `outlined`, `elevated`; optional header/footer slots
   - `Input.tsx` — tambah: label prop, helper text, error state, prefix/suffix icon, disabled
   - `Modal.tsx` — tambah: sizes (`sm`, `md`, `lg`, `fullscreen`), close on Escape, focus trap
   - `Badge.tsx` — tambah: color variants dari tokens, sizes, dot indicator

3. **Buat komponen UI baru**:
   - `Select.tsx` — native select wrapper, label, error state, disabled
   - `Toast.tsx` + `src/hooks/useToast.ts` (Zustand store):
     - Types: success, error, warning, info
     - Auto-dismiss 5s, manual dismiss, stack max 3
     - Bahasa Indonesia default messages
   - `Avatar.tsx` — image + fallback initials, sizes (sm/md/lg), online indicator
   - `Tooltip.tsx` — hover tooltip, positions (top/bottom/left/right)
   - `Spinner.tsx` — loading spinner, sizes matching Button sizes

4. Update barrel export `src/components/ui/index.ts`

**Verifikasi**: `pnpm build` clean. Existing pages yang pakai Button/Card/Input/Modal masih berfungsi normal.

**Commit**: `feat: design system tokens + enhanced UI component library`

---

### Day 5: Storybook Setup

**Langkah:**

1. Install Storybook:
   - `pnpm exec storybook@latest init --type react` (atau manual setup jika init gagal)
   - Framework: `@storybook/react-vite`
   - Tambah scripts: `"storybook": "storybook dev -p 6006"`, `"build-storybook": "storybook build"`
2. Konfigurasi:
   - Load Tailwind CSS di Storybook preview (`preview.ts`)
   - Dark mode: `@storybook/addon-themes`
   - Viewport addon untuk responsive testing
   - Controls addon
   - Docs addon
3. Buat stories untuk SEMUA 14+ UI components:
   - `Button.stories.tsx` — semua variants × sizes × states
   - `Card.stories.tsx` — all variants, with/without header/footer
   - `Input.stories.tsx` — default, label, error, icon, disabled
   - `Modal.stories.tsx` — all sizes
   - `Badge.stories.tsx` — all colors, sizes
   - `Select.stories.tsx`, `Toast.stories.tsx`, `Avatar.stories.tsx`
   - `Tooltip.stories.tsx`, `Spinner.stories.tsx`, `Skeleton.stories.tsx`
   - `EmptyState.stories.tsx`, `Breadcrumb.stories.tsx`, `Tabs.stories.tsx`

**Verifikasi**: `pnpm storybook` launches di port 6006. Semua stories render. Dark mode toggle works.

**Commit**: `feat: Storybook setup with stories for all UI components`

---

### Day 6: Skeleton Loading States + Error Boundaries

**Langkah:**

1. **Content-aware skeleton screens** (gunakan `Skeleton` dari `src/components/ui/Skeleton.tsx`):
   - `DashboardSkeleton.tsx` — stat cards + chart + activity list placeholders
   - `CourseListSkeleton.tsx` — grid of course card skeletons
   - `CourseDetailSkeleton.tsx` — hero + module list
   - `SmartPlayerSkeleton.tsx` — sidebar + content area
   - `QuizSkeleton.tsx` — question + answer options
   - `LeaderboardSkeleton.tsx` — podium + table rows
   - `ProfileSkeleton.tsx` — avatar + info cards
   - Cari SEMUA loading spinner / "Memuat..." text di codebase dan ganti dengan skeleton yang sesuai

2. **Error boundaries**:
   - Buat `src/components/ui/ErrorBoundary.tsx`:
     - Class component (Error Boundary harus class component di React)
     - Props: `fallback` (custom), `onReset` callback
     - Default UI: icon error, pesan Bahasa Indonesia, tombol "Coba Lagi", link "Kembali ke Beranda"
     - Log error ke console
   - Buat `src/components/ui/ErrorFallback.tsx` — reusable fallback display
   - Wrap setiap feature section utama:
     - Dashboard widgets, Course content, Quiz player, Analytics charts, Smart Player
     - Satu boundary crash TIDAK boleh crash halaman keseluruhan

3. **Suspense boundaries**:
   - Review semua `React.lazy()` di `src/app/routes.tsx`
   - Pastikan setiap lazy import punya `<Suspense fallback={<PageSkeleton />}>`
   - Gunakan skeleton yang sesuai per route

**Verifikasi**: Navigate semua halaman — lihat skeleton bukan spinner. Force-throw error di dev tools — lihat error boundary.

**Commit**: `feat: skeleton loading states + per-feature error boundaries`

---

## SPRINT 3.2 — Accessibility & Responsiveness (Day 7-9) 🟡 MEDIUM

### Day 7: Accessibility Audit + Keyboard Navigation

**Langkah:**

1. **Semantic HTML audit**:
   - Cari semua `<div onClick` → ganti dengan `<button>` atau `<a>` yang semantik
   - Pastikan semua `<img>` punya `alt` text yang bermakna (Bahasa Indonesia)
   - Gunakan landmarks: `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`
   - Setiap halaman harus punya `<h1>`
   - Semua form input harus punya `<label>` terkait

2. **ARIA attributes**:
   - `aria-label` pada semua icon-only buttons (close, menu toggle, settings, dll)
   - `aria-expanded` pada semua toggles/dropdowns
   - `aria-current="page"` pada active nav links
   - `aria-live="polite"` pada toast notifications
   - `role="alert"` pada error messages
   - `aria-describedby` menghubungkan input ke error/helper text

3. **Keyboard navigation**:
   - Tab order logis di semua halaman
   - Modal focus trap: focus tetap di dalam modal saat terbuka, kembali saat ditutup
   - Escape: tutup semua modal, dropdown, popover
   - Enter/Space: activate buttons, toggles
   - Arrow keys: navigate tabs, dropdown options, sidebar items
   - Tambah "Langsung ke konten utama" sebagai first focusable element (skip nav link)

4. **Color contrast**:
   - Audit semua kombinasi text/background — minimum rasio 4.5:1 (AA)
   - Fix contrast yang gagal — terutama light mode DAN dark mode
   - Focus indicator harus visible: 2px solid outline, offset

**Verifikasi**: Tab through entire app tanpa mouse. Skip nav link berfungsi.

**Commit**: `a11y: WCAG 2.1 AA compliance — semantics, ARIA, keyboard, contrast`

---

### Day 8: Responsive Perfection + Animation Performance

**Langkah:**

1. **Responsive audit** — test SEMUA halaman di 5 breakpoint: 320px, 375px, 768px, 1024px, 1440px:
   - Fix overflow di 320px
   - Sidebar collapse proper di mobile
   - Tables horizontal scroll di mobile (bukan layout break)
   - Modals full-screen di mobile
   - Charts resize properly
   - Fix text truncation issues

2. **Animation performance**:
   - Cari semua `motion` component usages (from `framer-motion` / `motion`)
   - Pastikan animasi HANYA pakai `transform` dan `opacity` (GPU-accelerated)
   - Buat `src/hooks/useReducedMotion.ts` — hook yang cek `prefers-reduced-motion`
   - Wrap semua decorative animations dengan reduced-motion check
   - Audit confetti animation — jangan sampai frame drop di low-end devices

3. **Touch optimization**:
   - Minimum 44×44px touch targets pada semua interactive elements
   - Tambah `touch-action: manipulation` where appropriate

**Verifikasi**: Test di mobile viewport. Smooth 60fps. No layout breaks.

**Commit**: `ui: responsive perfection + animation performance audit`

---

### Day 9: i18n Preparation + Final UI Polish

**Langkah:**

1. **i18n infrastructure** (JANGAN replace strings di komponen — hanya extract):
   - Buat `src/i18n/`:
     - `src/i18n/locales/id.json` — extract semua string Bahasa Indonesia dari komponen
     - `src/i18n/locales/en.json` — placeholder English (keys sama, values kosong/English)
     - `src/i18n/index.ts`:
       - `t(key: string, params?: Record<string, string>): string`
       - `setLocale(locale: 'id' | 'en'): void`
       - `getLocale(): string`
       - Default locale: 'id'
   - Group keys by feature: `auth.*`, `dashboard.*`, `course.*`, `quiz.*`, `admin.*`, `common.*`
   - Extract strings dari critical paths: Login, Dashboard, Navigation, Common UI

2. **Final UI polish**:
   - Pastikan spacing konsisten pakai design tokens
   - Pastikan typography hierarchy konsisten (h1-h4, body, caption)
   - Fix inkonsistensi visual antara light/dark mode
   - Semua halaman punya proper page title (`document.title`)
   - Pastikan favicon ada

**Verifikasi**: Build clean. i18n structure valid.

**Commit**: `feat: i18n infrastructure + string extraction + UI polish`

---

## SPRINT 3.3 — Testing Uplift & Tech Stack Polish (Day 10-12) 🟢 MEDIUM

### Day 10: Coverage → 80% + Component Tests

**Langkah:**

1. Update `vitest.config.ts` — naikkan coverage thresholds ke 80% (statements, branches, functions, lines)
2. Jalankan `pnpm test --run --coverage` — identifikasi file dengan coverage < 50%
3. Tulis tests untuk critical uncovered paths:
   - Auth utilities (token refresh, session management)
   - Route guards logic
   - Data transformation functions
   - Rate limiter edge cases
   - Supabase query builders
4. UI component tests (pakai `@testing-library/react` + `vitest`):
   - `Button.test.tsx` — render all variants, click handler, loading, disabled
   - `Modal.test.tsx` — open/close, Escape key, focus trap
   - `Toast.test.tsx` — show/dismiss, auto-dismiss timer
   - `ErrorBoundary.test.tsx` — catches errors, shows fallback, reset
   - `OptimizedImage.test.tsx` — lazy loading, error fallback

**Verifikasi**: `pnpm test --run --coverage` — 80%+ semua thresholds. 0 failures.

**Commit**: `test: coverage to 80%, UI component tests`

---

### Day 11: Upgrade Docs + Bundle CI + Dependency Freshness

**Langkah:**

1. **Upgrade path docs** — buat `docs/upgrade-guide.md`:
   - React 19: fitur spesifik yang kita pakai, migration notes untuk 20
   - Tailwind v4: CSS-first config approach
   - Supabase JS v2 → v3: breaking changes checklist
   - Vite 6 → 7: expected changes
   - TypeScript 5.8 → 6.x: new features to adopt
   - Include "last reviewed" date

2. **Bundle size CI enforcement** — update `.github/workflows/ci.yml`:
   - Tambah step setelah build: parse `dist/assets/` sizes
   - Fail jika main chunk > 350kB atau total initial > 600kB
   - Output bundle report sebagai CI artifact
   - Tambah comment di PR jika bundle size berubah > 5%

3. **Dependency freshness**:
   - `pnpm outdated` — dokumentasikan semua outdated
   - Update semua minor/patch
   - Buat `docs/dependency-decisions.md` — alasan tiap major dep, alternatives, kapan re-evaluate

**Verifikasi**: CI pipeline passes. Docs committed.

**Commit**: `docs: upgrade guide, dependency decisions + CI bundle enforcement`

---

### Day 12: Final Verification + Phase 3 Exit

**Langkah:**

1. **Performance verification**:
   - `pnpm build` — catat semua chunk sizes, bandingkan dengan sebelum Phase 3
   - Verifikasi PWA installable
   - Verifikasi service worker caching

2. **UI/UX verification**:
   - Storybook: semua stories render + dark mode
   - Semua halaman: skeleton loading (bukan spinner)
   - Error boundaries: trigger error manual di 3 fitur
   - Responsive: test 320px, 375px, 768px, 1024px, 1440px
   - Accessibility: tab through critical flows

3. **Testing verification**:
   - `pnpm test --run` — 0 failures
   - `pnpm test --run --coverage` — 80%+
   - `pnpm test:e2e` — all specs pass
   - `pnpm lint` — 0 errors
   - `pnpm format:check` — all pass
   - `node_modules/.bin/tsc --noEmit` — 0 errors

4. **Lint warnings cleanup**:
   - Address `no-explicit-any` warnings (225+ from Phase 2)
   - Target: reduce to < 50
   - Tambahkan proper types di mana `any` dipakai sebagai shortcut

5. **Buat summary report** — tulis ke `docs/phase3-report.md`:
   - Bundle size before vs after
   - Coverage before vs after
   - List semua deliverables
   - Exit criteria status (semua 18 criteria dari tabel di bawah)

**Commit**: `chore: Phase 3 final verification — all exit criteria pass`

---

## EXIT CRITERIA — Semua HARUS terpenuhi

| #   | Criteria                    | Metric                                                 |
| --- | --------------------------- | ------------------------------------------------------ |
| 1   | html2canvas + jspdf removed | 0 imports, vendor-pdf chunk hilang                     |
| 2   | Server-side PDF             | Edge Function `generate-pdf` berfungsi                 |
| 3   | PWA                         | Installable, service worker active, offline fallback   |
| 4   | Bundle budget               | Main chunk < 350kB, CI enforced                        |
| 5   | Core Web Vitals             | Monitoring active, targets: LCP<2.5s INP<200ms CLS<0.1 |
| 6   | DB indexes                  | `001_performance_indexes.sql` committed                |
| 7   | Design system               | Tokens documented, 14+ UI components with variants     |
| 8   | Storybook                   | 14+ stories, dark mode, builds clean                   |
| 9   | Skeleton loading            | 7+ page skeletons, 0 spinner-only states               |
| 10  | Error boundaries            | 5+ features wrapped, fallback UI works                 |
| 11  | Accessibility               | WCAG 2.1 AA — keyboard nav, ARIA, contrast             |
| 12  | Responsive                  | 5 breakpoints verified, no layout breaks               |
| 13  | i18n ready                  | `src/i18n/` infrastructure + strings extracted         |
| 14  | Coverage                    | 80%+ semua thresholds                                  |
| 15  | Upgrade docs                | `docs/upgrade-guide.md` committed                      |
| 16  | Bundle CI                   | CI fails jika main chunk > 350kB                       |
| 17  | Dependency docs             | `docs/dependency-decisions.md` committed               |
| 18  | Lint warnings               | < 50 warnings (turun dari 225+)                        |

---

## CATATAN PENTING

- **Bahasa Indonesia WAJIB** di semua UI text. Jangan pernah tulis English di button, label, heading, error message, toast, tooltip, dll.
- **Dark mode WAJIB** di semua komponen baru. Test dengan `class="dark"` di `<html>`.
- **Backward compatible** — jangan break existing component usages saat enhance.
- **pnpm, bukan npm** — semua command pakai `pnpm`.
- **`node_modules/.bin/tsc`** bukan `npx tsc` — npx sering error di project ini.
- **Update CHANGELOG.md** setiap commit.
- **Jangan lupa deploy edge function** generate-pdf ke Supabase setelah buat.
- Jika ada blocker atau error yang tidak bisa diselesaikan, dokumentasikan di `docs/phase3-blockers.md` dan lanjut ke task berikutnya.

Mulai dari Sprint 3.0 Day 1. Kerjakan satu per satu secara berurutan. Setelah selesai semua, jalankan full verification (Day 12) dan buat summary report.
