# EduSync LMS — Upgrade Guide

> Last reviewed: 2026-03-22

Panduan ini mendokumentasikan strategi upgrade untuk setiap dependency utama EduSync LMS.
Istilah teknis ditulis dalam bahasa Inggris; penjelasan dalam Bahasa Indonesia.

---

## React 19 → Future

### Fitur React 19 yang Aktif Digunakan

| Fitur                     | Lokasi                                       | Catatan                                                                            |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `React.lazy` + `Suspense` | `src/app/routes.tsx` — 45+ lazy page imports | Semua page-level routes di-lazy-load dengan `<Suspense fallback={<AppLoading />}>` |
| `useId`                   | `Modal.tsx`, `Select.tsx`, `Input.tsx`       | Untuk accessible label `id`/`htmlFor` pairing                                      |
| Concurrent rendering      | Seluruh app                                  | HashRouter berjalan di concurrent mode secara default                              |
| Automatic batching        | Seluruh app                                  | State updates di event handlers dan effects otomatis di-batch                      |
| `use` hook                | Belum digunakan                              | Tersedia untuk future adoption (promise/context reading)                           |
| Server Components         | Belum digunakan                              | Arsitektur Supabase-centric tidak memerlukan SSR saat ini                          |

### Class Components yang Masih Ada

EduSync memiliki 4 ErrorBoundary class components (satu-satunya pola yang membutuhkan class component di React):

- `src/components/ErrorBoundary.tsx`
- `src/components/common/ErrorBoundary.tsx`
- `src/components/FeatureErrorBoundary.tsx`
- `src/components/ui/ErrorBoundary.tsx`

**Tidak ada class component lain.** Semua ErrorBoundary sah karena React belum menyediakan hook equivalent untuk `componentDidCatch`.

### Catatan Migrasi ke React 20+

1. **Monitor React canary channel** — React team biasanya memberi peringatan 6-12 bulan sebelum deprecation
2. **ErrorBoundary** — Jika React 20 menambahkan `useErrorBoundary` hook, konsolidasikan 4 file ErrorBoundary menjadi 1 functional component
3. **`useEffect` cleanup** — Semua `useEffect` sudah menggunakan cleanup pattern (contoh: `setupPrefetchListeners()` di `App.tsx` mengembalikan cleanup function)
4. **StrictMode** — Pastikan semua side-effect idempotent (StrictMode double-invoke di development)
5. **Server Components** — Jika EduSync membutuhkan SSR di masa depan (SEO untuk halaman publik), siapkan migrasi ke React Server Components + framework seperti Next.js atau React Router v7 framework mode
6. **Compiler (React Forget)** — Monitor React Compiler untuk auto-memoization; jika stable, hapus manual `useMemo`/`useCallback` yang redundan
7. **`use()` hook** — Pertimbangkan adopsi untuk mengganti pola `useEffect` + state untuk data fetching (saat ini sudah ditangani oleh React Query)

### Risiko Migrasi: RENDAH

React team berkomitmen pada backward compatibility. Breaking changes biasanya minimal antar major version.

---

## Tailwind CSS v4 → Future

### Pendekatan Saat Ini

EduSync menggunakan **Tailwind CSS v4** dengan pendekatan CSS-first:

- **Tidak ada `tailwind.config.js`** — konfigurasi sepenuhnya di CSS
- **Design tokens** didefinisikan di `src/styles/tokens.css` sebagai CSS custom properties (`:root` dan `.dark`)
- **Token categories**: colors (primary/secondary/success/warning/danger/neutral), spacing, typography, shadows, border-radius, transitions, z-index scale
- **Dark mode** via `.dark` class atau `[data-theme="dark"]` attribute, dengan inverted color scales
- **Vite plugin**: `@tailwindcss/vite` (bukan PostCSS plugin) untuk performa build terbaik
- **`cn()` utility** di `src/utils/cn.ts` menggunakan `clsx` + `tailwind-merge` untuk conditional class merging

### Hal yang Perlu Diperhatikan untuk v5+

1. **`@theme` directive changes** — Monitor perubahan pada CSS-first config syntax
2. **Utility name stability** — Beberapa utility mungkin di-rename; jalankan codemod jika tersedia
3. **`tokens.css` compatibility** — Custom properties (CSS variables) adalah standard web dan kemungkinan besar tetap kompatibel
4. **`tailwind-merge` compatibility** — Library ini harus di-update bersamaan karena ia meng-parse Tailwind class names
5. **`@tailwindcss/vite` plugin** — Pastikan major version plugin sesuai dengan major version Tailwind
6. **Dark mode strategy** — Inverted color scale di `tokens.css` adalah pattern custom; pastikan tidak bertentangan dengan built-in dark mode Tailwind

