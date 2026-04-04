# EduSync LMS — Database Reference

## Migrations Added (2026-04-04)

- `20260405000001_fix_get_my_children_rpc.sql` — Fixed get_my_children() FK names
- `20260405000002_enable_messaging_realtime.sql` — Enabled Realtime for messaging tables
- `20260405000003_activate_gamification_xp_v2.sql` — Activated XP v2 tables + RPCs
- `20260405000004_activate_certificates.sql` — Activated certificates table + RPCs
- `20260405000005_revoke_leaderboard_anon_grant.sql` — Security: revoked anon grants
- `20260405000006_create_process_gamification_events.sql` — Created gamification cron function
- `20260405000007_audit_log_composite_index.sql` — Performance indexes
- `20260405000008_survey_aggregation_rpc.sql` — Survey aggregation RPC
- `20260405000009_finance_record_payment.sql` — Finance payment RPCs
- `20260405000010_principal_dashboard_mv.sql` — Principal materialized view
- `20260405000011_parent_portal_performance_indexes.sql` — Parent portal indexes

---

PostgreSQL on Supabase. 259 migration files (000_baseline.sql through 20260403000014_calendar_events_persist.sql).

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

| Table                      | Purpose                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quizzes`                  | Quiz definitions linked to a lesson/class                                                                                                                                       |
| `quiz_questions`           | Questions per quiz. Column `text` (not `question_text`)                                                                                                                         |
| `quiz_options`             | Options per question. Column `text` (not `option_text`)                                                                                                                         |
| `quiz_attempts`            | Student attempt records. Status: `IN_PROGRESS`, `SUBMITTED`, `GRADED`, `EXPIRED`, `ABANDONED`                                                                                   |
| `quiz_attempts_v2`         | Partitioned replacement for `quiz_attempts` (PARTITION BY RANGE on `started_at`). Columns include `is_reviewed` (boolean, default false) for teacher review of cheating signals |
| `quiz_attempt_questions`   | Per-question snapshot for immutability                                                                                                                                          |
| `quiz_stats`               | Pre-aggregated quiz-level statistics                                                                                                                                            |
| `question_bank`            | Reusable question repository (per-tenant)                                                                                                                                       |
| `question_options`         | Options for question bank entries                                                                                                                                               |
| `assignments`              | Teacher-created assignments                                                                                                                                                     |
| `assignment_submissions`   | Student submissions                                                                                                                                                             |
| `grades`                   | Grades for submissions                                                                                                                                                          |
| `assignment_groups`        | Group assignment containers: `assignment_id`, `name`, `tenant_id`                                                                                                               |
| `assignment_group_members` | Group membership: `group_id`, `user_id`, `tenant_id`                                                                                                                            |
| `group_submissions`        | Group-level submissions: `group_id`, `assignment_id`, `submitted_by`, `content`, `grade`, `tenant_id`                                                                           |

### Analytics

| Table                    | Purpose                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `course_stats`           | Pre-aggregated analytics (updated every 5 min by pg_cron or on-demand)                                      |
| `student_lesson_signals` | Per-student lesson engagement signals. Columns: `total_time_spent`, `last_accessed_at`, `latest_quiz_score` |
| `learning_events`        | AI Tutor event log                                                                                          |
| `aggregation_state`      | Watermarks for incremental aggregation jobs                                                                 |

### Gamification

| Table                   | Purpose                                                                     | Added     |
| ----------------------- | --------------------------------------------------------------------------- | --------- |
| `xp_profiles`           | Legacy XP totals (baseline — use `student_xp_summary` for new code)         | Baseline  |
| `xp_transactions`       | Append-only XP ledger per student (source_type, source_id, xp_amount)       | Phase 37B |
| `student_xp_summary`    | Per-student XP aggregate: total_xp, level, streak_current, streak_longest   | Phase 37B |
| `xp_processing_state`   | Watermark table for cron-based XP awarding (one row per tenant)             | Phase 37B |
| `badge_definitions`     | System + tenant-custom badge catalog (rarity: common/rare/epic/legendary)   | Phase 37A |
| `student_badges`        | Earned badges per student (references badge_definitions)                    | Phase 37A |
| `certificates`          | Issued course completion certificates (certificate_number, template_config) | Phase 37A |
| `certificate_templates` | Branded certificate template per tenant/course (Phase 36C)                  | Phase 36C |

### Operations

| Table                | Purpose                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `notifications`      | In-app notifications per user                                                                          |
| `activity_logs`      | User activity audit trail                                                                              |
| `attendance_records` | Attendance per enrollment (NO `student_id` column — join via `enrollment_id → enrollments.student_id`) |
| `invoices`           | Billing invoices                                                                                       |
| `payments`           | Payment records                                                                                        |

### External Integration (LTI & SCORM)

| Table                        | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `lti_platform_registrations` | External LMS platform configs (Canvas, Moodle). One per platform per tenant |
| `lti_nonces`                 | OIDC replay protection for LTI launches. Short-lived, auto-expired          |
| `lti_sessions`               | Active LTI guest sessions mapped to Supabase users                          |
| `scorm_packages`             | Registry of uploaded SCORM 1.2/2004 content linked to lessons               |
| `scorm_runtime_data`         | Per-user SCORM CMI state: scores, status, suspend_data, total_time          |

### New in Phase 27–37

| Table                         | Purpose                                                                           | Added     |
| ----------------------------- | --------------------------------------------------------------------------------- | --------- |
| `teacher_onboarding_progress` | Wizard onboarding progress per guru baru (step, dismissed, class/course metadata) | Phase 27  |
| `onboarding_progress`         | Progress onboarding per user — JSONB steps_completed (one row per user)           | Phase 27  |
| `ppdb_periods`                | Periode penerimaan peserta didik baru (PPDB)                                      | Phase 28  |
| `ppdb_registrations`          | Data pendaftar PPDB per periode                                                   | Phase 28  |
| `app_metrics`                 | Metrik performa dan usage aplikasi (time-series, bigserial)                       | Phase 28  |
| `rate_limits`                 | Rate limiting counters untuk Edge Function check-rate-limit                       | Phase 29  |
| `certificate_templates`       | Branded certificate template per tenant/course (background, accent, logo)         | Phase 36C |
| `badge_definitions`           | System + tenant-custom badge catalog dengan criteria JSONB                        | Phase 37A |
| `student_badges`              | Badge awards per student (unique per user+badge)                                  | Phase 37A |
| `certificates`                | Issued course completion certificates dengan certificate_number unik              | Phase 37A |
| `xp_transactions`             | Append-only XP ledger (lesson_complete, quiz_score, streak_bonus, badge_earned)   | Phase 37B |
| `student_xp_summary`          | Per-student XP aggregate: total_xp, level, streak counters                        | Phase 37B |
| `xp_processing_state`         | Watermark per tenant untuk idempotent cron-based XP awarding                      | Phase 37B |

## RPC Reference

### New in Phase 26–37

| RPC                                                                               | Purpose                                                                 | Added     |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| `get_audit_logs(p_action, p_cursor, p_limit)`                                     | Paginated audit log query untuk admin dashboard (cursor-based)          | Phase 28  |
| `get_tenant_activity_counts(p_tenant_id, p_days)`                                 | Activity event counts per type untuk analytics                          | Phase 26  |
| `check_and_increment_rate_limit_v2(p_key, p_action, p_max_attempts, p_window_ms)` | Atomic rate-limit counter dengan fixed-window bucketing                 | Phase 29  |
| `get_student_badges(p_user_id)`                                                   | Badge showcase: earned + all active badges dengan is_earned flag        | Phase 37A |
| `check_badge_eligibility(p_user_id)`                                              | Bulk check + auto-award badges berdasarkan criteria JSONB               | Phase 37A |
| `issue_certificate(p_user_id, p_course_id)`                                       | Teacher issues certificate dengan generated certificate_number          | Phase 37A |
| `get_student_certificates(p_user_id)`                                             | Student's earned certificates dengan course title                       | Phase 37A |
| `compute_level(p_total_xp)`                                                       | Immutable: XP → level mapping (L1-L10)                                  | Phase 37B |
| `xp_for_level(p_level)`                                                           | Immutable: level → XP threshold                                         | Phase 37B |
| `record_xp_transaction(p_user_id, p_xp_amount, p_source_type, p_source_id)`       | Add XP + update student_xp_summary atomically                           | Phase 37B |
| `update_streak(p_user_id)`                                                        | Check daily activity + update streak counter + award streak bonus       | Phase 37B |
| `get_leaderboard_v2(p_course_id, p_sort_by, p_period, p_limit)`                   | Sortable/filterable leaderboard (xp\|streak, all_time\|weekly\|monthly) | Phase 37B |
| `get_student_xp_profile(p_user_id)`                                               | Full XP profile: total_xp, level, progress, streak, recent_xp JSONB     | Phase 37B |
| `process_xp_awards()`                                                             | Cron batch: award XP for lessons/quizzes/assignments since watermark    | Phase 37B |

## Important Column Gotchas

| Table                    | Column              | Note                                                                                      |
| ------------------------ | ------------------- | ----------------------------------------------------------------------------------------- |
| `quiz_questions`         | `text`              | NOT `question_text`                                                                       |
| `quiz_options`           | `text`              | NOT `option_text`                                                                         |
| `course_modules`         | `"order"`           | Reserved word — must be quoted in SQL                                                     |
| `lessons`                | `"order"`           | Reserved word — must be quoted in SQL                                                     |
| `courses`                | `status`            | Use `status = 'published'` — `is_published` does NOT exist                                |
| `enrollments`            | `user_id`           | NOT `student_id`                                                                          |
| `attendance_records`     | `enrollment_id`     | NO `student_id` column — join via `enrollments.student_id` to filter by student           |
| `student_lesson_signals` | `total_time_spent`  | NOT `time_spent_seconds`                                                                  |
| `student_lesson_signals` | `last_accessed_at`  | NOT `last_event_at`                                                                       |
| `student_lesson_signals` | `latest_quiz_score` | NOT `quiz_avg_score`                                                                      |
| `profiles`               | `is_public`         | Added by Phase 22 migration. Also: `show_badges`, `show_xp`, `show_courses` privacy flags |

## RLS Patterns

All tenant-scoped tables use:
