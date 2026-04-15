# EduSync — Database Reference

## Engine & Setup

- **PostgreSQL 16** (`pgvector/pgvector:pg16` Docker image)
- **Extensions**: `uuid-ossp`, `pgcrypto`, `citext`, `pg_trgm`, `pgvector`, `unaccent`, `pg_stat_statements`
- **Connection (direct)**: `postgres://postgres:password@localhost:5432/edusync`
- **Connection (pooled)**: `postgres://postgres:password@localhost:5433/edusync` (pgBouncer, transaction mode)
- **Schema initialization**: `schema/init-db.sql` (extensions) + `schema/baseline.sql` (full schema) auto-loaded at Docker first-run
- **Migrations**: `edusync-api/migrations/001` through `009` — applied by the API server at startup via sqlx

## Connection Pooling

pgBouncer runs in **transaction mode** (port 5433). The VIL API server connects to pgBouncer with a max of 50 connections. pgBouncer is configured with:

- `POOL_MODE=transaction`
- `MAX_CLIENT_CONN=100`
- `DEFAULT_POOL_SIZE=40`

For migrations and direct admin access, connect directly to PostgreSQL on port 5432.

## Tenant Isolation

- Every data table has a `tenant_id UUID NOT NULL` column
- There is **no Row-Level Security (RLS)** at the database layer — RLS was removed in Phase 6
- Tenant isolation is enforced entirely by the VIL backend: the caller's `tenant_id` (from JWT) is injected as a WHERE clause in every query
- New tables must have `tenant_id` and use the `auto_set_tenant_id()` trigger for automatic population on INSERT

## Key Tables

### Identity & Auth

| Table            | Description                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `auth.users`     | Minimal auth user table kept for FK compatibility. Contains `id` (UUID), `email`, `password_hash`.      |
| `profiles`       | Public user profile: `id`, `full_name`, `avatar_url`, `tenant_id`                                       |
| `user_roles`     | Role assignments: `user_id`, `tenant_id`, `role` (`student`\|`teacher`\|`admin`\|`parent`\|`principal`) |
| `tenants`        | School tenants: `id`, `name`, `slug`, `plan`, `settings`                                                |
| `refresh_tokens` | Active refresh tokens: `user_id`, `token_hash`, `expires_at`, `revoked`                                 |

### Academic Structure

| Table                  | Description                                                                               |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `courses`              | Course catalog: `id`, `tenant_id`, `title`, `description`, `status`, `created_by`         |
| `course_modules`       | Course sections/modules: `id`, `course_id`, `tenant_id`, `title`, `"order"`               |
| `lessons`              | Individual lessons: `id`, `module_id`, `tenant_id`, `title`, `type`, `content`, `"order"` |
| `lesson_resources`     | Lesson attachments: `id`, `lesson_id`, `type` (includes `'scorm'`)                        |
| `course_collaborators` | Co-teachers: `course_id`, `user_id`, `tenant_id` (uses `auto_set_tenant_id()`)            |
| `enrollments`          | Student enrollments: `id`, `course_id`, `user_id`, `tenant_id`, `status`, `enrolled_at`   |
| `classrooms`           | Physical/virtual classes: `id`, `tenant_id`, `name`, `code`, `teacher_id`                 |
| `classroom_students`   | Class membership: `classroom_id`, `user_id`, `tenant_id`                                  |

### Assessments

| Table                    | Description                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `quizzes`                | Quiz definitions: `id`, `lesson_id`, `tenant_id`, `title`, `time_limit`                |
| `quiz_questions`         | Questions: `id`, `quiz_id`, `tenant_id`, `text`, `type`, `"order"`                     |
| `quiz_options`           | MCQ options: `id`, `question_id`, `tenant_id`, `text`, `is_correct`                    |
| `quiz_submissions`       | Student attempts: `id`, `quiz_id`, `user_id`, `tenant_id`, `score`, `submitted_at`     |
| `assignments`            | Assignment definitions: `id`, `lesson_id`, `tenant_id`, `title`, `due_date`, `type`    |
| `assignment_submissions` | Student submissions: `id`, `assignment_id`, `user_id`, `tenant_id`, `content`, `grade` |
| `rubrics`                | Grading rubrics: `id`, `tenant_id`, `title`, `criteria` (JSONB)                        |

### Learning Signals

| Table                    | Description                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `student_lesson_signals` | Per-student lesson telemetry. Key columns: `user_id`, `lesson_id`, `tenant_id`, `total_time_spent`, `last_accessed_at`, `latest_quiz_score` |
| `lesson_progress`        | Completion state per lesson per student                                                                                                     |
| `course_progress`        | Aggregated course completion per student                                                                                                    |

