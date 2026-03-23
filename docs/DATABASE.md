# EduSync LMS — Database Reference

PostgreSQL on Supabase. 157 migration files (001–836).

## Key Tables

### Auth & Identity

| Table        | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `tenants`    | School organizations. Each row = one school.            |
| `profiles`   | User profile: name, email, avatar, `tenant_id`          |
| `user_roles` | Role assignments: `(user_id, role app_role, tenant_id)` |

### Learning

| Table              | Purpose                                                             |
| ------------------ | ------------------------------------------------------------------- |
| `courses`          | Course catalog. Has `tenant_id`, `created_by`, `status`             |
| `course_modules`   | Modules within a course. Has `"order"` (quoted, reserved word)      |
| `lessons`          | Lessons within a module. Has `type` (article/video/quiz), `"order"` |
| `lesson_resources` | Rich content for lessons (blocks, video URLs, etc.)                 |
| `lesson_progress`  | Per-student lesson completion records                               |
| `course_progress`  | Per-student, per-course progress percentage                         |

### Classroom

| Table                 | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `classes`             | A class links a course to a teacher and set of students  |
| `enrollments`         | Student ↔ class membership (`user_id`, not `student_id`) |
| `class_schedules`     | Schedule entries for classes                             |
| `class_announcements` | Announcements scoped to a class                          |

### Assessment

| Table                    | Purpose                                                                                       |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `quizzes`                | Quiz definitions linked to a lesson/class                                                     |
| `quiz_questions`         | Questions per quiz. Column `text` (not `question_text`)                                       |
| `quiz_options`           | Options per question. Column `text` (not `option_text`)                                       |
| `quiz_attempts`          | Student attempt records. Status: `IN_PROGRESS`, `SUBMITTED`, `GRADED`, `EXPIRED`, `ABANDONED` |
| `quiz_attempt_questions` | Per-question snapshot for immutability                                                        |
| `quiz_stats`             | Pre-aggregated quiz-level statistics                                                          |
| `question_bank`          | Reusable question repository (per-tenant)                                                     |
| `question_options`       | Options for question bank entries                                                             |
| `assignments`            | Teacher-created assignments                                                                   |
| `assignment_submissions` | Student submissions                                                                           |
| `grades`                 | Grades for submissions                                                                        |

### Analytics

| Table                    | Purpose                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `course_stats`           | Pre-aggregated analytics (updated every 5 min by pg_cron or on-demand)                                      |
| `student_lesson_signals` | Per-student lesson engagement signals. Columns: `total_time_spent`, `last_accessed_at`, `latest_quiz_score` |
| `learning_events`        | AI Tutor event log                                                                                          |
| `aggregation_state`      | Watermarks for incremental aggregation jobs                                                                 |

### Gamification

| Table               | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `xp_profiles`       | XP totals, level, streak. Column: `streak_current` |
| `xp_transactions`   | Individual XP award records                        |
| `badge_definitions` | Badge catalog with rarity tiers                    |
| `student_badges`    | Badge awards per student                           |

### Operations

| Table                | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `notifications`      | In-app notifications per user            |
| `activity_logs`      | User activity audit trail                |
| `attendance_records` | Attendance per student per class session |
| `invoices`           | Billing invoices                         |
| `payments`           | Payment records                          |

## Important Column Gotchas

| Table                    | Column              | Note                                                       |
| ------------------------ | ------------------- | ---------------------------------------------------------- |
| `quiz_questions`         | `text`              | NOT `question_text`                                        |
| `quiz_options`           | `text`              | NOT `option_text`                                          |
| `course_modules`         | `"order"`           | Reserved word — must be quoted in SQL                      |
| `lessons`                | `"order"`           | Reserved word — must be quoted in SQL                      |
| `courses`                | `status`            | Use `status = 'published'` — `is_published` does NOT exist |
| `enrollments`            | `user_id`           | NOT `student_id`                                           |
| `student_lesson_signals` | `total_time_spent`  | NOT `time_spent_seconds`                                   |
| `student_lesson_signals` | `last_accessed_at`  | NOT `last_event_at`                                        |
| `student_lesson_signals` | `latest_quiz_score` | NOT `quiz_avg_score`                                       |

## RLS Patterns

All tenant-scoped tables use:

```sql
-- SELECT policy pattern
USING (tenant_id = (SELECT public.get_my_tenant_id()))

-- INSERT policy pattern
WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()))
```

Scalar subquery `(SELECT ...)` is used so PostgreSQL caches the result per statement rather than re-evaluating for every row.

## Key Helper Functions

