-- =============================================================
-- EduSync LMS — Migration: Parent Portal Covering Indexes
-- Sprint 3.2: Performance indexes for parent portal queries
-- =============================================================
-- Verified column names against baseline schema before creation.
-- All indexes use IF NOT EXISTS for idempotency.
-- =============================================================

-- 1. attendance_records: date range queries via enrollment
--    Verified: enrollment_id (uuid NOT NULL), date (date NOT NULL), status (attendance_status)
CREATE INDEX IF NOT EXISTS idx_attendance_enrollment_date
  ON public.attendance_records (enrollment_id, date)
  INCLUDE (status);

-- 2. gradebook_entries: student grades ordered by date
--    Verified: student_id (uuid NOT NULL), created_at (timestamptz), score (numeric), max_score (numeric), course_id (uuid)
--    Source: migrations/20260403000005_fix_gradebook_schema_canonical.sql (canonical schema)
CREATE INDEX IF NOT EXISTS idx_ge_student_created_at
  ON public.gradebook_entries (student_id, created_at DESC)
  INCLUDE (score, max_score, course_id);

-- 3. activity_events: achievements by user + event type + time
--    Verified: user_id (uuid NOT NULL), event_type (activity_event_type NOT NULL), created_at (timestamptz)
CREATE INDEX IF NOT EXISTS idx_activity_events_user_type_time
  ON public.activity_events (user_id, event_type, created_at DESC);

-- 4. lesson_progress: monthly report queries (partial index — completed rows only)
--    Verified: user_id (uuid NOT NULL), tenant_id (uuid NOT NULL), completed_at (timestamptz), completed (boolean)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_completed_at
  ON public.lesson_progress (user_id, tenant_id, completed_at DESC)
  WHERE completed = true;

-- 5. parent_digest_settings: batch digest worker (partial index — enabled settings only)
--    Verified: digest_enabled (boolean NOT NULL), last_sent_at (timestamptz)
CREATE INDEX IF NOT EXISTS idx_parent_digest_enabled_sent
  ON public.parent_digest_settings (digest_enabled, last_sent_at)
  WHERE digest_enabled = true;

-- 6. enrollments: pending assignment lookup
--    Verified: student_id (uuid NOT NULL), tenant_id (uuid NOT NULL), class_id (uuid NOT NULL)
--    NOTE: enrollments does NOT have a course_id column — only class_id is included.
--    course_id lives in course_enrollments. Index adjusted accordingly.
CREATE INDEX IF NOT EXISTS idx_enrollments_student_tenant
  ON public.enrollments (student_id, tenant_id)
  INCLUDE (class_id);

-- 7. assignments: tenant + published + due date (partial index — published assignments only)
--    Verified: tenant_id (uuid NOT NULL), is_published (boolean DEFAULT false), due_date (timestamptz)
CREATE INDEX IF NOT EXISTS idx_assignments_tenant_published_due
  ON public.assignments (tenant_id, is_published, due_date ASC)
  WHERE is_published = true;