### Notifications & Comms

| Table                | Description                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| `notifications`      | In-app notifications: `id`, `user_id`, `tenant_id`, `type`, `title`, `body`, `read` |
| `push_subscriptions` | Web Push VAPID subscriptions per user                                               |
| `discussions`        | Discussion threads per lesson/course                                                |
| `discussion_replies` | Replies to discussion threads                                                       |

### Gamification

| Table               | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `user_xp`           | XP points: `user_id`, `tenant_id`, `total_xp`, `level`           |
| `badges`            | Badge definitions: `id`, `tenant_id`, `name`, `icon`, `criteria` |
| `user_badges`       | Awarded badges: `user_id`, `badge_id`, `tenant_id`, `awarded_at` |
| `leaderboard_cache` | Cached leaderboard rankings per tenant                           |

### LTI & SCORM

| Table                | Description                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `lti_platforms`      | Registered LTI platforms: `id`, `tenant_id`, `iss`, `client_id`                                    |
| `lti_nonces`         | LTI nonce table — `service_role` only access                                                       |
| `scorm_packages`     | SCORM package metadata per lesson                                                                  |
| `scorm_runtime_data` | Student SCORM runtime state: `lesson_status` (sticky terminal: `completed`/`passed` cannot revert) |

## Notable Column Gotchas

| Table                    | Column              | Note                                                                      |
| ------------------------ | ------------------- | ------------------------------------------------------------------------- |
| `quiz_questions`         | `text`              | Column name is `text`, **not** `question_text`                            |
| `quiz_options`           | `text`              | Column name is `text`, **not** `option_text`                              |
| `course_modules`         | `"order"`           | Must be double-quoted — SQL reserved word                                 |
| `lessons`                | `"order"`           | Must be double-quoted — SQL reserved word                                 |
| `courses`                | `status`            | Use `status = 'published'`; column `is_published` does **not** exist      |
| `enrollments`            | `user_id`           | Column name is `user_id`, **not** `student_id`                            |
| `student_lesson_signals` | `total_time_spent`  | Not `time_spent_seconds`                                                  |
| `student_lesson_signals` | `last_accessed_at`  | Not `last_event_at`                                                       |
| `student_lesson_signals` | `latest_quiz_score` | Not `quiz_avg_score`                                                      |
| `courses`                | `status`            | Enum includes `'in_review'` and `'approved'` (migration `20260324160000`) |
| `lesson_resources`       | `type`              | CHECK includes `'scorm'` (migration `20260324200000`)                     |

## Courses Status Enum

```sql
-- Valid values for courses.status:
'draft' | 'in_review' | 'approved' | 'published' | 'archived'
```

## Triggers

- `auto_set_tenant_id()` — automatically fills `tenant_id` on INSERT from the current JWT claim
  - Used by: `course_collaborators` and all new tables
  - **Do not use** `set_tenant_id_from_user()` (deprecated)

## Stored Procedures (RPCs)

Called via `POST /api/v1/rpc/{function_name}` or `db.rpc(name, args)`.

| Function                | Description                                                 |
| ----------------------- | ----------------------------------------------------------- |
| `get_student_progress`  | Student course progress summary                             |
| `get_teacher_analytics` | Teacher dashboard analytics                                 |
| `get_leaderboard`       | XP leaderboard for tenant                                   |
| `upsert_scorm_runtime`  | Update SCORM runtime data (enforces sticky terminal states) |
| `enroll_student`        | Enroll student in a course/class                            |
| `get_gradebook`         | Gradebook data for a course                                 |
| `award_badge`           | Award a badge to a student                                  |
| `get_course_analytics`  | Per-course analytics for teacher                            |

**Note on checking teacher role in RPCs:** Query the `user_roles` table directly. Do **not** use `has_role()` — it fails when the JWT is missing the tenant claim.

## Query Rules

- Never use `SELECT *` — always list columns explicitly
- All queries on large tables must be paginated (`LIMIT`/`OFFSET`)
- Always include `tenant_id` filter (VIL middleware injects it automatically in the data plane, but direct sqlx queries must include it manually)
- Index all `tenant_id` columns for performance

## Migrations

Migrations live in `edusync-api/migrations/` and are numbered sequentially:

```
migrations/
├── 001_init.sql
├── 002_courses.sql
├── 003_assessments.sql
├── 004_gamification.sql
├── 005_notifications.sql
├── 006_lti_scorm.sql
├── 007_analytics.sql
├── 008_storage.sql
└── 009_realtime.sql
```

Applied automatically by sqlx at API server startup. For manual application:

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/edusync \
  sqlx migrate run
```