### Risiko Migrasi: RENDAH-MENENGAH

Tailwind v4 sudah CSS-first, jadi migrasi ke v5 kemungkinan lebih mulus dibanding v3 ke v4. Namun, utility name changes bisa membutuhkan refactor di 155+ file yang menggunakan Tailwind classes.

---

## Supabase JS v2 → v3

### Penggunaan Saat Ini

- **Client singleton**: `src/services/supabase/client.ts`
- **Auth**: `AuthContext.tsx` menggunakan `supabase.auth.signInWithPassword`, `signUp`, `signOut`, `getSession`, `onAuthStateChange`, `resetPasswordForEmail`, `updateUser`
- **Auth patterns di pages**: `ForgotPassword.tsx`, `ResetPassword.tsx`, `VerifyEmail.tsx`
- **Database queries**: via `supabase.from()` dan `.rpc()` di semua service files
- **Realtime**: digunakan untuk notifications dan live features
- **Storage**: digunakan untuk document management

### Breaking Changes yang Perlu Diperhatikan

1. **Auth API** — `signInWithPassword` sudah digunakan (migrasi dari v1 `signIn` sudah selesai). v3 mungkin mengubah response shapes
2. **Realtime API** — Subscription API mungkin berubah (channel creation, filter syntax)
3. **Storage API** — Bucket access patterns dan signed URL generation mungkin berubah
4. **Type generation** — `supabase gen types` output mungkin berbeda; regenerasi diperlukan
5. **Error handling** — Error response format mungkin berubah
6. **`PostgrestFilterBuilder`** — Method chaining API mungkin berubah

### Checklist Sebelum Upgrade

```
[ ] Backup database (pg_dump)
[ ] Baca changelog v3 lengkap dan migration guide
[ ] Audit semua file yang import dari @supabase/supabase-js (2 files)
[ ] Audit semua file yang menggunakan supabase.auth.* (10 files)
[ ] Test semua RPC functions — jalankan full test suite
[ ] Verify RLS policies masih bekerja — test per-role
[ ] Test auth flow end-to-end (login, signup, forgot password, reset, verify email)
[ ] Test realtime subscriptions
[ ] Test storage upload/download
[ ] Update TypeScript types dari supabase gen types
[ ] Update @supabase/supabase-js di package.json
[ ] Run full E2E test suite (Playwright)
```

### Risiko Migrasi: MENENGAH

Supabase JS adalah dependency paling kritis — semua data access melalui library ini. Upgrade harus dilakukan dengan hati-hati dan comprehensive testing.

---

## Vite 6 → 7/8

### Konfigurasi Saat Ini

- `vite.config.ts` menggunakan: `@vitejs/plugin-react`, `@tailwindcss/vite`, `vite-plugin-pwa`, `rollup-plugin-visualizer`
- **Manual chunks**: vendor-react, vendor-supabase, vendor-recharts, vendor-katex, vendor-query
- **Path alias**: `@/` maps ke project root
- **PWA**: service worker dengan runtime caching untuk Supabase API, images, fonts
- **HMR**: configurable via `DISABLE_HMR` env var

### Status per `pnpm outdated`

| Package                | Current | Latest | Notes                                 |
| ---------------------- | ------- | ------ | ------------------------------------- |
| `vite`                 | 6.4.1   | 8.0.1  | **Major jump** — v7 dan v8 sekaligus  |
| `@vitejs/plugin-react` | 5.2.0   | 6.0.1  | Harus di-update bersamaan dengan Vite |

### Hal yang Perlu Diperhatikan

1. **Plugin API compatibility** — `vite-plugin-pwa`, `@tailwindcss/vite`, dan `rollup-plugin-visualizer` harus kompatibel dengan Vite major version baru
2. **Rollup version bump** — Vite 7+ kemungkinan menggunakan Rollup 5; `manualChunks` config mungkin perlu disesuaikan
3. **Environment API** — Vite 6 memperkenalkan Environment API; Vite 7+ mungkin menjadikannya default
4. **Config format changes** — `defineConfig` API biasanya stabil, tapi cek changelog
5. **Node.js version requirement** — Major Vite versions sering menaikkan minimum Node version
6. **`moduleResolution: 'bundler'`** di tsconfig — Pastikan masih kompatibel

