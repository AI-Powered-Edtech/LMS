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
| `assignments`            | Teacher-created assignments                                                                                                                                                     |
| `assignment_submissions` | Student submissions                                                                                                                                                             |
| `grades`                 | Grades for submissions                                                                                                                                                          |

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

## RLS Patterns

All tenant-scoped tables use:
