# EduSync LMS — Developer Runbook

## Prerequisites

- Node.js 20+, npm 10+
- Supabase CLI: `npm i -g supabase`
- agent-browser (for visual QA): `npm i -g agent-browser && agent-browser install`

---

## 1. Initial Setup

### Install dependencies

```bash
npm install
```

### Configure environment

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
# Settings are at: Supabase Dashboard → Project Settings → API
```

Required variables:

```
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_DEV_PASSWORD=password123   # optional, pre-fills login form in dev
```

---

## 2. Start Development

```bash
npm run dev
# App runs at http://localhost:5173
# All routes use HashRouter: http://localhost:5173/#/...
```

---

## 3. Database Setup

### Apply migrations to remote

```bash
supabase db push
```

### Seed demo data (creates test tenant, courses, classes)

```bash
# Run seed_base.sql first (creates demo-school tenant, enables modules)
psql $DATABASE_URL < supabase/seed/seed_base.sql

# Run seed_demo.sql second (requires users to exist in auth.users first)
psql $DATABASE_URL < supabase/seed/seed_demo.sql
```

### Creating test users (required before seed_demo.sql)

Test users cannot be created via SQL — Supabase Auth owns user creation.
Create them via Supabase Dashboard > Authentication > Users, or use the Admin API:

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

Note: use `.dev` TLD. Emails with `.test` TLD fail GoTrue validation.

### Seed tenant_modules (prevents admin console warnings)

```bash
# seed_base.sql seeds tenant_modules automatically via:
#   INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
#   SELECT v_tenant_id, m.id, ... FROM public.modules m
#   ON CONFLICT DO NOTHING;
#
# If the admin dashboard shows a warning about missing module config,
# re-run seed_base.sql or apply migration 840:
psql $DATABASE_URL < supabase/migrations/840_tenant_modules_rls_and_seed.sql
```

---

## 4. Test Accounts (Shared Dev Project)

| Email                 | Password      | Role    | Redirect After Login |
| --------------------- | ------------- | ------- | -------------------- |
| `teacher@edusync.dev` | `password123` | TEACHER | `/#/app/teacher`     |
| `student@edusync.dev` | `password123` | STUDENT | `/#/app/student`     |
| `admin@edusync.dev`   | `password123` | ADMIN   | `/#/app/admin`       |

Remote Supabase project: `omfnkoufjqjqilswldtz.supabase.co`

---

## 5. Quality Checks

### TypeScript (must be clean before any merge)

```bash
npx tsc --noEmit
```

### Production build (must succeed before any deploy)

```bash
npx vite build
# Warnings about chunk size >500KB are expected and non-blocking.
# Any actual error will cause a non-zero exit code.
```

### Visual QA with agent-browser

```bash
# Example: smoke test login as teacher
agent-browser do "go to http://localhost:5173/#/login, fill email teacher@edusync.dev password password123, click Login, wait for page to load, take screenshot"

# Check admin console for errors
agent-browser do "go to http://localhost:5173/#/app/admin, wait 3 seconds, check browser console for errors, take screenshot"
```

---

## 6. Known Good URLs (Golden Paths)

| Role    | URL                                        | Expected Result                   |
| ------- | ------------------------------------------ | --------------------------------- |
| Any     | `/#/login`                                 | Login form in Bahasa Indonesia    |
| Any     | `/#/workspace-selector`                    | Tenant picker (if multi-tenant)   |
| Any     | `/#/app`                                   | RoleResolver → redirects by role  |
| Teacher | `/#/app/teacher`                           | Teacher dashboard                 |
| Teacher | `/#/teaching/course-builder?courseId=<ID>` | Course builder                    |
| Teacher | `/#/app/teacher/quiz-manager`              | Quiz manager                      |
| Student | `/#/app/student`                           | Student dashboard                 |
| Student | `/#/app/student/courses`                   | Enrolled courses                  |
| Admin   | `/#/app/admin`                             | Administration dashboard          |
| Admin   | `/#/app/admin/users`                       | User management                   |
| Any     | `/#/unauthorized`                          | "Akses Ditolak" page (Indonesian) |

