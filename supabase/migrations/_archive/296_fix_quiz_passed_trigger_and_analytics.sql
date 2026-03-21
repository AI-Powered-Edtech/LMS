-- =============================================================================
-- Migration 296: Fix trigger_quiz_passed for quiz_attempts_v2 (uses student_id
-- not user_id) + fix get_teacher_analytics column names from student_lesson_signals
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FIX 1: Create trigger_quiz_passed_v2 that uses NEW.student_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trigger_quiz_passed_v2()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.passed = true AND (OLD.passed IS NULL OR OLD.passed = false) THEN
        INSERT INTO public.activity_events (tenant_id, user_id, event_type, metadata)
        VALUES (NEW.tenant_id, NEW.student_id, 'QUIZ_PASSED',
                jsonb_build_object('quiz_id', NEW.quiz_id, 'score', NEW.score))
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the v2 trigger to use the correct function
DROP TRIGGER IF EXISTS quiz_attempt_passed_trigger_v2 ON public.quiz_attempts_v2;

CREATE TRIGGER quiz_attempt_passed_trigger_v2
    AFTER UPDATE ON public.quiz_attempts_v2
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_quiz_passed_v2();


-- ---------------------------------------------------------------------------
-- FIX 2: get_teacher_analytics — correct column names from student_lesson_signals
-- Actual columns: total_time_spent, last_accessed_at, latest_quiz_score
-- No lessons_complete or quiz_avg_score columns exist
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
    v_tenant_id := COALESCE(
        public.get_my_tenant_id(),
        (SELECT tenant_id FROM public.profiles WHERE id = v_user_id)
    );

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: tenant not found' USING ERRCODE = 'P0002';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = v_user_id
          AND role IN ('TEACHER', 'ADMIN')
          AND tenant_id = v_tenant_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin' USING ERRCODE = 'P0002';
    END IF;

    IF NOT public.check_analytics_rate_limit(v_user_id) THEN
        RAISE EXCEPTION 'Rate limit exceeded' USING ERRCODE = 'P0003';
    END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'student_id',         s.user_id,
            'student_name',       p.full_name,
            'completion_pct',     COALESCE(s.completion_pct, 0),
            'struggle_score',     COALESCE(s.struggle_score, 0),
            'time_spent_minutes', COALESCE(ROUND(s.total_time_spent::numeric / 60, 1), 0),
            'last_active',        s.last_accessed_at,
            'quiz_avg_score',     s.latest_quiz_score
        )
        ORDER BY s.last_accessed_at DESC NULLS LAST
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
