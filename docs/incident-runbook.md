# EduSync LMS — Incident Response Runbook

## Overview

This runbook defines how to detect, respond to, and resolve incidents on the EduSync platform. All engineers are expected to be familiar with severity levels and their corresponding response procedures.

---

## 1. Severity Levels

| Level | Description                            | Example                                       |
| ----- | -------------------------------------- | --------------------------------------------- |
| P1    | Platform down for all users            | Auth service unreachable, DB unresponsive     |
| P2    | Major feature broken for all users     | Quiz submission failing, dashboard 500s       |
| P3    | Degraded performance or partial outage | Slow analytics queries, intermittent errors   |
| P4    | Minor issue, cosmetic, or edge case    | Wrong label on a single page, UI misalignment |

---

## 2. Response Time SLOs

| Severity | Acknowledge  | Mitigation Target | Resolution Target     |
| -------- | ------------ | ----------------- | --------------------- |
| P1       | 15 minutes   | 1 hour            | 4 hours               |
| P2       | 1 hour       | 4 hours           | 8 hours               |
| P3       | 4 hours      | Next business day | 3 business days       |
| P4       | Next biz day | Best effort       | Within current sprint |

---

## 3. Incident Scenarios

### Scenario 1: Database Connection Pool Exhausted

**Symptoms:** `connection pool exhausted` errors in Sentry, 503s from Supabase REST API, Edge Functions timing out.

**Immediate steps:**

1. Check Supabase Dashboard → Database → Reports → Connection usage
2. Identify which Edge Functions or services are holding connections open
3. Restart stalled Edge Functions: Supabase Dashboard → Edge Functions → restart each function
4. Check for long-running queries: `SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;`
5. Terminate blocking queries if safe: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE duration > interval '5 minutes';`
6. Enable connection pooler (PgBouncer) in Supabase if not already active: Settings → Database → Connection pooling → Transaction mode
7. If pool is still exhausted, scale up Supabase compute tier

**Root cause investigation:** Review Edge Function logs for missing `await supabase.auth.signOut()` or unclosed client sessions.

---

### Scenario 2: RLS Blocking Legitimate Queries

**Symptoms:** Users see empty dashboards or unexpected 403 responses. Queries returning 0 rows for authenticated users.

**Immediate steps:**

1. Reproduce in Supabase SQL Editor using: `SET role = authenticated; SET request.jwt.claims = '{"sub":"[user_uuid]","role":"authenticated"}'; SELECT * FROM courses LIMIT 5;`
2. Check that the user's `tenant_id` is set in `profiles`: `SELECT id, tenant_id FROM profiles WHERE id = '[user_uuid]';`
3. Check `get_my_tenant_id()` function returns the correct value for the user
4. Check JWT claims include tenant context: inspect token at jwt.io — look for `tenant_id` or custom claims
5. If `tenant_id` is missing from `profiles`, manually set it: `UPDATE profiles SET tenant_id = '[correct_tenant_id]' WHERE id = '[user_uuid]';`
6. If RLS policy is incorrect, patch via migration — never disable RLS in production

**Do NOT** run `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` on production. This is a P1 security violation.

---

### Scenario 3: Edge Function Timeout

**Symptoms:** Edge Function returns 504, AI Tutor unresponsive, email sends failing.

**Immediate steps:**

1. Open Supabase Dashboard → Edge Functions → select the function → Logs
2. Identify the line causing the timeout (look for missing `await`, external API calls hanging)
3. Check external service status (OpenAI, Resend, Stripe) for outages
4. Increase timeout in function config: set `"timeout": 60` in `supabase/functions/[fn]/index.ts`
5. Deploy updated function: `supabase functions deploy [fn-name] --project-ref [ref]`
6. If external service is down, enable fallback mode (e.g., disable AI Tutor feature flag)

**Prevention:** All Edge Functions must have explicit timeout handling with `AbortController` for external API calls.

---

### Scenario 4: Auth Token Expired — Mass Event

**Symptoms:** Large number of simultaneous 401 errors in Sentry, users logged out across sessions.

**Immediate steps:**

1. Check Supabase Dashboard → Auth → Users — look for JWT expiry settings
2. Check if `JWT_EXPIRY` was recently changed in Supabase project settings
3. Verify Supabase client is configured with `autoRefreshToken: true` in `src/lib/supabase.ts`
4. Check for a recent deployment that may have reset session state
5. If widespread logout: post communication in status channel immediately (see templates below)
6. Users need to log in again — no data loss

**Prevention:** Ensure `autoRefreshToken: true` and `persistSession: true` in the Supabase client. Test session persistence in E2E tests.

---

### Scenario 5: Build Failure on Main

**Symptoms:** CI pipeline fails on `main`, deployment blocked, Vercel deploy fails.

**Immediate steps:**

1. Check GitHub Actions → CI run → identify failing job (typecheck / lint / test / build)
2. Read the full error output — do not guess
3. If the failure is a flaky test: re-run the job once before investigating
4. If the failure is a genuine regression: identify the commit that introduced it with `git bisect` or by reading the diff
5. Fix forward if the fix is < 30 minutes; otherwise revert the offending commit: `git revert [sha] && git push`
6. If Vercel has already deployed a broken build: go to Vercel Dashboard → Deployments → promote the last known-good deployment
7. Notify team in engineering channel with commit SHA and status

**Do NOT** push `--force` to `main`. Use `git revert` to preserve history.

---

### Scenario 6: High Error Rate in Sentry

**Symptoms:** Sentry alert fires, error rate spike, PagerDuty page (if configured).

**Immediate steps:**

1. Open Sentry → Issues → sort by "First seen" to identify new errors vs regressions
2. Check "Releases" tab — did error rate spike after a recent deploy?
3. Identify the top error by count — read the full stack trace and breadcrumbs
4. Check if the error correlates with a feature flag: disable the flag if so
5. If the error is from a recent deploy: initiate rollback (Scenario 5 procedure above)
6. If the error is pre-existing and low-severity (P3/P4): create a GitHub issue and continue
7. Check Edge Function logs for any server-side errors matching the Sentry event

---

## 4. Post-Incident Process

All P1 and P2 incidents require a post-incident writeup within 24 hours of resolution.

### Writeup Template

```
## Incident Report: [YYYY-MM-DD] [Short title]

