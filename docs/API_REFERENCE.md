# EduSync LMS — API Reference

Dokumen ini berisi referensi lengkap semua Supabase RPC endpoints dan service functions yang digunakan oleh feature modules EduSync LMS.

## Service Layer Architecture

Setiap feature module memiliki service layer di `src/features/{feature}/api/` yang mengenkapsulasi semua interaksi dengan Supabase.

## Endpoints by Feature

### administration

- `Administrasi` Service: `src/features/administration/api/`
- Tables: `tenants`, `tenant_modules`, `sync_history`
- Domain: Admin

### ai-tutor

- `AI Tutor` Service: `src/features/ai-tutor/api/`
- Tables: `ai_tutor_sessions`, `ai_tutor_messages`
- Domain: Learning

### analytics

- `Analitik` Service: `src/features/analytics/api/`
- Tables: `analytics_events`, `engagement_metrics`
- Domain: Analytics

### announcements

- `Pengumuman` Service: `src/features/announcements/api/`
- Tables: `announcements`, `announcement_reads`
- Domain: Communication

### assignments

- `Tugas` Service: `src/features/assignments/api/`
- Tables: `assignments`, `assignment_submissions`
- Domain: Assessment

### calendar

- `Kalender` Service: `src/features/calendar/api/`
- Tables: `calendar_events`, `academic_calendar`
- Domain: Academic

### classroom

- `Kelas` Service: `src/features/classroom/api/`
- Tables: `classrooms`, `classroom_students`, `classroom_teachers`
- Domain: Academic

### courses

- `Kursus` Service: `src/features/courses/api/`
- Tables: `courses`, `course_modules`, `enrollments`
- Domain: Academic

### dashboards

- `Dashboard` Service: `src/features/dashboards/api/`
- Tables: `dashboards`, `dashboard_widgets`
- Domain: Analytics

### discussions

- `Diskusi` Service: `src/features/discussions/api/`
- Tables: `discussions`, `discussion_comments`
- Domain: Communication

### gamification

- `Gamifikasi` Service: `src/features/gamification/api/`
- Tables: `xp_events`, `badges`, `user_badges`, `streaks`, `leaderboard_cache`
- Domain: Engagement

### gradebook

- `Buku Nilai` Service: `src/features/gradebook/api/`
- Tables: `grade_entries`, `grade_categories`
- Domain: Assessment

### guidance

- `Panduan` Service: `src/features/guidance/api/`
- Tables: `guides`, `guide_completions`
- Domain: Admin

### lessons

- `Pelajaran` Service: `src/features/lessons/api/`
- Tables: `lessons`, `lesson_blocks`, `student_lesson_signals`
- Domain: Learning

### moderation

- `Moderasi` Service: `src/features/moderation/api/`
- Tables: `moderation_actions`, `moderation_queue`
- Domain: Admin

### notifications

- `Notifikasi` Service: `src/features/notifications/api/`
- Tables: `notifications`, `notification_preferences`
- Domain: Communication

### onboarding

- `Onboarding` Service: `src/features/onboarding/api/`
- Tables: `onboarding_progress`
- Domain: Admin

### progress

- `Kemajuan Belajar` Service: `src/features/progress/api/`
- Tables: `student_progress`, `module_progress`
- Domain: Learning

### question-bank

- `Bank Soal` Service: `src/features/question-bank/api/`
- Tables: `quiz_questions`, `quiz_options`
- Domain: Assessment

### quizzes

- `Kuis` Service: `src/features/quizzes/api/`
- Tables: `quizzes`, `quiz_attempts`, `quiz_answers`, `quiz_assignments`
- Domain: Assessment

### recommendations

- `Rekomendasi` Service: `src/features/recommendations/api/`
- Tables: `recommendations`
- Domain: Learning

### reports

- `Laporan` Service: `src/features/reports/api/`
- Tables: `reports`, `report_schedules`
- Domain: Analytics

### storage

- `Penyimpanan` Service: `src/features/storage/api/`
- Tables: `storage_files`
- Domain: Infrastructure

### struggle

- `Deteksi Kesulitan` Service: `src/features/struggle/api/`
- Tables: `struggle_alerts`, `struggle_config`
- Domain: Analytics

## Authentication

Semua endpoint memerlukan autentikasi via Supabase Auth. RLS policies memastikan tenant isolation.

## Rate Limiting

Edge Functions memiliki rate limit 100 req/min per user. Client-side batching digunakan untuk high-frequency events.

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
