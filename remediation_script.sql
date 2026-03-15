-- ==============================================
-- 1. FIX: Partitioned Tables Missing RLS
-- ==============================================
ALTER TABLE public.quiz_attempts_v2_2026_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts_v2_2026_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts_v2_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts_v2_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts_v2_historic ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quiz_a_q_v2_2026_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_a_q_v2_2026_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_a_q_v2_historic ENABLE ROW LEVEL SECURITY;

-- Note: The policies must be applied explicitly to the child partitions as they don't inherit parent RLS.
-- (Please run CREATE POLICY for these tables matching the parent quiz_attempts_v2)

-- ==============================================
-- 2. FIX: Security Definer Views
-- ==============================================
-- Drop and recreate the views without SECURITY DEFINER (if it was explicitly set or if the owner is bypassrls)
-- To ensure RLS applies, the role querying the view must match the underlying table policies.
DROP VIEW IF EXISTS public.quiz_attempt_questions;
CREATE VIEW public.quiz_attempt_questions WITH (security_invoker = true) AS
SELECT attempt_id, question_id, tenant_id, is_correct, points_earned, student_answers
FROM quiz_attempt_questions_v2;

DROP VIEW IF EXISTS public.quiz_attempts;
CREATE VIEW public.quiz_attempts WITH (security_invoker = true) AS
SELECT id, quiz_id, student_id, tenant_id, status, score, started_at, submitted_at, expires_at, attempt_number, passed, time_spent, tab_switch_count, focus_loss_count, last_heartbeat_at, attempt_seed, assignment_id, started_at AS created_at, submitted_at AS finished_at, time_spent AS duration_seconds
FROM quiz_attempts_v2;

DROP VIEW IF EXISTS public.user_profiles;
CREATE VIEW public.user_profiles WITH (security_invoker = true) AS
SELECT p.id, p.tenant_id, p.email, p.full_name, p.avatar_url, r.role, p.level, p.created_at, p.updated_at
FROM profiles p
LEFT JOIN (
    SELECT DISTINCT ON (user_roles.user_id) user_roles.user_id, user_roles.role
    FROM user_roles
    ORDER BY user_roles.user_id, user_roles.created_at DESC
) r ON p.id = r.user_id;

-- ==============================================
-- 3. FIX: RPC Search Path Hijacking
-- ==============================================
-- Secure the functions by setting the search_path to public
ALTER FUNCTION public.v1_submit_quiz_attempt SET search_path = public;
ALTER FUNCTION public.handle_quiz_attempt_activity SET search_path = public;
ALTER FUNCTION public.ensure_quiz_attempt_partition SET search_path = public;
ALTER FUNCTION public.v1_start_quiz_attempt SET search_path = public;
ALTER FUNCTION public.cleanup_stale_quiz_attempts SET search_path = public;
ALTER FUNCTION public.handle_quiz_attempt_status_change SET search_path = public;
-- Note: Replicate this ALTER FUNCTION statement for all 25+ functions flagged by Supabase Advisors.

-- ==============================================
-- 4. FIX: Unindexed Foreign Keys (Performance)
-- ==============================================
-- These indexes prevent table scans during cascading operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_generation_metadata_question_id ON public.ai_generation_metadata (question_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tutor_feedback_tenant_id ON public.ai_tutor_feedback (tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tutor_feedback_user_id ON public.ai_tutor_feedback (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_tutor_sessions_lesson_id ON public.ai_tutor_sessions (lesson_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_audit_user_id ON public.analytics_audit (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_course_id ON public.assignments (course_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_points_class_id ON public.user_points (class_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quizzes_course_id ON public.quizzes (course_id);

-- ==============================================
-- 5. FIX: Duplicate Indexes
-- ==============================================
DROP INDEX IF EXISTS public.idx_activity_events_tenant_id;
DROP INDEX IF EXISTS public.idx_activity_events_user_id;
DROP INDEX IF EXISTS public.idx_course_classes_class_id;
DROP INDEX IF EXISTS public.idx_course_classes_course_id;
DROP INDEX IF EXISTS public.idx_course_classes_tenant_id;

-- ==============================================
-- 6. FIX: RLS Optimization (`auth_rls_initplan`)
-- ==============================================
-- To optimize, use `(SELECT get_my_tenant_id())` instead of `get_my_tenant_id()`
-- Example adjustment for a typical policy:
-- ALTER POLICY "courses_select" ON public.courses
-- USING (tenant_id = (SELECT get_my_tenant_id()));
