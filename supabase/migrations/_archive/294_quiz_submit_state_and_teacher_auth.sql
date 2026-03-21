-- =============================================================================
-- Migration 294: Fix quiz submit state machine + get_teacher_analytics auth
--
-- Fix 1: validate_attempt_transition — allow in_progress → graded directly
--        (the v1_submit_quiz_attempt function grades in one step)
--
-- Fix 2: get_teacher_analytics — has_role() fails when tenant_id is NULL in JWT
--        Use direct user_roles lookup with profile fallback for tenant_id
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FIX 1: Allow in_progress → graded transition
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_attempt_transition(
    p_old_status TEXT,
    p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE
        WHEN p_old_status = 'not_started'
        AND p_new_status = 'in_progress'
        THEN TRUE

        WHEN p_old_status = 'in_progress'
        AND p_new_status IN ('submitted', 'graded', 'expired', 'abandoned')
        THEN TRUE

        WHEN p_old_status = 'submitted'
        AND p_new_status = 'graded'
        THEN TRUE

        -- Allow re-grading
        WHEN p_old_status = 'graded'
        AND p_new_status = 'graded'
        THEN TRUE

        ELSE FALSE
    END;
END;
$$;


-- ---------------------------------------------------------------------------
-- FIX 2: get_teacher_analytics — tenant-aware auth without JWT claim dependency
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_teacher_analytics(
    p_course_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_cursor_student_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id   UUID := auth.uid();
    v_result    JSONB;
BEGIN
    -- Resolve tenant_id with fallback to profiles table when JWT claim is missing
    v_tenant_id := COALESCE(
        public.get_my_tenant_id(),
        (SELECT tenant_id FROM public.profiles WHERE id = v_user_id)
    );

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: tenant not found' USING ERRCODE = 'P0002';
    END IF;

    -- Check teacher/admin role via user_roles table (not JWT claim)
    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_user_id
          AND role IN ('TEACHER', 'ADMIN')
          AND tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin' USING ERRCODE = 'P0002';
    END IF;

    -- Rate limit with tenant fallback already fixed in migration 292
    IF NOT public.check_analytics_rate_limit(v_user_id) THEN
        RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = 'P0003';
    END IF;

    -- Build student analytics for this course
    SELECT jsonb_agg(
        jsonb_build_object(
            'student_id',         s.user_id,
            'student_name',       p.full_name,
            'completion_pct',     COALESCE(s.completion_pct, 0),
            'struggle_score',     COALESCE(s.struggle_score, 0),
            'time_spent_minutes', COALESCE(ROUND(s.time_spent_seconds::numeric / 60, 1), 0),
            'last_active',        s.last_event_at,
            'lessons_complete',   COALESCE(s.lessons_complete, 0),
            'quiz_avg_score',     s.quiz_avg_score
        )
        ORDER BY s.last_event_at DESC NULLS LAST
    )
    INTO v_result
    FROM public.student_lesson_signals s
    JOIN public.profiles p ON p.id = s.user_id
    JOIN public.course_enrollments ce ON ce.user_id = s.user_id
        AND ce.course_id = p_course_id
        AND ce.tenant_id = v_tenant_id
    WHERE s.tenant_id = v_tenant_id
      AND (p_cursor_student_id IS NULL OR s.user_id > p_cursor_student_id)
    LIMIT p_limit;

    RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