### Strategi Upgrade

```
1. Update vite-plugin-pwa terlebih dahulu (cek compatibility matrix)
2. Update @tailwindcss/vite
3. Update @vitejs/plugin-react
4. Update vite
5. Run build + verify manualChunks masih bekerja
6. Run E2E tests
```

### Risiko Migrasi: MENENGAH

Plugin ecosystem harus sinkron. Lakukan upgrade Vite setelah semua plugin mendukung versi baru.

---

## TypeScript 5.8 → 6.x

### Konfigurasi Saat Ini

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "strict": true,
  "experimentalDecorators": true,
  "isolatedModules": true,
  "jsx": "react-jsx",
  "noEmit": true
}
```

### Status per `pnpm outdated`

| Package      | Current | Latest |
| ------------ | ------- | ------ |
| `typescript` | 5.8.3   | 5.9.3  |

Catatan: `package.json` menggunakan `~5.8.2` (tilde = patch-only updates). Upgrade ke 5.9 memerlukan update manual.

### Perubahan yang Perlu Diperhatikan untuk 6.x

1. **`experimentalDecorators`** — TypeScript 6 mungkin menjadikan TC39 decorators sebagai default. EduSync menggunakan `experimentalDecorators: true`; cek apakah ada decorator usage yang perlu dimigrasi
2. **`moduleResolution: 'bundler'`** — Kemungkinan tetap didukung
3. **Stricter type checking** — Setiap minor version menambahkan pengecekan baru. Enable `strictNullChecks`, `noUncheckedIndexedAccess` secara bertahap jika belum aktif
4. **`isolatedModules`** — Sudah aktif, yang berarti kode sudah compatible dengan transpiler-only mode
5. **`--verbatimModuleSyntax`** — Pertimbangkan mengaktifkan ini sebagai pengganti `isolatedModules` di TS 6
6. **`@types/node` bump** — Current: 22.x, Latest: 25.x. Update bersamaan dengan TypeScript

### Risiko Migrasi: RENDAH

TypeScript minor dan major upgrades biasanya menambah fitur dan stricter checks, jarang breaking. `noEmit: true` berarti output sepenuhnya dihandle oleh Vite/esbuild.

---

## React Router v7

### Penggunaan Saat Ini

- **HashRouter** (`react-router-dom`) di `App.tsx`
- **45+ lazy routes** di `src/app/routes.tsx`
- **Guards**: `AuthGuard`, `TenantGuard`, `RoleGuard`, `CourseEnrollmentGuard`
- **Legacy redirects**: 30+ `<Navigate>` routes untuk backward compatibility
- **Hooks**: `useParams`, `useNavigate`, `useLocation`, `useSearchParams` digunakan di 48+ files

### Migrasi ke v8+

1. **Framework mode** — React Router v7 memperkenalkan framework mode (mirip Remix). EduSync menggunakan library mode saja; pastikan library mode tetap didukung
2. **`loader`/`action` patterns** — Jika bermigrasi ke data router, perlu refactor guards dan data fetching
3. **`createHashRouter`** — Jika API berubah dari component-based ke object-based routing, refactor `routes.tsx`
4. **Lazy route discovery** — v7+ mendukung `lazy` property di route config; bisa menyederhanakan 45+ `lazy()` imports

### Risiko Migrasi: RENDAH-MENENGAH

React Router v7 sudah digunakan. Library mode kemungkinan stabil untuk beberapa major versions ke depan.

---

## React Query (TanStack Query) v5

### Penggunaan Saat Ini

- **139 hook usages** tersebar di 26+ query/mutation files
- **Pattern**: dedicated query files di `features/*/queries/` (contoh: `analyticsQueries.ts`, `quizPlayer.queries.ts`)
- **DevTools**: `@tanstack/react-query-devtools` aktif

### Migrasi ke v6+

1. **Query key changes** — v5 sudah menggunakan array query keys; kemungkinan stabil
2. **`useQuery` API** — Monitor deprecation pada options yang digunakan
3. **Suspense mode** — Jika React 20 memperdalam Suspense integration, TanStack Query akan mengikuti
4. **Codemod tersedia** — TanStack biasanya menyediakan codemod untuk migrasi major version

### Risiko Migrasi: RENDAH

TanStack Query v5 relatif baru dan stabil. Re-evaluate saat v6 diumumkan.

---

## Motion (Framer Motion) v12

### Penggunaan Saat Ini

- **81 files** mengimport dari `motion`
- Digunakan untuk: page transitions, modal animations, confetti effects, skeleton loading, hover states
- `useReducedMotion` hook sudah diterapkan untuk accessibility

### Migrasi ke v13+

1. **API stability** — `motion` package (rebranded dari `framer-motion`) sudah stabil
2. **Bundle size** — Monitor bundle size; pertimbangkan tree-shaking jika membesar
3. **`useReducedMotion`** — Pastikan tetap kompatibel
4. **CSS-only alternative** — Untuk animasi sederhana, pertimbangkan migrasi bertahap ke CSS transitions/animations (mengurangi JS bundle)

### Risiko Migrasi: RENDAH

---

## Storybook 10

### Penggunaan Saat Ini

- **Mixed versions** di `package.json`: `storybook` dan beberapa addon di v10, beberapa addon masih v8
- Config: `.storybook/main.ts`, `.storybook/preview.ts`
- Story files: `*.stories.tsx` di `src/components/ui/`

### Catatan

Versi `@storybook/addon-essentials` (8.6.14) dan `@storybook/test` (8.6.15) tidak sinkron dengan `storybook` (10.3.1). Sebelum upgrade, **sinkronkan semua Storybook packages ke versi yang sama** menggunakan `npx storybook@latest upgrade`.

### Risiko Migrasi: RENDAH

---

## Checklist Umum Sebelum Major Upgrade Apapun

```
[ ] Baca changelog dan migration guide lengkap
[ ] Buat branch terpisah untuk upgrade
[ ] Jalankan pnpm outdated untuk melihat semua yang perlu di-update
[ ] Update satu major dependency per PR (bukan semuanya sekaligus)
[ ] Jalankan typecheck: pnpm typecheck
[ ] Jalankan lint: pnpm lint
[ ] Jalankan unit tests: pnpm test
[ ] Jalankan E2E tests: pnpm test:e2e
[ ] Jalankan build: pnpm build
[ ] Verifikasi bundle size tidak melonjak: pnpm analyze
[ ] Test manual: login flow, lesson viewer, quiz player, analytics
```

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 49 feature module yang saling terintegrasi:

| Feature         | Domain         | Deskripsi                                                                                                                  |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| administration  | Admin          | Administrasi — Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data                                              |
| ai-tutor        | Learning       | AI Tutor — Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa                                    |
| analytics       | Analytics      | Analitik — Dashboard analitik komprehensif untuk guru dan admin                                                            |
| announcements   | Communication  | Pengumuman — Sistem pengumuman sekolah                                                                                     |
| assignments     | Assessment     | Tugas — Manajemen tugas dari pembuatan hingga penilaian                                                                    |
| calendar        | Academic       | Kalender — Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah             |
| classroom       | Academic       | Kelas — Manajemen kelas virtual dan fisik                                                                                  |
| courses         | Academic       | Kursus — Core learning module                                                                                              |
| dashboards      | Analytics      | Dashboard — Dashboard kustom dengan widget builder                                                                         |
| discussions     | Communication  | Diskusi — Forum diskusi per kursus                                                                                         |
| gamification    | Engagement     | Gamifikasi — Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard                                  |
| gradebook       | Assessment     | Buku Nilai — Buku nilai digital untuk guru                                                                                 |
| guidance        | Admin          | Panduan — Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)                                                 |
| lessons         | Learning       | Pelajaran — Konten pelajaran dengan block-based editor                                                                     |
| moderation      | Admin          | Moderasi — Moderasi konten user-generated (diskusi, komentar)                                                              |
| notifications   | Communication  | Notifikasi — Sistem notifikasi real-time dengan bell icon dan panel                                                        |
| onboarding      | Admin          | Onboarding — Wizard onboarding untuk pengguna baru                                                                         |
| progress        | Learning       | Kemajuan Belajar — Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran                        |
| question-bank   | Assessment     | Bank Soal — Repositori soal yang bisa digunakan ulang di berbagai kuis                                                     |
| quizzes         | Assessment     | Kuis — Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal               |
| recommendations | Learning       | Rekomendasi — Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa                             |
| reports         | Analytics      | Laporan — Generator laporan akademik, keuangan (SPP), PPDB, dan custom                                                     |
| storage         | Infrastructure | Penyimpanan — Manajemen file dan media untuk materi pembelajaran                                                           |
| struggle        | Analytics      | Deteksi Kesulitan — Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa |

Setiap feature module mengikuti arsitektur standar dengan folder: api/, queries/, hooks/, types/, components/, dan **tests**/. Semua feature mendukung dark mode dan skeleton loading screens.
