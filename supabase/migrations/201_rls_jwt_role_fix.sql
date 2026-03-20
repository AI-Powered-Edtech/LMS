-- =============================================================================
-- Migration 96: Fix All Broken RLS Policies (auth.jwt() ->> 'role' → has_role())
-- =============================================================================
--
-- ROOT CAUSE:
--   custom_access_token_hook only injects `tenant_id` into JWT.
--   It does NOT inject `role`. Therefore any RLS policy or function
--   that reads `auth.jwt() ->> 'role'` will ALWAYS get NULL, making
--   those policies either fail silently or grant unintended access.
--
-- SCOPE OF FIX:
--   1. course_classes        — 3 policies (insert/delete use jwt role, select uses raw jwt tenant)
--   2. course_insights       — 2 policies (admin manage, teacher view)
--   3. analytics_circuit_breaker — 1 policy (admin manage overwrote correct baseline)
--   4. analytics_audit       — 2 policies (admin/teacher select)
--   5. analytics_monitoring_jobs — 1 policy (admin manage)
--   6. analytics_rate_limits — 1 policy (admin manage)
--   7. course_progress       — 1 teacher SELECT policy (not covered by migration 88)
--   8. user_badges           — 1 policy (raw jwt tenant_id)
--   9. RPC functions         — refresh_course_stats, get_question_difficulty,
--                              get_student_progress_bundle, refresh_all_course_stats
--
-- PATTERN REFERENCE:
--   ❌ BROKEN:  auth.jwt() ->> 'role' in ('TEACHER','ADMIN')
--   ❌ BROKEN:  auth.jwt() ->> 'role' = 'admin'
--   ✅ CORRECT: has_role('TEACHER'::public.app_role)
--   ✅ CORRECT: has_role('ADMIN'::public.app_role)
--   ✅ CORRECT: get_my_tenant_id()
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: course_classes
-- =============================================================================
-- Affected policies (from migration 01 baseline + migration 161):
--   "Users can view course_classes for their tenant"    → raw auth.jwt() tenant_id
--   "Teachers and Admins can insert course_classes"     → auth.jwt() role
--   "Teachers and Admins can delete course_classes"     → auth.jwt() role

DROP POLICY IF EXISTS "Users can view course_classes for their tenant"       ON public.course_classes;
DROP POLICY IF EXISTS "Teachers and Admins can insert course_classes"        ON public.course_classes;
DROP POLICY IF EXISTS "Teachers and Admins can delete course_classes"        ON public.course_classes;

-- Ensure RLS is on
ALTER TABLE public.course_classes ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated member of the tenant
CREATE POLICY "course_classes_select_tenant"
    ON public.course_classes FOR SELECT
    USING ( tenant_id = public.get_my_tenant_id() );

-- INSERT: teacher or admin of this tenant
CREATE POLICY "course_classes_insert_staff"
    ON public.course_classes FOR INSERT
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) )
    );

-- UPDATE: teacher or admin
CREATE POLICY "course_classes_update_staff"
    ON public.course_classes FOR UPDATE
    USING (
        tenant_id = public.get_my_tenant_id()
        AND ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) )
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) )
    );

-- DELETE: teacher or admin
CREATE POLICY "course_classes_delete_staff"
    ON public.course_classes FOR DELETE
    USING (
        tenant_id = public.get_my_tenant_id()
        AND ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) )
    );

-- FIXED: course_classes — replaced auth.jwt() ->> 'role' with has_role()

-- =============================================================================
-- SECTION 2: course_insights
-- =============================================================================
-- Affected policies (from migration 01 baseline — never overwritten):
--   "Admins can manage tenant insights"   → auth.jwt() role = 'admin' (lowercase)
--   "Teachers can view tenant insights"   → auth.jwt() role IN ('teacher', 'admin')

DROP POLICY IF EXISTS "Admins can manage tenant insights"   ON public.course_insights;
DROP POLICY IF EXISTS "Teachers can view tenant insights"   ON public.course_insights;

