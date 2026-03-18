-- ==========================================================================
-- Migration 29: Cursor-based Pagination for Analytics
--
-- Enhances get_teacher_analytics to support pagination for student lists,
-- preventing performance issues with large courses.
-- ==========================================================================

-- 1. Recreate get_teacher_analytics with pagination support
CREATE OR REPLACE FUNCTION public.get_teacher_analytics(
    p_course_id uuid,
    p_limit integer DEFAULT 20,
    p_cursor_student_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_tenant_id uuid;
    v_course_tenant_id uuid;
    v_user_role text;
    v_stats record;
    v_module_completion jsonb;
    v_quiz_pass_rates jsonb;
    v_students_list jsonb;
    v_next_cursor uuid;
BEGIN
    -- Security: Get role from JWT
    v_user_role := auth.jwt() ->> 'role';
    
    -- Security: Validate role
    IF v_user_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    -- Get tenant from JWT
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

    -- Get course tenant and validate
    SELECT tenant_id INTO v_course_tenant_id FROM public.courses WHERE id = p_course_id;
    
    IF v_course_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    -- Security: Tenant isolation
    IF v_course_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- Log access (using function from migration 28)
    PERFORM public.log_analytics_access('VIEW_ANALYTICS', p_course_id, jsonb_build_object('limit', p_limit, 'cursor', p_cursor_student_id));

    -- A. Fetch High-Level Stats
    PERFORM public.refresh_course_stats(p_course_id);
    SELECT * INTO v_stats FROM public.course_stats WHERE course_id = p_course_id;

    -- B. Module Completion Breakdown
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_module_completion
    FROM (
        SELECT 
            m.id as module_id, 
            m.title,
            COALESCE(
                ROUND(
                    (COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.completed = true)::numeric / 
                    NULLIF(COUNT(DISTINCT e.user_id), 0)) * 100, 
                2), 
            0) as completion_rate
        FROM public.modules m
        JOIN public.lessons l ON l.module_id = m.id AND l.status = 'published'
        JOIN public.enrollments e ON e.class_id IN (SELECT id FROM public.classes WHERE course_id = p_course_id) AND e.status = 'ACTIVE'
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = e.user_id
        WHERE m.course_id = p_course_id
        GROUP BY m.id, m.title, m.position
        ORDER BY m.position ASC
    ) sub;

    -- C. Quiz Pass Rate Breakdown
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_quiz_pass_rates
    FROM (
        SELECT 
            q.id as quiz_id,
            q.title,
            COALESCE(
                ROUND(
                    (COUNT(qa.id) FILTER (WHERE qa.passed = true)::numeric / 
                    NULLIF(COUNT(qa.id), 0)) * 100, 
                2), 
            0) as pass_rate
        FROM public.quizzes q
        LEFT JOIN public.quiz_attempts qa ON qa.quiz_id = q.id AND qa.status IN ('graded', 'submitted')
        WHERE q.course_id = p_course_id
        GROUP BY q.id, q.title, q.created_at
        ORDER BY q.created_at ASC
    ) sub;

    -- D. Paginated Student List
    SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb) INTO v_students_list
    FROM (
        SELECT 
            e.user_id as student_id, 
            up.full_name, 
            COALESCE(cp.percentage, 0) as progress, 
            cp.last_activity_at
        FROM public.enrollments e
        JOIN public.user_profiles up ON up.id = e.user_id
        JOIN public.classes cl ON cl.id = e.class_id
        LEFT JOIN public.course_progress cp ON cp.course_id = p_course_id AND cp.user_id = e.user_id
        WHERE cl.course_id = p_course_id 
          AND e.status = 'ACTIVE'
          AND (p_cursor_student_id IS NULL OR e.user_id > p_cursor_student_id)
        ORDER BY e.user_id ASC
        LIMIT p_limit
    ) sub;

    -- E. Determine Next Cursor
    IF jsonb_array_length(v_students_list) = p_limit THEN
        v_next_cursor := (v_students_list->(p_limit-1))->>'student_id';
    END IF;

    -- Assembly
    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'total_enrolled', COALESCE(v_stats.total_enrolled, 0),
            'active_students', COALESCE(v_stats.active_students, 0),
            'avg_progress', COALESCE(v_stats.avg_progress, 0),
            'avg_quiz_score', COALESCE(v_stats.avg_quiz_score, 0),
            'lesson_completion_rate', COALESCE(v_stats.lesson_completion_rate, 0),
            'quiz_pass_rate', COALESCE(v_stats.quiz_pass_rate, 0),
            'at_risk_count', COALESCE(v_stats.at_risk_count, 0),
            'last_calculated_at', v_stats.last_calculated_at
        ),
        'module_completion', v_module_completion,
        'quiz_pass_rates', v_quiz_pass_rates,
        'students_list', v_students_list,
        'next_cursor', v_next_cursor
    );
END;
$$;

COMMENT ON FUNCTION public.get_teacher_analytics(uuid, integer, uuid) IS 
'Returns comprehensive analytics with cursor-based pagination for the student list. Requires teacher or admin role.';
