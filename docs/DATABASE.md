# EduSync LMS — Database Reference

PostgreSQL on Supabase. 160 migration files (001–836, Phase 22 group assignments + public profile).

## Key Tables

### Auth & Identity

| Table        | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| `tenants`    | School organizations. Each row = one school.            |
| `profiles`   | User profile: name, email, avatar, `tenant_id`          |
| `user_roles` | Role assignments: `(user_id, role app_role, tenant_id)` |

### Learning

| Table                  | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `courses`              | Course catalog. Has `tenant_id`, `created_by`, `status`             |
| `course_modules`       | Modules within a course. Has `"order"` (quoted, reserved word)      |
| `lessons`              | Lessons within a module. Has `type` (article/video/quiz), `"order"` |
| `lesson_resources`     | Rich content for lessons (blocks, video URLs, etc.)                 |
| `lesson_progress`      | Per-student lesson completion records                               |
| `course_progress`      | Per-student, per-course progress percentage                         |
| `course_versions`      | JSONB snapshots of course tree for versioning/rollback              |
| `content_templates`    | Reusable course/module/lesson blueprints (per-tenant)               |
| `course_collaborators` | Multi-author collaboration: author/reviewer/publisher roles         |

### Classroom

| Table                 | Purpose                                                  |
| --------------------- | -------------------------------------------------------- |
| `classes`             | A class links a course to a teacher and set of students  |
| `enrollments`         | Student ↔ class membership (`user_id`, not `student_id`) |
| `class_schedules`     | Schedule entries for classes                             |
| `class_announcements` | Announcements scoped to a class                          |

### Assessment

