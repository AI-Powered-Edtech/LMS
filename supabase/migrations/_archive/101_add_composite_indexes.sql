-- ==========================================================================
-- Migration 101: Composite Indexes for Performance
-- 
-- Adds composite indexes for common query patterns in EduSync LMS
-- Uses CONCURRENTLY to avoid table locks on large tables
-- 
-- IMPORTANT: Run outside transaction for CONCURRENTLY to work
-- ==========================================================================

-- enrollments: Teacher view of class students
CREATE INDEX IF NOT EXISTS idx_enrollments_class_status
ON public.enrollments(class_id, status);

-- lesson_progress: Completed lessons for course (partial index)
CREATE INDEX IF NOT EXISTS idx_lesson_progress_course_completed
ON public.lesson_progress(tenant_id, lesson_id, completed)
WHERE completed = true;

-- quiz_attempts_v2: Latest attempt per student (partitioned table)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_latest
ON public.quiz_attempts_v2(student_id, quiz_id, started_at DESC);

-- quiz_attempts: Legacy table (if still used)
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_latest_legacy
ON public.quiz_attempts_legacy(student_id, quiz_id, started_at DESC);

-- activity_events: User recent activity
CREATE INDEX IF NOT EXISTS idx_activity_events_user_recent
ON public.activity_events(user_id, created_at DESC);

-- activity_events: Tenant analytics
CREATE INDEX IF NOT EXISTS idx_activity_events_tenant_type_time
ON public.activity_events(tenant_id, event_type, created_at DESC);

-- user_roles: Role lookup
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant
ON public.user_roles(user_id, tenant_id);

-- courses: Quick tenant lookup
CREATE INDEX IF NOT EXISTS idx_courses_tenant_status
ON public.courses(tenant_id, status);

-- course_modules: Course lookup
CREATE INDEX IF NOT EXISTS idx_course_modules_course_order
ON public.course_modules(course_id, "order");

NOTIFY pgrst, 'reload schema';
