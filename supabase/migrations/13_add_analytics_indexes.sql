-- Fix: Ensure percentage column exists (01_migration.sql creates course_progress without it)
ALTER TABLE IF EXISTS course_progress ADD COLUMN IF NOT EXISTS percentage numeric DEFAULT 0;

-- ==========================================================================
-- Migration 13: Add Critical Indexes for Analytics Queries
--
-- Performance optimization for Learning Analytics Engine
-- These indexes are critical for query performance when user count grows
--
-- Target: Support 100k+ students across multiple tenants
-- ==========================================================================

-- Index for lesson_progress - critical for module completion calculation
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson
ON public.lesson_progress(user_id, lesson_id);

-- Index for lesson_progress - for completed lessons query
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed_user
ON public.lesson_progress(completed, user_id);

-- Index for course_progress - critical for student progress queries
CREATE INDEX IF NOT EXISTS idx_course_progress_course_user
ON public.course_progress(course_id, user_id);

-- Index for course_progress - for percentage sorting
CREATE INDEX IF NOT EXISTS idx_course_progress_percentage
ON public.course_progress(percentage DESC);

-- Index for modules - for course module listing
CREATE INDEX IF NOT EXISTS idx_modules_course
ON public.modules(course_id, position);

-- Index for lessons - for module lesson listing
CREATE INDEX IF NOT EXISTS idx_lessons_module
ON public.lessons(module_id, status, position);

-- Index for lessons - for published status filter
CREATE INDEX IF NOT EXISTS idx_lessons_status
ON public.lessons(status) WHERE status = 'published';

-- Index for quiz_attempts - for quiz analytics
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_student
ON public.quiz_attempts(quiz_id, student_id);

-- Index for quiz_attempts - for status filtering
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status
ON public.quiz_attempts(status) WHERE status IN ('graded', 'submitted');

-- Index for enrollments - for active enrollment queries
CREATE INDEX IF NOT EXISTS idx_enrollments_course_class_status
ON public.enrollments(class_id, status);

-- Index for user_profiles - for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant
ON public.user_profiles(tenant_id);

-- Index for course_stats - for quick stats lookup
CREATE INDEX IF NOT EXISTS idx_course_stats_course
ON public.course_stats(course_id);

-- Composite index for lesson progress in a course
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_lesson
ON public.lesson_progress(lesson_id, user_id, completed);

-- Comment for documentation
COMMENT ON INDEX idx_lesson_progress_user_lesson IS 
'Critical for module completion rate calculation in analytics';

COMMENT ON INDEX idx_course_progress_course_user IS 
'Critical for fetching student progress per course in analytics';

COMMENT ON INDEX idx_quiz_attempts_quiz_student IS 
'Critical for quiz pass rate calculation in analytics';
