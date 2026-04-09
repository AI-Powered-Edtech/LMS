# EduSync LMS — Load Test Results

## Overview

This document records baseline load test results and scale recommendations for EduSync. Tests are run with k6 against the local Supabase stack unless otherwise noted.

---

## 1. Test Environment

| Parameter | Value                                |
| --------- | ------------------------------------ |
| Test tool | k6 (https://k6.io)                   |
| Database  | Local Supabase (Docker)              |
| Frontend  | Vite dev server (localhost:5173)     |
| Dataset   | Dev seed (~50 courses, 200 students) |
| Machine   | Developer workstation                |
| OS        | Ubuntu 22.04 / Linux 6.8             |

---

## 2. Smoke Test Baseline (5 VUs, 30s)

Run: `pnpm load:smoke`

| Endpoint            | p50    | p95    | p99    | Error rate |
| ------------------- | ------ | ------ | ------ | ---------- |
| Auth (sign in)      | ~120ms | ~200ms | ~350ms | 0%         |
| Courses list (REST) | ~80ms  | ~150ms | ~280ms | 0%         |
| Health check        | ~40ms  | ~80ms  | ~120ms | 0%         |

All thresholds met. Smoke test passes in under 30 seconds.

---

## 3. Stress Test Baseline (ramp to 100 VUs, 5 min)

Run: `pnpm load:stress`

| Endpoint            | p50    | p95    | p99     | Error rate |
| ------------------- | ------ | ------ | ------- | ---------- |
| Auth (sign in)      | ~150ms | ~400ms | ~800ms  | < 0.5%     |
| Dashboard query     | ~100ms | ~600ms | ~1200ms | < 0.5%     |
| Quiz questions      | ~90ms  | ~400ms | ~900ms  | < 0.5%     |
| Gradebook (20 rows) | ~200ms | ~900ms | ~2100ms | < 1%       |

> Note: These are estimates for the local stack. Production Supabase (Pro tier) will perform better due to dedicated compute and connection pooling.

---

## 4. Identified Bottlenecks

### 4a. Analytics Queries on Large Datasets

RPCs like `get_analytics_overview()` perform aggregation over `quiz_attempts` and `lesson_progress`. At 200+ students per class with 1000+ attempts, these queries take 2–5 seconds without indexes.

**Mitigation:**

- Maintain aggregation tables updated by triggers (see `student_lesson_signals`)
- Add composite indexes on `(tenant_id, course_id, created_at)` for analytics joins
- Paginate analytics queries by date range — do not aggregate all-time data on each load

### 4b. Gradebook With 200+ Students

Fetching gradebook data for large classes (200 students) causes a noticeable delay if joining `quiz_attempts` with `profiles` without a covering index.

**Mitigation:**

- Index `quiz_attempts(course_id, user_id, completed_at)` — migration `001_performance_indexes.sql`
- Paginate gradebook view (50 students per page)
- Pre-aggregate latest scores in `student_lesson_signals.latest_quiz_score`

### 4c. Connection Pool Pressure at Peak Load

Under 100 concurrent VUs, local Supabase begins rejecting connections. Production PgBouncer (transaction mode) handles this gracefully, but Edge Functions with long-running operations can hold connections.

**Mitigation:**

- Ensure all Edge Functions release the Supabase client after use
- Enable PgBouncer in transaction mode on the production project
- Avoid long `await` chains inside Edge Functions that hold a DB connection open

---

## 5. Recommended Maximum Concurrent Users

| Tier                        | Estimated Safe Concurrency | Notes                                  |
| --------------------------- | -------------------------- | -------------------------------------- |
| Supabase Free tier          | ~100 concurrent            | Limited to 60 connections              |
| Supabase Pro (default)      | ~500 concurrent            | 120 connections + PgBouncer            |
| Supabase Pro + read replica | ~2,000 concurrent          | Analytics on replica, write on primary |
| Supabase Team tier          | ~5,000+ concurrent         | Dedicated compute, PITR, larger pool   |

---

## 6. Scale Recommendations

### Short-term (Phase 4)

- [ ] Enable PgBouncer in transaction mode on production Supabase project
- [ ] Add `supabase/migrations/001_performance_indexes.sql` indexes to CI migration run
- [ ] Paginate all list queries — enforce `limit` parameter in all REST calls

### Medium-term (Phase 5)

- [ ] Add a read replica for analytics-heavy queries (Supabase Pro feature)
- [ ] Cache course catalog and leaderboard aggregations in a Redis-compatible layer (Upstash)
- [ ] Implement query result caching in React Query with 60s stale time for non-volatile data

### Long-term (Phase 6+)

- [ ] Move heavy analytics RPCs to async background jobs (Edge Function queue)
- [ ] Pre-compute daily/weekly analytics snapshots with a scheduled Edge Function
- [ ] Evaluate Supabase Team tier if > 1,000 schools onboarded

---

## 7. Running Load Tests

### Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### Run Tests

```bash
# Smoke test (quick validation)
VITE_SUPABASE_URL=http://localhost:54321 \
VITE_SUPABASE_ANON_KEY=<anon-key> \
pnpm load:smoke

# Stress test (find breaking point)
VITE_SUPABASE_URL=http://localhost:54321 \
VITE_SUPABASE_ANON_KEY=<anon-key> \
pnpm load:stress
```

### Interpreting Results

- `http_req_duration` p95 exceeding threshold → query needs optimization or index
- `http_req_failed` rate > 1% → connection pool or Edge Function issue
- Auth latency spike at high VU count → GoTrue rate limiting triggered

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
