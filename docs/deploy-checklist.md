# EduSync LMS — Deploy Checklist

## Overview

Follow this checklist for every production deployment. Steps marked [REQUIRED] must be completed before merging to main.

---

## Pre-Deploy Checklist

### Code Quality [REQUIRED]

- [ ] All CI checks passing on the PR: typecheck, lint, unit tests, E2E tests
- [ ] No `console.log` or `console.debug` in production code paths (use `logger` utility or remove)
- [ ] No hardcoded user IDs, tenant IDs, or credentials in changed files
- [ ] `SELECT *` not introduced in any new query
- [ ] New tables have RLS enabled and `tenant_id` column
- [ ] New RPCs have `auth.uid() IS NOT NULL` guard and `SET search_path TO 'public'`

### Bundle Size [REQUIRED]

- [ ] Run `pnpm analyze` and verify total bundle is within budget (< 500 kB gzipped for main chunk)
- [ ] No new heavy dependency added without a `docs/dependency-decisions.md` entry
- [ ] Code splitting in place for any new route or large feature module

### Database Migrations [REQUIRED]

- [ ] All new migrations are in `supabase/migrations/` with sequential timestamps
- [ ] Migrations reviewed for: irreversibility, data loss risk, long-running locks
- [ ] Destructive migrations (DROP, ALTER TYPE) have been tested on a staging clone first
- [ ] `docs/DATABASE_ARCHITECTURE.md` updated to reflect schema changes

### Documentation [REQUIRED]

- [ ] `CHANGELOG.md` updated with the changes in this PR
- [ ] Relevant `docs/` files updated if architecture or behavior changed
- [ ] New feature modules have a `README.md` inside `src/features/[module]/`

---

## Deploy Steps

1. **Merge PR to main** — requires at least 1 approved review
2. **CI runs automatically** — GitHub Actions runs: typecheck → lint → unit tests → build
3. **Vercel deploys automatically** — triggered on push to `main`, deploys to production
4. **Run migrations** — if this release includes schema changes:
   ```bash
   supabase db push --linked --project-ref [production-project-ref]
   ```
   > Run migrations AFTER deploy if they are backward-compatible (additive). Run BEFORE deploy if the old code cannot run against the new schema.
5. **Smoke test** — see section below
6. **Monitor Sentry** — watch for new errors for 15 minutes post-deploy

---

## Post-Deploy Smoke Test

Run these checks immediately after each production deploy:

### Manual smoke test (5 minutes)

1. Open https://app.edusync.id in a private browser window
2. **Login:** log in as `student@edusync.dev` — verify dashboard loads without errors
3. **Dashboard:** confirm course list renders, no spinner stuck
4. **Quiz submit:** navigate to a lesson with a quiz, complete and submit it — verify score saves
5. **Teacher view:** log in as `teacher@edusync.dev`, open gradebook — verify student scores visible
6. **Admin view:** log in as `admin@edusync.dev`, open analytics — verify charts render

### Automated health check

The deploy workflow runs a health check automatically:

```bash
curl -f "$PROD_URL/functions/v1/health-check"
```

If this returns non-200, the deploy workflow fails and alerts the team.

---

## Rollback Procedure

### Option A: Revert via Vercel (fastest, no code change)

1. Go to Vercel Dashboard → Deployments
2. Find the last known-good deployment
3. Click "..." → "Promote to Production"
4. Verify smoke test passes

### Option B: Revert via Git

```bash
git revert [failing-commit-sha]
git push origin main
```

This triggers a new CI run and deploy. Do NOT use `git push --force` on main.

### Option C: Migration rollback (if schema change caused the issue)

Run the down migration manually in Supabase SQL Editor or via CLI:

```bash
supabase db reset --linked  # WARNING: destroys all data — only on staging
```

For production, write a compensating migration:

```sql
-- Example: revert a column addition
ALTER TABLE courses DROP COLUMN IF EXISTS new_column;
```

Apply it as a new migration file with a later timestamp.

---

## Monitoring Post-Deploy

| Check                    | Tool             | Action if abnormal                        |
| ------------------------ | ---------------- | ----------------------------------------- |
| Error rate spike         | Sentry           | Investigate top errors, consider rollback |
| Health endpoint          | Vercel + CI      | Triggers automatic alert                  |
| DB query latency         | Supabase Reports | Check for missing indexes or bad queries  |
| Edge Function error rate | Supabase Logs    | Check Deno logs for unhandled exceptions  |
| Build bundle size        | `pnpm analyze`   | File issue if > budget                    |

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
