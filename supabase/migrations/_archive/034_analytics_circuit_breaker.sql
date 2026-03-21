-- ==========================================================================
-- Migration 34: Analytics Circuit Breaker
--
-- Implements a circuit breaker pattern for the analytics refresh process
-- to prevent cascading failures when the system is under heavy load or
-- experiencing persistent database errors.
-- ==========================================================================

-- 1. Create the circuit breaker state table
CREATE TABLE IF NOT EXISTS public.analytics_circuit_breaker (
    id text PRIMARY KEY DEFAULT 'refresh_course_stats',
    state text NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
    failure_count integer DEFAULT 0,
    last_failure_at timestamptz,
    reset_at timestamptz,
    threshold integer DEFAULT 5, -- failures before opening
    timeout interval DEFAULT interval '5 minutes' -- time to stay open before half_open
);

-- Initialize the circuit breaker if not exists
INSERT INTO public.analytics_circuit_breaker (id)
VALUES ('refresh_course_stats')
ON CONFLICT DO NOTHING;

-- 2. Enable RLS
ALTER TABLE public.analytics_circuit_breaker ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Only admins can view/manage circuit breaker
DROP POLICY IF EXISTS "Admins can manage analytics circuit breaker" ON public.analytics_circuit_breaker;
CREATE POLICY "Admins can manage analytics circuit breaker"
ON public.analytics_circuit_breaker FOR ALL
USING (
    (auth.jwt() ->> 'role') = 'admin'
)
WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
);

-- 4. Update refresh_course_stats to respect and update the circuit breaker
CREATE OR REPLACE FUNCTION public.refresh_course_stats(p_course_id uuid)
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
            -- Transition to half_open to allow a trial request
            UPDATE public.analytics_circuit_breaker 
            SET state = 'half_open' 
            WHERE id = 'refresh_course_stats';
        ELSE
            -- Circuit is open, skip execution
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

        -- Success: Close the circuit if it was half_open
        IF v_cb.state = 'half_open' THEN
            UPDATE public.analytics_circuit_breaker 
            SET state = 'closed', failure_count = 0, reset_at = NULL 
            WHERE id = 'refresh_course_stats';
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Failure: Update mistake tracking
        UPDATE public.course_stats 
        SET refresh_attempts = refresh_attempts + 1, last_refresh_error = SQLERRM, refresh_locked_at = NULL
        WHERE course_id = p_course_id;

        -- Failure: Update circuit breaker
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

COMMENT ON TABLE public.analytics_circuit_breaker IS 'State tracking for the analytics refresh circuit breaker.';