| Function                       | Returns | Purpose                             |
| ------------------------------ | ------- | ----------------------------------- |
| `get_my_tenant_id()`           | UUID    | Current user's tenant from profiles |
| `has_role(app_role)`           | BOOLEAN | Role check within caller's tenant   |
| `is_class_member(class_id)`    | BOOLEAN | Teacher or enrolled student         |
| `is_class_teacher(class_id)`   | BOOLEAN | Teacher of the class                |
| `is_course_creator(course_id)` | BOOLEAN | Course creator                      |

All helper functions are `SECURITY DEFINER` with `SET search_path TO 'public'`.

## Key RPC Functions

| Function                                                                                  | Purpose                           | Access              |
| ----------------------------------------------------------------------------------------- | --------------------------------- | ------------------- |
| `v1_start_quiz_attempt(p_quiz_id)`                                                        | Start or resume quiz attempt      | Student             |
| `v1_save_partial_answers(p_attempt_id, p_answers)`                                        | Autosave answers                  | Student             |
| `batch_save_answers(p_attempt_id, p_answers)`                                             | Batch autosave (single RPC call)  | Student             |
| `v1_submit_quiz_attempt(p_attempt_id, p_final_answers)`                                   | Submit and grade                  | Student             |
| `v1_get_quiz_results(p_attempt_id)`                                                       | Fetch attempt results             | Student             |
| `get_teacher_analytics(p_course_id, p_limit, p_cursor_student_id)`                        | Paginated analytics JSON          | Teacher/Admin       |
| `refresh_course_stats(p_course_id)`                                                       | Recalculate course_stats          | Teacher/Admin       |
| `award_quiz_xp(p_user_id, p_lesson_id, p_quiz_id, p_score, p_passing_score, p_tenant_id)` | Award XP after quiz               | Student (self only) |
| `get_leaderboard_v2(p_tenant_id, p_limit)`                                                | Tenant-scoped leaderboard         | Authenticated       |
| `get_lesson_viewer_payload(p_course_id)`                                                  | Full lesson tree for Smart Player | Student             |
| `record_xp_transaction(p_user_id, p_xp_amount, p_source_type, p_source_id)`               | Record XP transaction             | System              |
| `get_student_recommendations(p_user_id, p_limit)`                                         | Next lesson recommendations       | Student             |
| `start_quiz_attempt(quiz_id)`                                                             | Legacy quiz attempt (v2 API)      | Student             |
| `submit_quiz_attempt(attempt_id, answers, version)`                                       | Legacy submit (v2 API)            | Student             |

## pg_cron Jobs

The `pg_cron` extension is required. Scheduled jobs:

| Job Name                    | Schedule    | Function                         |
| --------------------------- | ----------- | -------------------------------- |
| `badge-xp-streak-processor` | Every 5 min | XP, badge, and streak processing |
| `refresh-all-course-stats`  | Periodic    | Refresh aggregated course stats  |

## Database Triggers

| Trigger                             | Table                | Purpose                                |
| ----------------------------------- | -------------------- | -------------------------------------- |
| `handle_new_user`                   | `auth.users`         | Creates profile + user_roles on signup |
| `auto_set_tenant_id`                | All 26 tenant tables | Auto-fills tenant_id on INSERT         |
| `custom_access_token_hook`          | Auth hook            | Injects tenant_id + role into JWT      |
| `handle_lesson_progress_change`     | `lesson_progress`    | Triggers course progress recompute     |
| `handle_quiz_attempt_status_change` | `quiz_attempts`      | Triggers XP award, badge check         |
| `handle_streak_on_activity`         | Various              | Updates streak on activity             |
| `handle_quiz_badges`                | `quiz_attempts`      | Awards quiz-related badges             |
| `handle_streak_badges`              | `xp_profiles`        | Awards streak-related badges           |
| `on_badge_earned`                   | `student_badges`     | Emits realtime event for UI            |
| `recompute_course_progress`         | `lesson_progress`    | Rolls up to course_progress            |

## Migration Reference

Migrations are in `supabase/migrations/` numbered `001` through `836`. Apply in numeric order. Key milestones:

| Range   | Domain                                                    |
| ------- | --------------------------------------------------------- |
| 001–062 | Core schema, auth, RLS foundation                         |
| 063–071 | Quiz engine v1/v2                                         |
| 072–095 | Analytics engine                                          |
| 096–200 | Various features                                          |
| 291–297 | Critical bug fixes (quiz grading, analytics auth)         |
| 810–820 | Advanced analytics (engagement, cohort, funnel, struggle) |
| 821–822 | Gamification v2 (XP, badges, leaderboard, streaks)        |
| 823–825 | Registration helpers, attendance, seed data               |
| 836     | Security fixes (5 HIGH vulnerabilities)                   |

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
