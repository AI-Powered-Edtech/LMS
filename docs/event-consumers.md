# Event Consumers Architecture

EduSync LMS uses a highly scalable event-driven architecture to process student and teacher activities efficiently without overwhelming the database with queries.

## Concept

Instead of every feature querying the `activity_events` table directly, events flow through a processing pipeline:

```text
activity_events  →  Database Triggers (O(1) updates)
                 →  Database Webhook (Async)  →  Edge Function  →  Consumer Tables
```

## 1. Consumer Tables

Consumer tables pre-aggregate data globally for the LMS, allowing rapid retrieval:

- **`lesson_progress` / `course_progress`**: Updated instantaneously to reflect student progress.
- **`leaderboards`**: Tenant-isolated points and ranks for gamification, enabling entirely query-free leaderboard fetching. It uses the `idx_leaderboards_tenant_points` index.
- **`course_stats`**: Pre-aggregated analytics for teachers and admins. It uses the `idx_course_stats_course` index.
- **`notifications`**: User-facing alerts.

All consumer tables strictly enforce `tenant_id` for multi-tenant isolation and RLS policies.

## 2. Event Processing Pipeline

### Lightweight Triggers (Real-time O(1))

For immediate feedback like updating a lesson's completion status, we use a database trigger (`trg_process_progress_events`).

- **Rule**: Triggers must never execute heavy aggregations, complex joins, or call external services.

### Async Edge Functions (Heavy Logic)

For heavy processing (Analytics, Notifications, Gamification computations), Supabase Database Webhooks asynchronously invoke the `event-consumer` Edge Function.

- The `event-consumer` processes logic in Deno and upserts consumer tables.

### Idempotency / Processing Guards

To prevent duplicate processing by edge function retries, `activity_events` tracks progress with three timestamp columns:

- `processed_gamification_at`
- `processed_notifications_at`
- `processed_analytics_at`

## Configuration Instructions

To ensure the `event-consumer` Edge Function is triggered correctly:

1. Go to your **Supabase Dashboard** > **Database** > **Webhooks**.
2. Create a new Webhook:
   - **Name**: `activity_events_consumer`
   - **Table**: `public.activity_events`
   - **Events**: `INSERT`
   - **Type**: HTTP Request
   - **Method**: `POST`
   - **URL**: Your Edge Function URL for `event-consumer` (e.g. `https://[PROJECT_ID].functions.supabase.co/event-consumer`)
   - **Headers**: Add `Authorization: Bearer [YOUR_ANON_KEY]` or Service Role Key if required.

_(Once configured, whenever a student completes a lesson, the activity is fully propagated to leaderboards, stats, and notifications asynchronously)._

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
