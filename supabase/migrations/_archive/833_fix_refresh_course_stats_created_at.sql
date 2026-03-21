-- Fix refresh_course_stats: course_progress has no created_at column, use last_activity_at

CREATE OR REPLACE FUNCTION public.refresh_course_stats(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    -- B. Avg progress + at-risk (FIXED: created_at → last_activity_at)
    SELECT
        COALESCE(AVG(percentage), 0),
        COUNT(*) FILTER (WHERE percentage < 40.0 AND (last_activity_at IS NULL OR last_activity_at < now() - interval '7 days'))
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
$function$;
