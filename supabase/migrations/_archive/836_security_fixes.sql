-- ==========================================================================
-- Migration 836: Security Fixes
-- Date: 2026-03-20
-- Audited by: Security Audit v1
--
-- Fixes:
--   FIX-1  award_quiz_xp — caller must be the same user (auth.uid() check)
--   FIX-2  v1_get_quiz_results — add SET search_path TO 'public' inside function
--   FIX-3  aggregation_state — enable RLS + restrict to service-role/admin only
--   FIX-4  student_lesson_signals — tighten RLS: students see own rows only,
--          teachers/admins see full tenant
--   FIX-5  quiz_submission_queue — remove "user_id IS NULL" wildcard in INSERT policy
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- FIX-1: award_quiz_xp — validate caller == p_user_id
--
-- Problem: function is SECURITY DEFINER and accepts p_user_id as a caller-
-- supplied parameter with no check that auth.uid() == p_user_id. Any
-- authenticated user could award XP to an arbitrary user by passing a
-- different UUID.
-- Fix: add auth.uid() IS NOT NULL check and enforce p_user_id = auth.uid().
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.award_quiz_xp(
    p_user_id UUID,
    p_lesson_id UUID,
    p_quiz_id UUID,
    p_score INTEGER,
    p_passing_score INTEGER,
    p_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_xp_amount INTEGER;
    v_award_xp BOOLEAN := FALSE;
    v_existing_attempt RECORD;
BEGIN
    -- ---- Caller identity check ----------------------------------------
    -- The caller must be authenticated and must be awarding XP for themselves.
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Unauthorized: must be authenticated'
        );
    END IF;

    IF auth.uid() != p_user_id THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Unauthorized: cannot award XP to another user'
        );
    END IF;

    -- ---- Basic parameter validation ------------------------------------
    IF p_user_id IS NULL OR p_quiz_id IS NULL OR p_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Invalid parameters: user_id, quiz_id, and tenant_id are required'
        );
    END IF;

    -- ---- Tenant isolation check ----------------------------------------
    -- Ensure the calling user actually belongs to p_tenant_id.
    IF public.get_my_tenant_id() IS DISTINCT FROM p_tenant_id THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Unauthorized: tenant mismatch'
        );
    END IF;

    -- ---- Score check ---------------------------------------------------
    IF p_passing_score IS NOT NULL AND p_score >= p_passing_score THEN
        v_award_xp := TRUE;
    ELSIF p_passing_score IS NULL AND p_score >= 70 THEN
        v_award_xp := TRUE;
    END IF;

    IF NOT v_award_xp THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Score does not meet passing threshold',
            'xp_awarded', FALSE
        );
    END IF;

    -- ---- Idempotency check --------------------------------------------
    SELECT id, xp_awarded INTO v_existing_attempt
    FROM public.quiz_attempts_v2
    WHERE tenant_id = p_tenant_id
      AND quiz_id = p_quiz_id
      AND student_id = p_user_id
      AND status IN ('graded', 'submitted')
      AND score IS NOT NULL
      AND score >= COALESCE(p_passing_score, 70)
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_attempt IS NOT NULL AND v_existing_attempt.xp_awarded = TRUE THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'message', 'XP already awarded for this attempt',
            'xp_awarded', TRUE,
            'attempt_id', v_existing_attempt.id
        );
    END IF;

    -- ---- XP calculation -----------------------------------------------
    IF p_passing_score IS NOT NULL AND p_passing_score > 0 THEN
        v_xp_amount := GREATEST(10, ROUND((p_score::NUMERIC / p_passing_score::NUMERIC) * 20));
    ELSE
        v_xp_amount := 10;
    END IF;

    PERFORM public.add_user_points(p_user_id, v_xp_amount, NULL);

    IF v_existing_attempt IS NOT NULL THEN
        UPDATE public.quiz_attempts_v2
        SET xp_awarded = TRUE
        WHERE id = v_existing_attempt.id
          AND tenant_id = p_tenant_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'XP awarded successfully',
        'xp_awarded', TRUE,
        'xp_amount', v_xp_amount,
        'attempt_id', v_existing_attempt.id
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'message', 'Error awarding XP: ' || SQLERRM,
        'xp_awarded', FALSE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_quiz_xp TO authenticated;


