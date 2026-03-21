-- Fix get_teacher_analytics: align all queries with actual DB schema:
-- - modules → course_modules (m.position → m."order")
-- - l.status = 'published' → l.is_published = true
-- - q.course_id doesn't exist; join quizzes via lessons → course_modules
-- - Remove broken refresh_course_stats + course_stats dependency; compute inline

CREATE OR REPLACE FUNCTION public.get_teacher_analytics(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_tenant_id uuid;
    v_course_tenant_id uuid;
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
    v_module_completion jsonb;
    v_quiz_pass_rates jsonb;
    v_top_students jsonb;
    v_at_risk_students jsonb;
BEGIN
    -- Security: use has_role() (checks user_roles table, not JWT claims)
    IF NOT (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role)) THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    v_user_tenant_id := public.get_my_tenant_id();

    SELECT tenant_id INTO v_course_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_course_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;
    IF v_course_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- A. Enrollment + active students (via classes → enrollments)
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE cp.last_activity_at > now() - interval '7 days')
    INTO v_total_enrolled, v_active_students
    FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    LEFT JOIN public.course_progress cp ON cp.course_id = p_course_id AND cp.user_id = e.student_id
    WHERE c.course_id = p_course_id AND e.status = 'ACTIVE';

    -- B. Avg progress + at-risk count
    SELECT
        COALESCE(ROUND(AVG(percentage), 2), 0),
        COUNT(*) FILTER (WHERE percentage < 40.0 AND (last_activity_at IS NULL OR last_activity_at < now() - interval '7 days'))
    INTO v_avg_progress, v_at_risk_count
    FROM public.course_progress
    WHERE course_id = p_course_id;

    -- C. Lesson completion rate
    SELECT
        COALESCE(SUM(cp.total_lessons), 0),
        COALESCE(SUM(cp.completed_lessons), 0)
    INTO v_total_lessons, v_completed_lessons
    FROM public.course_progress cp
    WHERE cp.course_id = p_course_id;

    IF v_total_lessons > 0 THEN
        v_lesson_completion_rate := ROUND((v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2);
    END IF;

    -- D. Quiz avg score + pass rate (quizzes link to lessons, not courses directly)
    SELECT
        COALESCE(ROUND(AVG(qa.score), 2), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE qa.passed = true)
    INTO v_avg_quiz_score, v_quiz_attempts_total, v_quiz_attempts_passed
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    JOIN public.lessons l ON l.id = q.lesson_id
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id AND qa.status IN ('graded', 'submitted');

    IF v_quiz_attempts_total > 0 THEN
        v_quiz_pass_rate := ROUND((v_quiz_attempts_passed::numeric / v_quiz_attempts_total::numeric) * 100, 2);
    END IF;

    -- E. Module Completion Breakdown (course_modules, not modules; is_published not status)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'module_id', sub.module_id,
            'title', sub.title,
            'completion_rate', sub.completion_rate
        )
        ORDER BY sub.sort_order
    ), '[]'::jsonb) INTO v_module_completion
    FROM (
        SELECT
            cm.id as module_id,
            cm.title,
            cm."order" as sort_order,
            COALESCE(ROUND(
                (COUNT(DISTINCT lp.user_id) FILTER (WHERE lp.completed = true)::numeric /
                NULLIF(COUNT(DISTINCT lp.user_id), 0)) * 100, 2), 0) as completion_rate
        FROM public.course_modules cm
        JOIN public.lessons l ON l.module_id = cm.id AND l.is_published = true
        LEFT JOIN public.lesson_progress lp ON lp.lesson_id = l.id
        WHERE cm.course_id = p_course_id
        GROUP BY cm.id, cm.title, cm."order"
    ) sub;

    -- F. Quiz Pass Rate Breakdown
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'quiz_id', sub.quiz_id,
            'title', sub.title,
            'pass_rate', sub.pass_rate
        )
        ORDER BY sub.created_at
    ), '[]'::jsonb) INTO v_quiz_pass_rates
    FROM (
        SELECT
            q.id as quiz_id,
            q.title,
            q.created_at,
            COALESCE(ROUND(
                (COUNT(qa.id) FILTER (WHERE qa.passed = true)::numeric /
                NULLIF(COUNT(qa.id), 0)) * 100, 2), 0) as pass_rate
        FROM public.quizzes q
        JOIN public.lessons l ON l.id = q.lesson_id
        JOIN public.course_modules cm ON cm.id = l.module_id
        LEFT JOIN public.quiz_attempts qa ON qa.quiz_id = q.id AND qa.status IN ('graded', 'submitted')
        WHERE cm.course_id = p_course_id
        GROUP BY q.id, q.title, q.created_at
    ) sub;

    -- G. Top Students
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

    -- H. At-Risk Students
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
          AND (cp.last_activity_at IS NULL OR cp.last_activity_at < now() - interval '7 days')
        ORDER BY cp.percentage ASC
        LIMIT 5
    ) sub;

    RETURN jsonb_build_object(
        'overview', jsonb_build_object(
            'total_enrolled', v_total_enrolled,
            'active_students', v_active_students,
            'avg_progress', v_avg_progress,
            'avg_quiz_score', v_avg_quiz_score,
            'lesson_completion_rate', v_lesson_completion_rate,
            'quiz_pass_rate', v_quiz_pass_rate,
            'at_risk_count', v_at_risk_count,
            'last_calculated_at', now()
        ),
        'module_completion', v_module_completion,
        'quiz_pass_rates', v_quiz_pass_rates,
        'students', jsonb_build_object(
            'top', v_top_students,
            'at_risk', v_at_risk_students
        )
    );
END;
$function$;
