-- Migration 295: Fix get_teacher_analytics — ce.student_id → ce.user_id
-- course_enrollments uses user_id, not student_id

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