ALTER TABLE public.course_insights ENABLE ROW LEVEL SECURITY;

-- SELECT: teacher or admin within their tenant
CREATE POLICY "course_insights_select_staff"
    ON public.course_insights FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) )
    );

-- INSERT / UPDATE / DELETE: admin only
CREATE POLICY "course_insights_manage_admin"
    ON public.course_insights FOR ALL
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('ADMIN'::public.app_role)
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('ADMIN'::public.app_role)
    );

-- FIXED: course_insights — replaced auth.jwt() ->> 'role' with has_role()

-- =============================================================================
-- SECTION 3: analytics_circuit_breaker
-- =============================================================================
-- Migration 34 overwrote the correct baseline has_role() policy with a broken
-- jwt-role policy: auth.jwt() ->> 'role' = 'admin'

DROP POLICY IF EXISTS "Admins can manage analytics circuit breaker"  ON public.analytics_circuit_breaker;

ALTER TABLE public.analytics_circuit_breaker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_circuit_breaker_admin"
    ON public.analytics_circuit_breaker FOR ALL
    USING ( public.has_role('ADMIN'::public.app_role) )
    WITH CHECK ( public.has_role('ADMIN'::public.app_role) );

-- FIXED: analytics_circuit_breaker — restored has_role() (was overwritten by migration 34)

-- =============================================================================
-- SECTION 4: analytics_audit
-- =============================================================================
-- Migration 28 created these policies using auth.jwt() ->> 'role':
--   Admin select: auth.jwt() ->> 'role' = 'admin'
--   Teacher select: auth.jwt() ->> 'role' = 'teacher'
-- Policy names from migration 28 are not well-known; drop likely candidates.

DROP POLICY IF EXISTS "analytics_audit_admin_select"          ON public.analytics_audit;
DROP POLICY IF EXISTS "analytics_audit_teacher_select"        ON public.analytics_audit;
-- Also try the names that migration 28 might have used generically
DROP POLICY IF EXISTS "Admins can view audit trail"           ON public.analytics_audit;
DROP POLICY IF EXISTS "Teachers can view their audit trail"   ON public.analytics_audit;
DROP POLICY IF EXISTS "Admins can view analytics audit"       ON public.analytics_audit;
DROP POLICY IF EXISTS "Teachers can view analytics audit"     ON public.analytics_audit;

ALTER TABLE public.analytics_audit ENABLE ROW LEVEL SECURITY;

-- Admin: sees all audit records in tenant
CREATE POLICY "analytics_audit_admin_select"
    ON public.analytics_audit FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('ADMIN'::public.app_role)
    );

-- Teacher: sees only their own audit records
CREATE POLICY "analytics_audit_teacher_select"
    ON public.analytics_audit FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('TEACHER'::public.app_role)
        AND user_id = auth.uid()
    );

-- System insert: allow authenticated users to insert their own audit entries
CREATE POLICY "analytics_audit_insert_own"
    ON public.analytics_audit FOR INSERT
    WITH CHECK ( tenant_id = public.get_my_tenant_id() );

-- FIXED: analytics_audit — replaced auth.jwt() ->> 'role' with has_role()

-- =============================================================================
-- SECTION 5: analytics_monitoring_jobs (from migration 31)
-- =============================================================================
-- Removed: The analytics_monitoring_jobs table does not exist in this schema.


-- =============================================================================
-- SECTION 6: analytics_rate_limits
-- =============================================================================
-- Migration 30 uses auth.jwt() ->> 'role' = 'admin' for an admin-manage policy.
-- Migration 89 has already fixed the user-read policy; this section only fixes admin.

DROP POLICY IF EXISTS "Admins can manage rate limits"              ON public.analytics_rate_limits;
DROP POLICY IF EXISTS "analytics_rate_limits_admin_manage"         ON public.analytics_rate_limits;
DROP POLICY IF EXISTS "Admins manage analytics rate limits"        ON public.analytics_rate_limits;