**Severity:** P1 / P2
**Duration:** [start time] → [end time] ([X] hours)
**Impact:** [Number of users affected, features impacted]
**Detected by:** [Sentry alert / user report / monitoring]

### Timeline
- HH:MM — [Event]
- HH:MM — [Action taken]
- HH:MM — [Resolution]

### Root Cause (5-Whys)
1. Why did users get errors? → [answer]
2. Why did [answer] happen? → [answer]
3. Why did [answer] happen? → [answer]
4. Why did [answer] happen? → [answer]
5. Why did [answer] happen? → [root cause]

### Action Items
| Action                        | Owner | Due date   |
|-------------------------------|-------|------------|
| [Preventive measure]          | [Name]| YYYY-MM-DD |

### What went well
- [Item]

### What to improve
- [Item]
```

Store writeups in `docs/incidents/YYYY-MM-DD-[slug].md`.

---

## 5. Communication Templates

### Initial Status Update (post within 15 min of P1 declaration)

```
[INCIDENT] We are currently investigating an issue affecting EduSync.
Affected: [feature/all users]
Status: Investigating
Next update: [time, max 30 min]
```

### Resolved Communication

```
[RESOLVED] The incident affecting [feature] has been resolved.
Duration: [X hours]
Impact: [brief description]
Root cause: [one sentence]
We will publish a full post-incident report within 24 hours.
```

### Scheduled Maintenance (24h advance notice)

```
[MAINTENANCE] EduSync will undergo scheduled maintenance on [date] from [time] to [time].
Expected impact: [brief]
What to expect: [brief]
```

---

## 6. Escalation Path

1. On-call engineer → investigate and mitigate
2. If unresolved in 30 min (P1) or 2h (P2) → escalate to engineering lead
3. If platform issue (Supabase/Vercel down) → escalate to Supabase support: https://supabase.com/dashboard/support/new
4. If data loss suspected → escalate to engineering lead + product lead immediately

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
