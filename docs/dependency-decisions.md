# EduSync LMS — Dependency Decisions

> Last reviewed: 2026-03-22

Dokumen ini mencatat setiap dependency, alasan pemilihan, alternatif yang dipertimbangkan, dan kapan perlu di-evaluasi ulang.

---

## Runtime Dependencies

| Package                          | Version   | Alasan                                                               | Alternatif                                               | Re-evaluate                    |
| -------------------------------- | --------- | -------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------ |
| `react`                          | ^19.0.0   | Industry standard, ekosistem terbesar                                | Preact (lebih kecil), Solid (lebih cepat)                | Saat React 20 stable           |
| `react-dom`                      | ^19.0.0   | Required companion untuk React di browser                            | N/A (harus sesuai versi React)                           | Bersamaan dengan React         |
| `@supabase/supabase-js`          | ^2.98.0   | BaaS utama — auth, database, realtime, storage                       | Firebase, Appwrite, Nhost                                | Saat v3 stable                 |
| `@tanstack/react-query`          | ^5.90.21  | Server state management — caching, invalidation, optimistic updates  | SWR (lebih sederhana), Apollo (untuk GraphQL)            | Saat v6 diumumkan              |
| `@tanstack/react-query-devtools` | ^5.91.3   | Debug tool untuk React Query — melihat cache state, query timing     | Bawaan React DevTools                                    | Ikut versi React Query         |
| `@tanstack/react-virtual`        | ^3.13.21  | Virtualized list rendering untuk long lists (LessonSidebar)          | react-window, react-virtuoso                             | Stabil, low priority           |
| `react-router-dom`               | ^7.13.1   | Client-side routing dengan HashRouter                                | TanStack Router, Wouter                                  | Saat framework mode dibutuhkan |
| `zustand`                        | ^5.0.12   | Client state management — quiz player, toast, calendar               | Jotai (atomic), Valtio (proxy-based)                     | Stabil, low priority           |
| `recharts`                       | ^3.7.0    | Chart library untuk analytics dashboards (10+ chart components)      | Victory, Nivo (lebih kaya), Chart.js (lebih ringan)      | Jika bundle size concern       |
| `motion`                         | ^12.23.24 | Animasi UI — page transitions, modals, micro-interactions (81 files) | react-spring, CSS only, GSAP                             | Jika performance/bundle issue  |
| `lucide-react`                   | ^0.546.0  | Icon library — tree-shakeable, consistent style (155+ files)         | Heroicons, Phosphor, Tabler Icons                        | Stabil, low priority           |
| `katex`                          | ^0.16.33  | Math rendering untuk konten pelajaran (rumus matematika)             | MathJax (lebih lengkap tapi 5x lebih besar)              | Jika butuh fitur MathJax       |
| `react-markdown`                 | ^10.1.0   | Markdown rendering untuk forum, AI tutor, artikel (4 files)          | @mdx-js/react, marked + DOMPurify                        | Stabil, ekosistem remark bagus |
| `rehype-katex`                   | ^7.0.1    | Plugin rehype untuk render math di dalam markdown                    | N/A (pasangan react-markdown + katex)                    | Ikut react-markdown            |
| `remark-gfm`                     | ^4.0.1    | Plugin remark untuk GitHub Flavored Markdown (tables, strikethrough) | N/A (standar remark plugin)                              | Ikut react-markdown            |
| `remark-math`                    | ^6.0.0    | Plugin remark untuk parse math syntax ($..$ dan $$..$$)              | N/A (standar remark plugin)                              | Ikut react-markdown            |
| `date-fns`                       | ^4.1.0    | Date formatting dan manipulation (4 files)                           | dayjs (lebih kecil), Temporal API (future native)        | Saat Temporal API stabil       |
| `clsx`                           | ^2.1.1    | Conditional CSS class name builder (digunakan di `cn()` utility)     | classnames                                               | Stabil, near-zero overhead     |
| `tailwind-merge`                 | ^3.5.0    | Merge conflicting Tailwind classes (digunakan di `cn()` utility)     | N/A (unik untuk Tailwind)                                | Ikut versi Tailwind            |
| `tailwindcss`                    | ^4.2.2    | Utility-first CSS framework                                          | UnoCSS, Vanilla Extract, CSS Modules                     | Saat v5 stable                 |
| `@tailwindcss/vite`              | ^4.1.14   | Vite plugin untuk Tailwind v4 (lebih cepat dari PostCSS)             | PostCSS plugin (tailwindcss/postcss)                     | Ikut versi Tailwind            |
| `canvas-confetti`                | ^1.9.4    | Confetti effect untuk celebrations (course completion, badges)       | Buat sendiri dengan Canvas API                           | Stabil, sangat ringan (~3KB)   |
| `papaparse`                      | ^5.5.3    | CSV parsing untuk export reports (1 file)                            | csv-parse, native                                        | Stabil, low priority           |
| `@hello-pangea/dnd`              | ^18.0.1   | Drag-and-drop untuk course builder (lesson block reordering)         | dnd-kit (lebih modern), react-beautiful-dnd (deprecated) | Pertimbangkan dnd-kit          |
| `web-vitals`                     | ^5.1.0    | Core Web Vitals measurement (LCP, FID, CLS)                          | Built-in Performance API                                 | Stabil, standar Google         |
| `vite`                           | ^6.2.0    | Build tool dan dev server                                            | Webpack 5, Turbopack, Rspack                             | Saat v8 ecosystem stabil       |
| `@vitejs/plugin-react`           | ^5.0.4    | Vite plugin untuk React (JSX transform, Fast Refresh)                | @vitejs/plugin-react-swc (lebih cepat)                   | Pertimbangkan SWC variant      |

