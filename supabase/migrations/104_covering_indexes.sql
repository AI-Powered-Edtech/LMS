-- ==========================================================================
-- Migration 104: Covering Indexes for Performance
-- 
-- Adds INCLUDE columns for covering indexes (Postgres feature)
-- ==========================================================================

-- quiz_attempts_v2: Covering index for gradebook queries
-- FIX: quiz_attempts_v2 has started_at but NOT submitted_at
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_gradebook_cover
ON public.quiz_attempts_v2(quiz_id, student_id, status, score, started_at)
INCLUDE (started_at);

-- quiz_attempts: Legacy table (if still used)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_gradebook_cover_legacy
ON public.quiz_attempts_legacy(quiz_id, student_id, status, score, submitted_at)
INCLUDE (started_at);

-- lesson_progress: Covering for student dashboard
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_dashboard
ON public.lesson_progress(user_id, lesson_id)
INCLUDE (completed, progress_percentage, completed_at);

-- course_progress: Covering for teacher analytics
CREATE INDEX IF NOT EXISTS idx_course_progress_teacher_cover
ON public.course_progress(course_id, user_id)
INCLUDE (percentage, completed_lessons, total_lessons, last_activity_at);

-- enrollments: Covering for roster queries
CREATE INDEX IF NOT EXISTS idx_enrollments_roster_cover
ON public.enrollments(class_id, student_id, status)
INCLUDE (joined_at);

-- classes: Covering for course/class lookups
CREATE INDEX IF NOT EXISTS idx_classes_course_cover
ON public.classes(course_id, id)
INCLUDE (name, join_code);

-- Remove duplicate index from Migration 98
DROP INDEX IF EXISTS public.idx_user_roles_user_tenant;

NOTIFY pgrst, 'reload schema';