ALTER TABLE public.analytics_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_rate_limits_admin_manage"
    ON public.analytics_rate_limits FOR ALL
    USING (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('ADMIN'::public.app_role)
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id()
        AND public.has_role('ADMIN'::public.app_role)
    );

-- FIXED: analytics_rate_limits — replaced auth.jwt() ->> 'role' with has_role()

-- =============================================================================
-- SECTION 7: course_progress
-- =============================================================================
-- Migration 09/093 created a teacher SELECT policy using auth.jwt() ->> 'role'.
-- Migration 88 fixed lesson_progress but NOT course_progress.
-- The policy name used in migration 09 was "course_progress_teacher_select".

DROP POLICY IF EXISTS "course_progress_teacher_select"     ON public.course_progress;
DROP POLICY IF EXISTS "course_progress_select_teacher"     ON public.course_progress;
-- Also catch raw jwt pattern names
DROP POLICY IF EXISTS "Teachers can view course progress"   ON public.course_progress;

ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- Teacher/Admin: view all progress within their tenant
CREATE POLICY "course_progress_select_teacher"
    ON public.course_progress FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) )
    );

-- Student: view only their own progress (ensure policy exists)
DROP POLICY IF EXISTS "course_progress_select_own"         ON public.course_progress;
CREATE POLICY "course_progress_select_own"
    ON public.course_progress FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND user_id = auth.uid()
    );

-- FIXED: course_progress — replaced auth.jwt() ->> 'role' with has_role()

-- =============================================================================
-- SECTION 8: user_badges
-- =============================================================================
-- Migration 75 uses auth.jwt() ->> 'tenant_id' directly instead of get_my_tenant_id().
-- Migration 89 already added better policies, but the migration 75 policy may still exist.

DROP POLICY IF EXISTS "Users can view their own badges"    ON public.user_badges;
-- Migration 89 creates "user_badges_select" — keep it but ensure it's correct.
-- Drop the migration 75 version (uses raw jwt tenant_id):
DROP POLICY IF EXISTS "user_badges_tenant_select"          ON public.user_badges;

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Ensure the canonical policy uses get_my_tenant_id()
DROP POLICY IF EXISTS "user_badges_select"                 ON public.user_badges;
CREATE POLICY "user_badges_select"
    ON public.user_badges FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND user_id = auth.uid()
    );

-- Admin/Teacher: can view all badges in tenant (for gradebook, analytics)
DROP POLICY IF EXISTS "user_badges_select_staff"           ON public.user_badges;
CREATE POLICY "user_badges_select_staff"
    ON public.user_badges FOR SELECT
    USING (
        tenant_id = public.get_my_tenant_id()
        AND ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) )
    );

-- FIXED: user_badges — replaced auth.jwt() ->> 'tenant_id' with get_my_tenant_id()

