-- Migration 27: Performance Tuning
-- Add missing indexes for foreign keys and optimize RLS policies

-- Missing indexes for foreign keys (as identified by Supabase Advisor)
CREATE INDEX IF NOT EXISTS idx_activity_events_user_id ON public.activity_events(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_tenant_id ON public.activity_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_class_id ON public.activity_events(class_id);
CREATE INDEX IF NOT EXISTS idx_activity_events_course_id ON public.activity_events(course_id);

CREATE INDEX IF NOT EXISTS idx_discussions_author_id ON public.discussions(author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_tenant_id ON public.discussions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discussions_lesson_id ON public.discussions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_tenant_id ON public.lesson_progress(tenant_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id_v2 ON public.quiz_attempts_v2(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id_v2 ON public.quiz_attempts_v2(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_tenant_id_v2 ON public.quiz_attempts_v2(tenant_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id_legacy ON public.quiz_attempts_legacy(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id_legacy ON public.quiz_attempts_legacy(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_tenant_id_legacy ON public.quiz_attempts_legacy(tenant_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON public.enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_tenant_id ON public.enrollments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_course_classes_course_id ON public.course_classes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_classes_class_id ON public.course_classes(class_id);
CREATE INDEX IF NOT EXISTS idx_course_classes_tenant_id ON public.course_classes(tenant_id);

-- Optimize RLS policies to use scalar subqueries for better planning
DROP POLICY IF EXISTS "users_read_profiles" ON public.profiles;
CREATE POLICY "users_read_profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT get_my_tenant_id()));

DROP POLICY IF EXISTS "anyone_read_published_courses" ON public.courses;
CREATE POLICY "anyone_read_published_courses" ON public.courses
    FOR SELECT TO authenticated
    USING (status = 'published' AND tenant_id = (SELECT get_my_tenant_id()));