| Table                    | Purpose                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quizzes`                | Quiz definitions linked to a lesson/class                                                                                                                                       |
| `quiz_questions`         | Questions per quiz. Column `text` (not `question_text`)                                                                                                                         |
| `quiz_options`           | Options per question. Column `text` (not `option_text`)                                                                                                                         |
| `quiz_attempts`          | Student attempt records. Status: `IN_PROGRESS`, `SUBMITTED`, `GRADED`, `EXPIRED`, `ABANDONED`                                                                                   |
| `quiz_attempts_v2`       | Partitioned replacement for `quiz_attempts` (PARTITION BY RANGE on `started_at`). Columns include `is_reviewed` (boolean, default false) for teacher review of cheating signals |
| `quiz_attempt_questions` | Per-question snapshot for immutability                                                                                                                                          |
| `quiz_stats`             | Pre-aggregated quiz-level statistics                                                                                                                                            |
| `question_bank`          | Reusable question repository (per-tenant)                                                                                                                                       |
| `question_options`       | Options for question bank entries                                                                                                                                               |
| `assignments`              | Teacher-created assignments                                                                                                                                                   |
| `assignment_submissions`   | Student submissions                                                                                                                                                           |
| `grades`                   | Grades for submissions                                                                                                                                                        |
| `assignment_groups`        | Group assignment containers: `assignment_id`, `name`, `tenant_id`                                                                                                             |
| `assignment_group_members` | Group membership: `group_id`, `user_id`, `tenant_id`                                                                                                                          |
| `group_submissions`        | Group-level submissions: `group_id`, `assignment_id`, `submitted_by`, `content`, `grade`, `tenant_id`                                                                         |

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

### External Integration (LTI & SCORM)

| Table                        | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `lti_platform_registrations` | External LMS platform configs (Canvas, Moodle). One per platform per tenant |
| `lti_nonces`                 | OIDC replay protection for LTI launches. Short-lived, auto-expired          |
| `lti_sessions`               | Active LTI guest sessions mapped to Supabase users                          |
| `scorm_packages`             | Registry of uploaded SCORM 1.2/2004 content linked to lessons               |
| `scorm_runtime_data`         | Per-user SCORM CMI state: scores, status, suspend_data, total_time          |

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
| `profiles`               | `is_public`         | Added by Phase 22 migration. Also: `show_badges`, `show_xp`, `show_courses` privacy flags |

## RLS Patterns

All tenant-scoped tables use:
<<<<<<< HEAD
=======

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

| Function                                                                                  | Purpose                                        | Access                |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------- |
| `v1_start_quiz_attempt(p_quiz_id)`                                                        | Start or resume quiz attempt                   | Student               |
| `v1_save_partial_answers(p_attempt_id, p_answers)`                                        | Autosave answers                               | Student               |
| `batch_save_answers(p_attempt_id, p_answers)`                                             | Batch autosave (single RPC call)               | Student               |
| `v1_submit_quiz_attempt(p_attempt_id, p_final_answers)`                                   | Submit and grade                               | Student               |
| `v1_get_quiz_results(p_attempt_id)`                                                       | Fetch attempt results                          | Student               |
| `get_teacher_analytics(p_course_id, p_limit, p_cursor_student_id)`                        | Paginated analytics JSON                       | Teacher/Admin         |
| `refresh_course_stats(p_course_id)`                                                       | Recalculate course_stats                       | Teacher/Admin         |
| `award_quiz_xp(p_user_id, p_lesson_id, p_quiz_id, p_score, p_passing_score, p_tenant_id)` | Award XP after quiz                            | Student (self only)   |
| `get_leaderboard_v2(p_tenant_id, p_limit)`                                                | Tenant-scoped leaderboard                      | Authenticated         |
| `get_lesson_viewer_payload(p_course_id)`                                                  | Full lesson tree for Smart Player              | Student               |
| `record_xp_transaction(p_user_id, p_xp_amount, p_source_type, p_source_id)`               | Record XP transaction                          | System                |
| `get_student_recommendations(p_user_id, p_limit)`                                         | Next lesson recommendations                    | Student               |
| `start_quiz_attempt(quiz_id)`                                                             | Legacy quiz attempt (v2 API)                   | Student               |
| `submit_quiz_attempt(attempt_id, answers, version)`                                       | Legacy submit (v2 API)                         | Student               |
| `ensure_profile_exists()`                                                                 | Auto-create profile if missing                 | Authenticated         |
| `create_school_tenant(p_school_name, p_full_name, p_role)`                                | B2B onboarding: register school                | Authenticated         |
| `join_school_via_token(p_token)`                                                          | B2B onboarding: join via invite                | Authenticated         |
| `onboard_student_join_class(p_join_code, p_full_name)`                                    | Student onboarding via class code              | Authenticated         |
| `save_course_version(p_course_id, p_message)`                                             | Snapshot course tree as version                | Teacher               |
| `restore_course_version(p_version_id)`                                                    | Rollback course to a snapshot                  | Teacher               |
| `save_content_template(p_type, p_title, p_description, p_source_id)`                      | Save entity as reusable template               | Teacher               |
| `import_content_template(p_template_id, p_target_id, p_order)`                            | Import template with new UUIDs                 | Teacher               |
| `upsert_scorm_runtime(p_user_id, p_scorm_package_id, p_tenant_id, p_cmi_data, ...)`       | Atomic SCORM state save + lesson_progress sync | Student               |
| `cleanup_expired_lti_nonces()`                                                            | Remove expired LTI nonces                      | System (service_role) |
| `get_student_group_assignment(p_assignment_id)`                                           | Group details + members + submission status for student | Student          |
| `get_teacher_group_overview(p_assignment_id)`                                             | All groups + submission progress + grades for teacher   | Teacher          |
| `create_assignment_groups(p_assignment_id, p_groups)`                                     | Batch-create groups and assign members                  | Teacher          |
| `submit_group_assignment(p_group_id, p_assignment_id, p_content)`                         | Submit on behalf of group (any member)                  | Student          |
| `grade_group_submission(p_submission_id, p_grade, p_feedback)`                            | Grade a group submission                                | Teacher          |
| `get_public_profile(p_user_id)`                                                           | Returns public profile fields respecting privacy flags  | Authenticated    |
| `update_profile_privacy(p_is_public, p_show_badges, p_show_xp, p_show_courses)`          | Update per-field privacy settings (owner only)          | Authenticated    |

## pg_cron Jobs

The `pg_cron` extension is required. Scheduled jobs:

| Job Name                    | Schedule    | Function                         |
| --------------------------- | ----------- | -------------------------------- |
| `badge-xp-streak-processor` | Every 5 min | XP, badge, and streak processing |
| `refresh-all-course-stats`  | Periodic    | Refresh aggregated course stats  |

## Database Triggers

| Trigger                               | Table                  | Purpose                                |
| ------------------------------------- | ---------------------- | -------------------------------------- |
| `handle_new_user`                     | `auth.users`           | Creates profile + user_roles on signup |
| `auto_set_tenant_id`                  | All 26 tenant tables   | Auto-fills tenant_id on INSERT         |
| `custom_access_token_hook`            | Auth hook              | Injects tenant_id + role into JWT      |
| `handle_lesson_progress_change`       | `lesson_progress`      | Triggers course progress recompute     |
| `handle_quiz_attempt_status_change`   | `quiz_attempts`        | Triggers XP award, badge check         |
| `handle_streak_on_activity`           | Various                | Updates streak on activity             |
| `handle_quiz_badges`                  | `quiz_attempts`        | Awards quiz-related badges             |
| `handle_streak_badges`                | `xp_profiles`          | Awards streak-related badges           |
| `on_badge_earned`                     | `student_badges`       | Emits realtime event for UI            |
| `recompute_course_progress`           | `lesson_progress`      | Rolls up to course_progress            |
| `course_versions_tenant_id_trigger`   | `course_versions`      | Auto-fills tenant_id on INSERT         |
| `content_templates_tenant_id_trigger` | `content_templates`    | Auto-fills tenant_id on INSERT         |
| `set_tenant_id_course_collaborators`  | `course_collaborators` | Auto-fills tenant_id on INSERT         |

## Migration Reference

Migrations are in `supabase/migrations/` numbered `001` through `836`. Apply in numeric order. Key milestones:

| Range                    | Domain                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| 001–062                  | Core schema, auth, RLS foundation                                                             |
| 063–071                  | Quiz engine v1/v2                                                                             |
| 072–095                  | Analytics engine                                                                              |
| 096–200                  | Various features                                                                              |
| 291–297                  | Critical bug fixes (quiz grading, analytics auth)                                             |
| 810–820                  | Advanced analytics (engagement, cohort, funnel, struggle)                                     |
| 821–822                  | Gamification v2 (XP, badges, leaderboard, streaks)                                            |
| 823–825                  | Registration helpers, attendance, seed data                                                   |
| 836                      | Security fixes (5 HIGH vulnerabilities)                                                       |
| 20260324150000           | Course Builder Phase 1: versioning + template library                                         |
| 20260324160000           | Course Collaborators: multi-author roles, review workflow, updated RLS policies               |
| 20260324200000           | LTI 1.3 + SCORM integration: platform registrations, nonces, sessions, packages, runtime data |
| 20260325_fix_search_path | SECURITY DEFINER `search_path` fix for 19 functions (see below)                               |

### Migration 20260325_fix_search_path — SECURITY DEFINER Hardening

All 19 `SECURITY DEFINER` functions that were created without `SET search_path TO 'public'` have been patched. Without an explicit `search_path`, a malicious actor who can control the session `search_path` could trick these functions into resolving unqualified names to attacker-controlled objects.

**Functions fixed:**

1. `grade_attempt_question(uuid, numeric, boolean, text)`
2. `handle_course_unassigned_from_class()`
3. `is_enrolled_in_course(uuid)`
4. `log_analytics_access(text, uuid, jsonb)`
5. `notify_announcement_published()`
6. `notify_assignment_graded()`
7. `notify_course_published()`
8. `notify_discussion_reply()`
9. `notify_quiz_published()`
10. `on_assignment_submitted()`
11. `recalculate_attempt_score(uuid)`
12. `recompute_leaderboard(uuid)`
13. `recompute_weekly_leaderboard(uuid, uuid, timestamptz)`
14. `refresh_weekly_leaderboard(uuid, uuid)`
15. `search_lesson_resources(uuid, uuid, text, integer)`
16. `sync_points_to_weekly_leaderboard()`
17. `sync_user_points_to_leaderboard()`
18. `update_streak(uuid, uuid)`
19. `v1_get_quiz_results(uuid)`

> **Note:** A `rate_limits` table for RPC rate limiting was planned during Phase 21D but has not yet been implemented. Rate limiting is currently handled at the application level via `check_analytics_rate_limit()` and Supabase's built-in API rate limits.

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
>>>>>>> neon-hemisphere