---

## Dev Dependencies

| Package                            | Version   | Alasan                                                | Alternatif                                   | Re-evaluate                   |
| ---------------------------------- | --------- | ----------------------------------------------------- | -------------------------------------------- | ----------------------------- |
| `typescript`                       | ~5.8.2    | Type safety, IDE support                              | Flow (abandoned by most)                     | Saat v6 stable                |
| `vitest`                           | ^4.1.0    | Unit testing — Vite-native, Jest-compatible API       | Jest (lebih lambat dengan Vite)              | Stabil, low priority          |
| `@vitest/coverage-v8`              | ^4.1.0    | Code coverage via V8 engine                           | Istanbul (c8)                                | Ikut versi Vitest             |
| `@playwright/test`                 | ^1.58.2   | E2E testing — cross-browser, reliable                 | Cypress (heavier), Puppeteer (Chrome only)   | Stabil, best-in-class         |
| `@testing-library/react`           | ^16.3.2   | Component testing — test behavior, not implementation | Enzyme (deprecated)                          | Ikut versi React              |
| `@testing-library/jest-dom`        | ^6.9.1    | Custom Jest matchers untuk DOM assertions             | Vitest built-in matchers                     | Ikut Testing Library          |
| `jsdom`                            | ^29.0.0   | DOM environment untuk unit tests (Vitest)             | happy-dom (lebih cepat)                      | Pertimbangkan happy-dom       |
| `eslint`                           | ^10.1.0   | Linting — code quality dan consistency                | Biome (lebih cepat, tapi kurang plugin)      | Saat Biome matang             |
| `@typescript-eslint/eslint-plugin` | ^8.57.1   | TypeScript-specific lint rules                        | Biome built-in TS support                    | Ikut ESLint                   |
| `@typescript-eslint/parser`        | ^8.57.1   | TypeScript parser untuk ESLint                        | Biome                                        | Ikut ESLint                   |
| `eslint-config-prettier`           | ^10.1.8   | Disable ESLint rules yang conflict dengan Prettier    | N/A (diperlukan jika pakai keduanya)         | Ikut ESLint + Prettier        |
| `eslint-plugin-react-hooks`        | ^7.0.1    | Enforce Rules of Hooks dan dependency arrays          | Manual review                                | Wajib untuk React projects    |
| `prettier`                         | ^3.8.1    | Code formatter — consistent style                     | Biome formatter, dprint                      | Saat Biome matang             |
| `husky`                            | ^9.1.7    | Git hooks (pre-commit)                                | simple-git-hooks (lebih ringan), lefthook    | Stabil, low priority          |
| `lint-staged`                      | ^16.4.0   | Run linters hanya pada staged files                   | nano-staged (lebih cepat)                    | Stabil, low priority          |
| `knip`                             | ^6.0.0    | Detect unused files, exports, dan dependencies        | ts-prune, depcheck                           | Stabil, best-in-class         |
| `storybook`                        | ^10.3.1   | Component documentation dan visual testing            | Ladle (lebih ringan), Docusaurus             | Stabil, ekosistem besar       |
| `@storybook/react`                 | ^10.3.1   | Storybook renderer untuk React                        | N/A                                          | Ikut Storybook                |
| `@storybook/react-vite`            | ^10.3.1   | Storybook builder menggunakan Vite                    | @storybook/builder-webpack5                  | Ikut Storybook                |
| `@storybook/addon-essentials`      | ^8.6.14   | Storybook core addons (controls, actions, docs)       | Individual addons                            | **Perlu sinkronisasi ke v10** |
| `@storybook/addon-themes`          | ^10.3.1   | Theme switching di Storybook (dark/light)             | Manual decorator                             | Ikut Storybook                |
| `@storybook/blocks`                | ^8.6.14   | Storybook doc blocks                                  | N/A                                          | **Perlu sinkronisasi ke v10** |
| `@storybook/test`                  | ^8.6.15   | Storybook interaction testing                         | @testing-library/react                       | **Perlu sinkronisasi ke v10** |
| `vite-plugin-pwa`                  | ^1.2.0    | PWA support — service worker generation, manifest     | workbox-build manual                         | Ikut versi Vite               |
| `rollup-plugin-visualizer`         | ^7.0.1    | Bundle size analysis — treemap visualization          | webpack-bundle-analyzer, source-map-explorer | Ikut versi Rollup/Vite        |
| `@types/react-dom`                 | ^19.2.3   | TypeScript types untuk react-dom                      | N/A                                          | Ikut versi React              |
| `@types/node`                      | ^22.19.15 | TypeScript types untuk Node.js APIs                   | N/A                                          | **Latest: 25.x, update**      |
| `@types/canvas-confetti`           | ^1.9.0    | TypeScript types untuk canvas-confetti                | N/A                                          | Ikut canvas-confetti          |
| `@types/papaparse`                 | ^5.3.14   | TypeScript types untuk papaparse                      | N/A                                          | Ikut papaparse                |

