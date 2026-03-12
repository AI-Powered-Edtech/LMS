-- Migration: 37_comprehensive_reinforcement.sql
-- Description: Global RLS optimization, Analytics hardening, and final indexing.

BEGIN;

-- 1. SEARCH_PATH HARDENING (Analytics & Misc)
ALTER FUNCTION public.record_analytics_metric(text, double precision, jsonb) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.test_analytics_security() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION public.refresh_course_analytics_mv() SECURITY DEFINER SET search_path = public;

-- 2. ANALYTICS RLS CREATION
-- These tables were flagged as having RLS enabled but no policies.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_audit' AND policyname = 'Admins can view audit logs') THEN
        CREATE POLICY "Admins can view audit logs" ON public.analytics_audit
            FOR SELECT USING (has_role('ADMIN'::app_role) AND tenant_id = (SELECT public.get_my_tenant_id()));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_rate_limits' AND policyname = 'Users can view own rate limits') THEN
        CREATE POLICY "Users can view own rate limits" ON public.analytics_rate_limits
            FOR SELECT USING (user_id = (SELECT auth.uid()));
    END IF;
END $$;

-- 3. GLOBAL RLS OPTIMIZATION (Scalar Subqueries to prevent per-row evaluation)
-- We use (SELECT auth.uid()) and (SELECT public.get_my_tenant_id()) patterns.

-- activity_events
DROP POLICY IF EXISTS "Users can view tenant activity events" ON public.activity_events;
CREATE POLICY "Users can view tenant activity events" ON public.activity_events
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- activity_logs
DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
CREATE POLICY "activity_logs_select" ON public.activity_logs
    FOR SELECT USING (is_module_enabled('analytics'::text) AND ((tenant_id = (SELECT public.get_my_tenant_id())) AND ((user_id = (SELECT auth.uid())) OR has_role('ADMIN'::app_role))));

DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;
CREATE POLICY "activity_logs_insert" ON public.activity_logs
    FOR INSERT WITH CHECK (is_module_enabled('analytics'::text) AND ((tenant_id = (SELECT public.get_my_tenant_id())) AND (user_id = (SELECT auth.uid()))));

-- assignment_submissions
DROP POLICY IF EXISTS "assignment_submissions_select" ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_select" ON public.assignment_submissions
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((student_id = (SELECT auth.uid())) OR (EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_submissions.assignment_id AND is_class_teacher(a.class_id))) OR has_role('ADMIN'::app_role)));

-- course_progress
DROP POLICY IF EXISTS "course_progress_select" ON public.course_progress;
CREATE POLICY "course_progress_select" ON public.course_progress
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((user_id = (SELECT auth.uid())) OR has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)));

-- lesson_progress
DROP POLICY IF EXISTS "lesson_progress_select" ON public.lesson_progress;
CREATE POLICY "lesson_progress_select" ON public.lesson_progress
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((user_id = (SELECT auth.uid())) OR has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)));

-- discussions
DROP POLICY IF EXISTS "users_read_discussions" ON public.discussions;
CREATE POLICY "users_read_discussions" ON public.discussions
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- quizzes
DROP POLICY IF EXISTS "quizzes_select" ON public.quizzes;
CREATE POLICY "quizzes_select" ON public.quizzes
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND (is_class_member(class_id) OR has_role('ADMIN'::app_role)));

-- quiz_questions
DROP POLICY IF EXISTS "quiz_questions_select" ON public.quiz_questions;
CREATE POLICY "quiz_questions_select" ON public.quiz_questions
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((SELECT auth.uid()) IS NOT NULL));

-- quiz_options
DROP POLICY IF EXISTS "quiz_options_select" ON public.quiz_options;
CREATE POLICY "quiz_options_select" ON public.quiz_options
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND ((SELECT auth.uid()) IS NOT NULL));

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
    FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND (user_id = (SELECT auth.uid())));

-- 4. MISSING INDEXES (Performance Optimization)
CREATE INDEX IF NOT EXISTS idx_ai_tutor_cache_course_id ON public.ai_tutor_cache (course_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_interactions_lesson_id ON public.ai_tutor_interactions (lesson_id);
CREATE INDEX IF NOT EXISTS idx_analytics_audit_course_user ON public.analytics_audit (course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_rsvps_tenant_id ON public.announcement_rsvps (tenant_id);
CREATE INDEX IF NOT EXISTS idx_grades_graded_by ON public.grades (graded_by);
CREATE INDEX IF NOT EXISTS idx_leaderboards_user_id ON public.leaderboards (user_id);
CREATE INDEX IF NOT EXISTS idx_module_dependencies_depends_on ON public.module_dependencies (depends_on_module_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications (actor_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_attempt_id ON public.quiz_answers (attempt_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_option_id ON public.quiz_answers (option_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON public.quiz_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_course_lesson ON public.recommendations (course_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_student_concept_mastery_course_tenant ON public.student_concept_mastery (course_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_modules_module_id ON public.tenant_modules (module_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_tenant ON public.user_badges (badge_id, tenant_id);

-- 5. MATERIALIZED VIEW PROTECTION
-- Ensure course_analytics_mv is not exposed to the public Data API unless necessary.
-- By default, MVs do not have RLS, but we can control access via standard permissions.
REVOKE ALL ON public.course_analytics_mv FROM anon;
REVOKE ALL ON public.course_analytics_mv FROM authenticated;
GRANT SELECT ON public.course_analytics_mv TO service_role;
-- If teachers need access, we should probably use a SECURITY DEFINER function or a wrapper view with RLS.

COMMIT;
