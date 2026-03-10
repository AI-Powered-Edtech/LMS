-- ==========================================================================
-- Migration 26: Analytics Retry Logic
--
-- Adds retry tracking and locking mechanism to course_stats to prevent 
-- concurrent refresh conflicts and track failures.
-- ==========================================================================

-- 1. Add retry tracking columns to course_stats
ALTER TABLE public.course_stats 
ADD COLUMN IF NOT EXISTS refresh_attempts integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_refresh_error text,
ADD COLUMN IF NOT EXISTS refresh_locked_at timestamptz;

-- 2. Update refresh_course_stats to implement locking and retry tracking
CREATE OR REPLACE FUNCTION public.refresh_course_stats(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id uuid;
    v_user_tenant_id uuid;
    v_user_role text;
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
    -- Security Check (Skip for system/cron roles if needed, but here we enforce tenant)
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    v_user_role := auth.jwt() ->> 'role';

    -- Get course tenant & validate
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN 
        RAISE EXCEPTION 'Course not found';
    END IF;

    -- Enforce isolation only if called by a user context
    IF v_user_tenant_id IS NOT NULL AND v_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- Implement basic locking: If locked in last 1 minute, skip
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
        SELECT 
            COALESCE(AVG(percentage), 0),
            COUNT(*) FILTER (WHERE percentage < 40.0 AND created_at < now() - interval '7 days')
        INTO v_avg_progress, v_at_risk_count
        FROM public.course_progress
        WHERE course_id = p_course_id;
        
        v_avg_progress := ROUND(v_avg_progress, 2);

        -- C. Calculate Lesson Completion Rate
        SELECT 
            COALESCE(SUM(cp.total_lessons), 0),
            COALESCE(SUM(cp.completed_lessons), 0)
        INTO v_total_lessons, v_completed_lessons
        FROM public.course_progress cp
        WHERE cp.course_id = p_course_id;

        IF v_total_lessons > 0 THEN
            v_lesson_completion_rate := ROUND((v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2);
        END IF;

        -- D. Calculate Avg Quiz Score & Pass Rate
        SELECT 
            COALESCE(AVG(qa.score), 0),
            COUNT(*),
            COUNT(*) FILTER (WHERE qa.passed = true)
        INTO v_avg_quiz_score, v_quiz_attempts_total, v_quiz_attempts_passed
        FROM public.quiz_attempts qa
        JOIN public.quizzes q ON q.id = qa.quiz_id
        WHERE q.course_id = p_course_id AND qa.status IN ('graded', 'submitted');
        
        v_avg_quiz_score := ROUND(v_avg_quiz_score, 2);

        IF v_quiz_attempts_total > 0 THEN
            v_quiz_pass_rate := ROUND((v_quiz_attempts_passed::numeric / v_quiz_attempts_total::numeric) * 100, 2);
        END IF;

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
            total_enrolled = EXCLUDED.total_enrolled,
            active_students = EXCLUDED.active_students,
            avg_progress = EXCLUDED.avg_progress,
            avg_quiz_score = EXCLUDED.avg_quiz_score,
            lesson_completion_rate = EXCLUDED.lesson_completion_rate,
            quiz_pass_rate = EXCLUDED.quiz_pass_rate,
            at_risk_count = EXCLUDED.at_risk_count,
            last_calculated_at = now(),
            updated_at = now(),
            refresh_attempts = 0,
            last_refresh_error = NULL,
            refresh_locked_at = NULL;

    EXCEPTION WHEN OTHERS THEN
        UPDATE public.course_stats 
        SET 
            refresh_attempts = refresh_attempts + 1,
            last_refresh_error = SQLERRM,
            refresh_locked_at = NULL
        WHERE course_id = p_course_id;
        RAISE;
    END;
END;
$$;

COMMENT ON FUNCTION public.refresh_course_stats(uuid) IS 
'Refreshes course analytics with locking and retry tracking. Prevents concurrent refreshes within 1 minute.';
