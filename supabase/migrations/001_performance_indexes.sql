-- =============================================================
-- EduSync LMS — Sprint 3.0 Performance Indexes
-- =============================================================
-- This migration creates composite, temporal, status, and
-- partial indexes to accelerate the most frequent query patterns.
--
-- All indexes use CREATE INDEX CONCURRENTLY IF NOT EXISTS so the
-- migration is safe to re-run and does not lock tables.
-- =============================================================

-- ─── Composite: (tenant_id, user_id) ────────────────────────
-- These cover the dominant WHERE clause on almost every
-- tenant-scoped, per-user query.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_tenant_user
  ON enrollments (tenant_id, student_id);
-- Purpose: fast lookup of a student's enrollments within a tenant.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_lesson_signals_tenant_user
  ON student_lesson_signals (tenant_id, user_id);
-- Purpose: progress dashboard queries filtered by tenant + student.

-- CREATE INDEX IF NOT EXISTS idx_quiz_attempts_tenant_user
--   ON quiz_attempts_v2 (tenant_id, student_id);
-- Purpose: grade-book and student quiz history queries.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_tenant_user
  ON activity_events (tenant_id, user_id);
-- Purpose: per-student activity feed and analytics aggregations.

-- ─── Temporal: created_at ────────────────────────────────────
-- Recent-first ordering is common in dashboards and feeds.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_events_created_at
  ON activity_events (created_at DESC);
-- Purpose: "latest events" dashboard widget, event replay.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);
-- Purpose: notification bell sorted newest-first.

-- ─── Status indexes ──────────────────────────────────────────
-- Many queries filter on status columns.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_status
  ON courses (status);
-- Purpose: catalog and teacher course-list filtered by draft/published/archived.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quizzes_status
  ON quizzes (status);
-- Purpose: quiz listing pages filtered by active/draft.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_is_published
  ON assignments (is_published);
-- Purpose: assignment listing filtered by status.

-- ─── Partial index: published courses ────────────────────────
-- The student-facing catalog almost always filters to published only.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_published
  ON courses (tenant_id, id)
  WHERE status = 'published';
-- Purpose: student course catalog — smaller index, faster scans.