-- ==========================================================================
-- FIX-2: v1_get_quiz_results — add SET search_path inside function body
--
-- Problem: the function uses SECURITY DEFINER without a fixed search_path.
-- The session-level SET at line 4 of migration 802 is NOT inherited by the
-- function definition. An attacker who can create objects in a schema that
-- appears earlier in the default search_path could shadow public functions
-- (e.g. get_my_tenant_id) and escalate privileges.
-- Fix: re-create the function with SET search_path TO 'public'.
-- ==========================================================================
CREATE OR REPLACE FUNCTION public.v1_get_quiz_results(p_quiz_id UUID)
RETURNS TABLE (
  attempt_id UUID,
  student_id UUID,
  student_name TEXT,
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  status attempt_status,
  passed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID := auth.uid();
    v_is_teacher BOOLEAN;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: must be authenticated' USING ERRCODE = 'P0002';
    END IF;

    v_tenant_id := get_my_tenant_id();

    SELECT EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.classes c ON c.id = q.class_id
        LEFT JOIN public.user_roles ur
            ON ur.user_id = v_user_id
           AND ur.tenant_id = v_tenant_id
           AND ur.role = 'admin'
        WHERE q.id = p_quiz_id
          AND q.tenant_id = v_tenant_id
          AND (c.teacher_id = v_user_id OR ur.id IS NOT NULL)
    ) INTO v_is_teacher;

    IF NOT v_is_teacher THEN
        RAISE EXCEPTION 'Unauthorized: Must be the class teacher or an admin' USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT
        qa.id AS attempt_id,
        qa.student_id,
        (p.first_name || ' ' || p.last_name) AS student_name,
        qa.started_at,
        qa.submitted_at,
        qa.score,
        qa.status,
        qa.passed
    FROM public.quiz_attempts qa
    JOIN public.profiles p ON p.id = qa.student_id
    WHERE qa.quiz_id = p_quiz_id
      AND qa.tenant_id = v_tenant_id
    ORDER BY qa.submitted_at DESC NULLS LAST, qa.started_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.v1_get_quiz_results(UUID) TO authenticated;


-- ==========================================================================
-- FIX-3: aggregation_state — enable RLS and block direct access
--
-- Problem: aggregation_state has no RLS. Any authenticated user can read
-- and mutate watermark state, potentially poisoning the analytics pipeline
-- (e.g. rolling the watermark forward to suppress event processing).
-- Fix: enable RLS. Only service-role (background jobs via Edge Function)
-- may write; admins within the tenant may read for observability. Direct
-- writes from the anon/authenticated role are blocked.
-- ==========================================================================
ALTER TABLE public.aggregation_state ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for regular authenticated users — watermarks are internal.
-- Supabase service_role bypasses RLS entirely (used by Edge Function jobs).
-- If an admin observability read is needed later, add a scoped SELECT policy.

-- Block all direct DML from the anon/authenticated role.
-- (RLS enabled with no permissive policy = deny by default)


-- ==========================================================================
-- FIX-4: student_lesson_signals — students see own rows only
--
-- Problem: the existing "tenant_isolation" policy uses only
--   USING (tenant_id = get_my_tenant_id())
-- meaning every student within a tenant can read every other student's
-- engagement signals (struggle_score, video_replays, quiz scores, etc.).
-- Fix: replace with role-aware policies:
--   - Students: own rows only
--   - Teachers/Admins: full tenant (for analytics dashboards)
-- ==========================================================================
DROP POLICY IF EXISTS "tenant_isolation" ON public.student_lesson_signals;

CREATE POLICY "students_own_signals"
  ON public.student_lesson_signals
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND tenant_id = public.get_my_tenant_id()
  );

CREATE POLICY "teachers_read_tenant_signals"
  ON public.student_lesson_signals
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = public.get_my_tenant_id()
    AND (public.has_role('TEACHER') OR public.has_role('ADMIN'))
  );

-- Aggregation jobs run as service_role (bypasses RLS), so no INSERT/UPDATE
-- policy is needed for authenticated users. Block direct writes from clients.


-- ==========================================================================
-- FIX-5: quiz_submission_queue — remove "user_id IS NULL" wildcard
--
-- Problem: the INSERT policy contains:
--   WITH CHECK (user_id = auth.uid() OR user_id IS NULL)
-- The "OR user_id IS NULL" branch lets any authenticated user insert rows
-- with a NULL user_id, bypassing ownership tracking entirely. System inserts
-- should go through the service_role key in Edge Functions, which bypasses
-- RLS and does not need this backdoor.
-- Fix: remove the IS NULL escape hatch from the policy.
-- ==========================================================================
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.quiz_submission_queue;

CREATE POLICY "Users can insert own submissions"
  ON public.quiz_submission_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Matching fix for quiz_attempt_telemetry which has the same pattern.
DROP POLICY IF EXISTS "Users can insert own telemetry" ON public.quiz_attempt_telemetry;

CREATE POLICY "Users can insert own telemetry"
  ON public.quiz_attempt_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

COMMIT;