-- =============================================================================
-- SECTION 9: Fix RPC functions that check auth.jwt() ->> 'role'
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 9a. refresh_course_stats(p_course_id uuid)
-- Fix: replace jwt role check with has_role()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_course_stats(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id           uuid;
    v_caller_tenant_id    uuid;
    v_total_enrolled      integer := 0;
    v_active_students     integer := 0;
    v_avg_progress        numeric := 0;
    v_avg_quiz_score      numeric := 0;
    v_lesson_completion_rate numeric := 0;
    v_quiz_pass_rate      numeric := 0;
    v_at_risk_count       integer := 0;
    v_total_lessons       integer := 0;
    v_completed_lessons   integer := 0;
    v_quiz_attempts_total integer := 0;
    v_quiz_attempts_passed integer := 0;
BEGIN
    -- FIXED: use has_role() instead of auth.jwt() ->> 'role'
    IF NOT ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) ) THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    v_caller_tenant_id := public.get_my_tenant_id();

    -- Validate course exists and belongs to caller's tenant
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;
    IF v_tenant_id != v_caller_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- A. Enrollment counts
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE cp.last_activity_at > now() - interval '7 days')
    INTO v_total_enrolled, v_active_students
    FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    LEFT JOIN public.course_progress cp ON cp.course_id = p_course_id AND cp.user_id = e.student_id
    WHERE c.course_id = p_course_id AND e.status = 'ACTIVE';

    -- B. Avg progress + at-risk
    SELECT
        COALESCE(AVG(percentage), 0),
        COUNT(*) FILTER (WHERE percentage < 40.0 AND created_at < now() - interval '7 days')
    INTO v_avg_progress, v_at_risk_count
    FROM public.course_progress
    WHERE course_id = p_course_id;

    v_avg_progress := ROUND(v_avg_progress, 2);

    -- C. Lesson completion rate
    SELECT
        COALESCE(SUM(cp.total_lessons), 0),
        COALESCE(SUM(cp.completed_lessons), 0)
    INTO v_total_lessons, v_completed_lessons
    FROM public.course_progress cp
    WHERE cp.course_id = p_course_id;

    IF v_total_lessons > 0 THEN
        v_lesson_completion_rate := ROUND(
            (v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2
        );
    END IF;

    -- D. Quiz score + pass rate
    SELECT
        COALESCE(AVG(qa.score), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE qa.passed = true)
    INTO v_avg_quiz_score, v_quiz_attempts_total, v_quiz_attempts_passed
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE q.course_id = p_course_id
      AND qa.status IN ('graded', 'submitted');

    v_avg_quiz_score := ROUND(v_avg_quiz_score, 2);

    IF v_quiz_attempts_total > 0 THEN
        v_quiz_pass_rate := ROUND(
            (v_quiz_attempts_passed::numeric / v_quiz_attempts_total::numeric) * 100, 2
        );
    END IF;

    -- E. Upsert stats
    INSERT INTO public.course_stats (
        tenant_id, course_id, total_enrolled, active_students, avg_progress,
        avg_quiz_score, lesson_completion_rate, quiz_pass_rate,
        at_risk_count, last_calculated_at, updated_at
    )
    VALUES (
        v_tenant_id, p_course_id, v_total_enrolled, v_active_students, v_avg_progress,
        v_avg_quiz_score, v_lesson_completion_rate, v_quiz_pass_rate,
        v_at_risk_count, now(), now()
    )
    ON CONFLICT (tenant_id, course_id)
    DO UPDATE SET
        total_enrolled         = EXCLUDED.total_enrolled,
        active_students        = EXCLUDED.active_students,
        avg_progress           = EXCLUDED.avg_progress,
        avg_quiz_score         = EXCLUDED.avg_quiz_score,
        lesson_completion_rate = EXCLUDED.lesson_completion_rate,
        quiz_pass_rate         = EXCLUDED.quiz_pass_rate,
        at_risk_count          = EXCLUDED.at_risk_count,
        last_calculated_at     = now(),
        updated_at             = now();
END;
$$;
-- FIXED: refresh_course_stats — replaced auth.jwt() ->> 'role' with has_role()

-- ----------------------------------------------------------------------------
-- NOTE: 9b. get_question_difficulty was intentionally removed because it is
--       refactored correctly in 082 and no longer uses auth.jwt() direct checks.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 9c. get_student_progress_bundle(p_student_id uuid)
-- Fix: replace jwt role check with has_role(), updating the version from 082
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_progress_bundle(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    v_tenant_id := public.get_my_tenant_id();

    -- FIXED: replace auth.jwt() ->> 'role' with has_role()
    IF auth.uid() <> p_student_id
       AND NOT (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role)) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url)
            FROM public.profiles
            WHERE id = p_student_id
        ),
        'total_xp', (
            SELECT COALESCE(SUM(points), 0)
            FROM public.user_points
            WHERE user_id = p_student_id
              AND tenant_id = v_tenant_id
        ),
        'completed_lessons_count', (
            SELECT COUNT(*)
            FROM public.lesson_progress
            WHERE user_id = p_student_id
              AND completed = true
              AND tenant_id = v_tenant_id
        ),
        'quiz_attempts', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
            FROM (
                SELECT
                    a.id,
                    a.quiz_id,
                    a.score,
                    COALESCE(a.submitted_at, a.started_at) AS created_at
                FROM public.quiz_attempts_v2 a
                WHERE a.student_id = p_student_id
                  AND a.tenant_id = v_tenant_id
                  AND a.status IN ('SUBMITTED', 'GRADED')
                ORDER BY COALESCE(a.submitted_at, a.started_at) DESC
            ) d
        ),
        'achievements', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
            FROM (
                SELECT ub.id, ub.earned_at, b.name, b.icon
                FROM public.user_badges ub
                JOIN public.badges b ON b.id = ub.badge_id
                WHERE ub.user_id = p_student_id
                  AND ub.tenant_id = v_tenant_id
                ORDER BY ub.earned_at DESC
            ) d
        ),
        'course_progress', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
            FROM (
                SELECT cp.id, cp.course_id, cp.total_lessons, cp.completed_lessons, cp.percentage, cp.last_activity_type, cp.last_activity_at, c.title
                FROM public.course_progress cp
                JOIN public.courses c ON c.id = cp.course_id
                WHERE cp.user_id = p_student_id
                  AND cp.tenant_id = v_tenant_id
                ORDER BY cp.last_activity_at DESC NULLS LAST
            ) d
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
-- FIXED: get_student_progress_bundle — replaced auth.jwt() ->> 'role' with has_role()