---

## Current Status (`pnpm outdated` per 2026-03-22)

| Package                          | Installed | Latest  | Urgency  | Action                                                    |
| -------------------------------- | --------- | ------- | -------- | --------------------------------------------------------- |
| `@tanstack/react-query`          | 5.91.3    | 5.94.5  | Rendah   | Patch update, aman di-update                              |
| `@tanstack/react-query-devtools` | 5.91.3    | 5.94.5  | Rendah   | Update bersamaan dengan react-query                       |
| `typescript`                     | 5.8.3     | 5.9.3   | Rendah   | Minor update; ubah `~5.8.2` ke `~5.9.0` setelah testing   |
| `@types/node`                    | 22.19.15  | 25.5.0  | Rendah   | Major jump; update saat Node.js runtime di-upgrade        |
| `@vitejs/plugin-react`           | 5.2.0     | 6.0.1   | Menengah | Major update; update bersamaan dengan Vite                |
| `vite`                           | 6.4.1     | 8.0.1   | Menengah | **2 major versions behind**; perlu evaluasi plugin compat |
| `lucide-react`                   | 0.546.0   | 0.577.0 | Rendah   | Minor icon additions, aman di-update                      |

### Rekomendasi Prioritas Update

1. **Segera (safe patches)**: `@tanstack/react-query` + devtools ke 5.94.5, `lucide-react` ke 0.577.0
2. **Sprint berikutnya**: `typescript` ke 5.9.x (setelah full typecheck pass)
3. **Evaluasi khusus**: `vite` 6 ke 8 — butuh dedicated PR, cek semua plugin compatibility
4. **Sinkronisasi**: Storybook addon-essentials, blocks, dan test ke v10 agar sesuai dengan `storybook` v10.3.1

---

## Dependency Decision Log

### Keputusan Arsitektur

| Keputusan                                    | Tanggal  | Alasan                                                                             |
| -------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Pilih `motion` daripada `react-spring`       | Pre-2026 | API lebih declarative, ekosistem lebih besar, gesture support                      |
| Pilih `zustand` daripada `Redux`             | Pre-2026 | Minimal boilerplate, cocok untuk isolated store (quiz player)                      |
| Pilih `@hello-pangea/dnd` daripada `dnd-kit` | Pre-2026 | Fork dari react-beautiful-dnd yang maintained; pertimbangkan migrasi ke dnd-kit    |
| Pilih `recharts` daripada `Chart.js`         | Pre-2026 | React-native components, declarative API, composable                               |
| Pilih `date-fns` daripada `dayjs`            | Pre-2026 | Tree-shakeable, functional API, tipe TypeScript lebih baik                         |
| Pilih `katex` daripada `MathJax`             | Pre-2026 | ~5x lebih kecil, rendering lebih cepat, cukup untuk kebutuhan sekolah              |
| Pilih `papaparse` daripada native            | Pre-2026 | Robust CSV parsing dengan streaming support                                        |
| Pilih `clsx` + `tailwind-merge` (via `cn()`) | Pre-2026 | Pattern standar komunitas Tailwind untuk conditional + conflict-free class merging |
| Pilih `vitest` daripada `jest`               | Pre-2026 | Native Vite integration, lebih cepat, API identik dengan Jest                      |
| Pilih `@playwright/test` daripada `cypress`  | Pre-2026 | Cross-browser, lebih cepat, built-in auto-wait                                     |

### Packages yang Perlu Dipertimbangkan Ulang

| Package                  | Saran                               | Alasan                                                                      |
| ------------------------ | ----------------------------------- | --------------------------------------------------------------------------- |
| `@hello-pangea/dnd`      | Evaluasi migrasi ke `dnd-kit`       | dnd-kit lebih aktif dikembangkan, accessibility lebih baik, hooks-based API |
| `@vitejs/plugin-react`   | Evaluasi `@vitejs/plugin-react-swc` | SWC transform 20x lebih cepat dari Babel; tidak butuh Babel config          |
| `jsdom`                  | Evaluasi `happy-dom`                | happy-dom 2-3x lebih cepat untuk unit tests                                 |
| Storybook addon versions | Sinkronisasi semua ke v10           | 3 packages masih v8 sementara core sudah v10                                |

---

## Security Notes

- **Tidak ada dependency dengan known vulnerabilities** pada saat review ini
- Jalankan `pnpm audit` secara berkala (minimal per sprint)
- Semua Supabase credentials hanya di environment variables, tidak di client code
- `@types/*` packages adalah dev-only dan tidak masuk production bundle

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