---

## 7. Migration Checklist (Cycle 1+2 verified, applied to remote)

| Migration                               | Purpose                                                                             | Status             |
| --------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ |
| `836_security_fixes.sql`                | Security hardening (award_quiz_xp caller check, RLS tightening, search_path fix)    | Applied            |
| `837_add_performance_indexes.sql`       | Performance indexes (corrected column names: user_id not student_id)                | Applied            |
| `838_remove_io_heavy_crons.sql`         | Remove heavy cron jobs (analytics jobs), re-schedule badge check at 30min           | Applied            |
| `839_fix_rpc_publish_course_tenant.sql` | Fix rpc_publish_course JWT tenant bug (use get_my_tenant_id() instead of JWT claim) | Applied            |
| `840_tenant_modules_rls_and_seed.sql`   | Enable RLS on tenant_modules + seed missing rows for existing tenants               | Apply on next push |

---

## 8. Architecture Quick Reference

- **No traditional backend** — all business logic is in Supabase PostgreSQL (RLS + SQL functions)
- **Auth**: Supabase Auth + `user_roles` table. Role comes from `user_roles`, NOT JWT claims.
- **Tenant isolation**: Every tenant-scoped table has `tenant_id`. RLS enforces it via `get_my_tenant_id()`.
- **Event-driven analytics**: High-frequency events are batched client-side and ingested via Edge Functions.
- **HashRouter**: All client-side routes use `/#/` prefix. Deep links refresh correctly.

---

## 9. Common Issues and Fixes

### "Gagal memuat konfigurasi modul" warning in admin console

**Root cause**: `modules` table has RLS requiring `tenant_id = get_my_tenant_id()`. If no `modules` rows exist for the dev tenant's `tenant_id`, the join returns nothing and the service falls back to defaults.

**Fix**: Apply `840_tenant_modules_rls_and_seed.sql` to seed missing rows:

```bash
psql $DATABASE_URL < supabase/migrations/840_tenant_modules_rls_and_seed.sql
```

The dashboard will then load real module config from the database instead of hardcoded defaults.

### rpc_publish_course fails in course builder

**Root cause**: Old function used `current_setting('request.jwt.claims')` to get tenant_id. JWT claims don't include tenant_id for most users.

**Fix**: Migration `839_fix_rpc_publish_course_tenant.sql` replaced the function to use `get_my_tenant_id()` which reads from the `user_roles` table directly. Ensure this migration is applied.

### Infinite loading spinner after logout

**Root cause**: `signOut()` called `supabase.auth.signOut()` before clearing React state, causing auth state listener to re-render with stale user.

**Fix**: `AuthContext.tsx` now clears React state BEFORE calling `supabase.auth.signOut()`. Do not revert this order.

### `.test` TLD email fails registration/login

GoTrue validates email TLDs. Use `.dev`, `.com`, or real domains. Test accounts use `@edusync.dev`.

### Student accessing teacher route shows "Akses Ditolak"

Expected behavior. `RoleGuard` on `app/teacher`, `app/admin`, `app/student` redirects to `/unauthorized` which renders the Indonesian "Akses Ditolak" page.

---

## 10. Offline Behavior

`OfflineIndicator` component (`src/components/OfflineIndicator.tsx`) uses `navigator.onLine` + window events to detect offline state. When offline, a banner appears: "Anda sedang offline. Progress disimpan secara lokal."

The quiz player has additional offline handling (autosave to local state). The lesson viewer does not buffer content offline — students need connectivity.

---

## 11. Dark Mode

Dark mode is controlled by `ThemeContext` (`src/contexts/ThemeContext.tsx`). Toggle via the Header component. All new components must include `dark:` Tailwind variants.

Test dark mode:

```bash
agent-browser do "go to http://localhost:5173/#/app/student, click the dark mode toggle, take screenshot"
```

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 24 feature module yang saling terintegrasi:

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