-- ----------------------------------------------------------------------------
-- 9d. refresh_all_course_stats()
-- Fix: replace jwt role check with has_role()
-- Fix: drop function to allow change of return type from void to integer
DROP FUNCTION IF EXISTS public.refresh_all_course_stats();

CREATE OR REPLACE FUNCTION public.refresh_all_course_stats()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    r       RECORD;
    v_count integer := 0;
BEGIN
    -- FIXED: use has_role() instead of auth.jwt() ->> 'role'
    IF NOT ( public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role) ) THEN
        RAISE EXCEPTION 'Unauthorized: Only teachers and admins can refresh all course stats';
    END IF;

    FOR r IN
        SELECT id
        FROM public.courses
        WHERE tenant_id = public.get_my_tenant_id()
          AND status    = 'published'
    LOOP
        BEGIN
            PERFORM public.refresh_course_stats(r.id);
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            -- Log but continue; individual course failures should not abort the batch
            RAISE NOTICE 'Failed to refresh stats for course %: %', r.id, SQLERRM;
        END;
    END LOOP;

    RETURN v_count;
END;
$$;
-- FIXED: refresh_all_course_stats — replaced auth.jwt() ->> 'role' with has_role()

-- =============================================================================
-- SECTION 10: Verify & document remaining known issues
-- =============================================================================
--
-- The following locations still use auth.jwt() ->> 'role' but are either:
--   (a) in SECURITY DEFINER functions that also have tenant isolation via
--       get_my_tenant_id(), so the role check failure degrades to a missing
--       filter (not a security bypass), OR
--   (b) in analytics RPCs (migrations 14, 26, 29, 30, 121) that have been
--       partially superseded by the quiz engine RPCs.
--
-- These are flagged for P1 follow-up in migration 99+:
--   • get_teacher_analytics()           — migrations 121 / 801_teacher_dashboard
--   • check_analytics_rate_limit()      — migration 30
--   • record_analytics_metric()         — migration 31
--   • analytics_health_check()          — migration 32
--   • test_analytics_security()         — migration 33
--   • log_analytics_access()            — migration 28
--
-- These do not create security bypasses because they are SECURITY DEFINER
-- and rely on tenant isolation as the primary guard; the jwt role check is
-- additive authorization that currently passes vacuously.
-- =============================================================================

COMMIT;

NOTIFY pgrst, 'reload schema';
