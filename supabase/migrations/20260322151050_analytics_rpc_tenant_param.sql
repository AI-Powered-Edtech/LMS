-- Add p_tenant_id parameter to analytics RPCs for defense-in-depth tenant isolation.
-- These are CREATE OR REPLACE so the function bodies remain identical — only the
-- signature gains an optional p_tenant_id parameter that provides an extra check.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. refresh_course_stats — add p_tenant_id DEFAULT NULL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_course_stats(
  p_course_id   UUID,
  p_tenant_id   UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id uuid;
    v_user_tenant_id uuid;
    v_cb record;
    v_locked_at timestamptz;
    -- vars for stats
    v_total_enrolled integer := 0;
    v_active_students integer := 0;
    v_avg_progress numeric := 0;
    v_avg_quiz_score numeric := 0;
    v_lesson_completion_rate numeric := 0;
    v_quiz_pass_rate numeric := 0;
    v_at_risk_count integer := 0;
    v_total_lessons integer := 0;
    v_completed_lessons integer := 0;
    v_quiz_attempts_total integer := 0;
    v_quiz_attempts_passed integer := 0;
BEGIN
    -- Circuit Breaker Check
    SELECT * INTO v_cb FROM public.analytics_circuit_breaker WHERE id = 'refresh_course_stats';

    IF v_cb.state = 'open' THEN
        IF now() > v_cb.reset_at THEN
            UPDATE public.analytics_circuit_breaker
            SET state = 'half_open'
            WHERE id = 'refresh_course_stats';
        ELSE
            RETURN;
        END IF;
    END IF;

    -- Security Check
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

    -- Get course tenant & validate
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    IF v_user_tenant_id IS NOT NULL AND v_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- Defense-in-depth: verify caller-supplied tenant matches course tenant
    IF p_tenant_id IS NOT NULL AND v_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch (p_tenant_id)';
    END IF;

    -- Implement basic locking
    SELECT refresh_locked_at INTO v_locked_at FROM public.course_stats WHERE course_id = p_course_id;
    IF v_locked_at IS NOT NULL AND v_locked_at > now() - interval '1 minute' THEN
        RETURN;
    END IF;

    -- Lock the record
    UPDATE public.course_stats SET refresh_locked_at = now() WHERE course_id = p_course_id;

    BEGIN
        -- A. Calculate Enrollment & Active Students
        SELECT COUNT(*), COUNT(*) FILTER (WHERE e.last_accessed_at > now() - interval '7 days')
        INTO v_total_enrolled, v_active_students
        FROM public.enrollments e
        JOIN public.classes c ON c.id = e.class_id
        WHERE c.course_id = p_course_id AND e.status = 'ACTIVE';

        -- B. Calculate Average Progress and At-Risk count
        SELECT COALESCE(AVG(percentage), 0), COUNT(*) FILTER (WHERE percentage < 40.0 AND created_at < now() - interval '7 days')
        INTO v_avg_progress, v_at_risk_count
        FROM public.course_progress WHERE course_id = p_course_id;
        v_avg_progress := ROUND(v_avg_progress, 2);

        -- C. Calculate Lesson Completion Rate
        SELECT COALESCE(SUM(cp.total_lessons), 0), COALESCE(SUM(cp.completed_lessons), 0)
        INTO v_total_lessons, v_completed_lessons
        FROM public.course_progress cp WHERE cp.course_id = p_course_id;
        IF v_total_lessons > 0 THEN v_lesson_completion_rate := ROUND((v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2); END IF;

        -- D. Calculate Avg Quiz Score & Pass Rate
        SELECT COALESCE(AVG(qa.score), 0), COUNT(*), COUNT(*) FILTER (WHERE qa.passed = true)
        INTO v_avg_quiz_score, v_quiz_attempts_total, v_quiz_attempts_passed
        FROM public.quiz_attempts qa JOIN public.quizzes q ON q.id = qa.quiz_id
        WHERE q.course_id = p_course_id AND qa.status IN ('graded', 'submitted');
        v_avg_quiz_score := ROUND(v_avg_quiz_score, 2);
        IF v_quiz_attempts_total > 0 THEN v_quiz_pass_rate := ROUND((v_quiz_attempts_passed::numeric / v_quiz_attempts_total::numeric) * 100, 2); END IF;

        -- E. Upsert into course_stats
        INSERT INTO public.course_stats (
            tenant_id, course_id, total_enrolled, active_students, avg_progress,
            avg_quiz_score, lesson_completion_rate, quiz_pass_rate, at_risk_count,
            last_calculated_at, updated_at, refresh_attempts, last_refresh_error, refresh_locked_at
        )
        VALUES (
            v_tenant_id, p_course_id, v_total_enrolled, v_active_students, v_avg_progress,
            v_avg_quiz_score, v_lesson_completion_rate, v_quiz_pass_rate, v_at_risk_count,
            now(), now(), 0, NULL, NULL
        )
        ON CONFLICT (course_id)
        DO UPDATE SET
            total_enrolled = EXCLUDED.total_enrolled, active_students = EXCLUDED.active_students,
            avg_progress = EXCLUDED.avg_progress, avg_quiz_score = EXCLUDED.avg_quiz_score,
            lesson_completion_rate = EXCLUDED.lesson_completion_rate, quiz_pass_rate = EXCLUDED.quiz_pass_rate,
            at_risk_count = EXCLUDED.at_risk_count, last_calculated_at = now(), updated_at = now(),
            refresh_attempts = 0, last_refresh_error = NULL, refresh_locked_at = NULL;

        IF v_cb.state = 'half_open' THEN
            UPDATE public.analytics_circuit_breaker
            SET state = 'closed', failure_count = 0, reset_at = NULL
            WHERE id = 'refresh_course_stats';
        END IF;

    EXCEPTION WHEN OTHERS THEN
        UPDATE public.course_stats
        SET refresh_attempts = refresh_attempts + 1, last_refresh_error = SQLERRM, refresh_locked_at = NULL
        WHERE course_id = p_course_id;

        UPDATE public.analytics_circuit_breaker
        SET
            failure_count = failure_count + 1,
            last_failure_at = now(),
            state = CASE WHEN failure_count + 1 >= threshold THEN 'open' ELSE state END,
            reset_at = CASE WHEN failure_count + 1 >= threshold THEN now() + timeout ELSE reset_at END
        WHERE id = 'refresh_course_stats';

        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.refresh_course_stats(UUID, UUID) IS
  'Refreshes course analytics with locking and retry tracking. Accepts optional p_tenant_id for defense-in-depth.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. get_teacher_analytics — add p_tenant_id DEFAULT NULL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_teacher_analytics(
  p_course_id   UUID,
  p_tenant_id   UUID DEFAULT NULL
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
    v_top_students jsonb;
    v_at_risk_students jsonb;
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

    -- Defense-in-depth: verify caller-supplied tenant matches course tenant
    IF p_tenant_id IS NOT NULL AND v_course_tenant_id != p_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch (p_tenant_id)';
    END IF;

    -- A. Fetch High-Level Stats
    PERFORM public.refresh_course_stats(p_course_id);

    SELECT * INTO v_stats FROM public.course_stats WHERE course_id = p_course_id;

    -- B. Module Completion Breakdown
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'module_id', sub.module_id,
            'title', sub.title,
            'completion_rate', sub.completion_rate
        )
    ), '[]'::jsonb) INTO v_module_completion
    FROM (
        SELECT
            m.id as module_id,
            m.title,
            COALESCE(
                ROUND(
                    (COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.completed = true)::numeric /
                    NULLIF(COUNT(DISTINCT lp.user_id), 0)) * 100,
                2),
            0) as completion_rate
        FROM public.modules m
        JOIN public.lessons l ON l.module_id = m.id AND l.status = 'published'
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id
        WHERE m.course_id = p_course_id
        GROUP BY m.id, m.title, m.position
        ORDER BY m.position ASC
    ) sub;

    -- C. Quiz Pass Rate Breakdown
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'quiz_id', sub.quiz_id,
            'title', sub.title,
            'pass_rate', sub.pass_rate
        )
    ), '[]'::jsonb) INTO v_quiz_pass_rates
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

    -- D. Top Students
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'student_id', sub.user_id,
            'name', sub.full_name,
            'progress', sub.percentage,
            'last_active', sub.last_activity_at
        )
    ), '[]'::jsonb) INTO v_top_students
    FROM (
        SELECT cp.user_id, up.full_name, cp.percentage, cp.last_activity_at
        FROM public.course_progress cp
        JOIN public.user_profiles up ON up.id = cp.user_id
        WHERE cp.course_id = p_course_id
        ORDER BY cp.percentage DESC, cp.last_activity_at DESC NULLS LAST
        LIMIT 5
    ) sub;

    -- E. At-Risk Students
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'student_id', sub.user_id,
            'name', sub.full_name,
            'progress', sub.percentage,
            'last_active', sub.last_activity_at
        )
    ), '[]'::jsonb) INTO v_at_risk_students
    FROM (
        SELECT cp.user_id, up.full_name, cp.percentage, cp.last_activity_at
        FROM public.course_progress cp
        JOIN public.user_profiles up ON up.id = cp.user_id
        WHERE cp.course_id = p_course_id
          AND cp.percentage < 40.0
          AND cp.created_at < now() - interval '7 days'
        ORDER BY cp.percentage ASC
        LIMIT 5
    ) sub;

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
        'students', jsonb_build_object(
            'top', v_top_students,
            'at_risk', v_at_risk_students
        )
    );
END;
$$;

COMMENT ON FUNCTION public.get_teacher_analytics(UUID, UUID) IS
  'Returns comprehensive analytics for a course. Accepts optional p_tenant_id for defense-in-depth.';
