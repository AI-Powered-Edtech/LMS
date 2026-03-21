-- ==========================================================================
-- Migration 103: Background Course Stats Refresh
-- 
-- Sets up pg_cron job to refresh course stats in background
-- This eliminates slow on-demand analytics queries
-- 
-- Note: Requires pg_cron extension (available on Supabase Pro)
-- ==========================================================================

BEGIN;

-- 1. Create internal stats refresh function (skips role checks for pg_cron)
CREATE OR REPLACE FUNCTION public._refresh_course_stats_internal(p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id           uuid;
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
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Course not found';
    END IF;

    -- A. Enrollment counts
    SELECT COUNT(*) INTO v_total_enrolled
    FROM public.enrollments e
    JOIN public.classes c ON c.id = e.class_id
    WHERE c.course_id = p_course_id AND e.status = 'ACTIVE';

    SELECT COUNT(*) FILTER (WHERE cp.last_activity_at > now() - interval '7 days')
    INTO v_active_students FROM public.course_progress cp WHERE cp.course_id = p_course_id;

    -- B. Avg progress + at-risk
    SELECT
        COALESCE(AVG(percentage), 0),
        COUNT(*) FILTER (WHERE percentage < 40.0 AND created_at < now() - interval '7 days')
    INTO v_avg_progress, v_at_risk_count
    FROM public.course_progress
    WHERE course_id = p_course_id AND tenant_id = v_tenant_id;

    v_avg_progress := ROUND(v_avg_progress, 2);

    -- C. Lesson completion rate
    SELECT
        COALESCE(SUM(cp.total_lessons), 0),
        COALESCE(SUM(cp.completed_lessons), 0)
    INTO v_total_lessons, v_completed_lessons
    FROM public.course_progress cp
    WHERE cp.course_id = p_course_id AND cp.tenant_id = v_tenant_id;

    IF v_total_lessons > 0 THEN
        v_lesson_completion_rate := ROUND(
            (v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2
        );
    END IF;

    -- D. Quiz score + pass rate
    SELECT
        COALESCE(AVG(qa.score), 0),
        COUNT(*)
    INTO v_avg_quiz_score, v_quiz_attempts_total
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE q.course_id = p_course_id AND qa.tenant_id = v_tenant_id
      AND qa.status IN ('graded', 'submitted');

    SELECT COUNT(*) INTO v_quiz_attempts_passed
    FROM public.quiz_attempts qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE q.course_id = p_course_id AND qa.tenant_id = v_tenant_id
      AND qa.status IN ('graded', 'submitted') AND qa.passed = true;

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
$$;

-- 2. Create batch refresh function
CREATE OR REPLACE FUNCTION public.refresh_course_stats_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_course record;
    v_updated int := 0;
    v_max_courses int := 50;  -- Process in batches to avoid long locks
BEGIN
    FOR v_course IN
        SELECT DISTINCT c.id, c.tenant_id
        FROM public.courses c
        JOIN public.course_progress cp ON cp.course_id = c.id
        WHERE c.status = 'published'  -- Only published courses
          AND cp.last_activity_at > now() - interval '24 hours'
          AND cp.last_calculated_at < now() - interval '5 minutes'
        ORDER BY cp.last_calculated_at ASC
        LIMIT v_max_courses
    LOOP
        BEGIN
            PERFORM public._refresh_course_stats_internal(v_course.id);
            v_updated := v_updated + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to refresh course %: %', v_course.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Batch refresh completed: % courses updated', v_updated;
END;
$$;

-- 3. Schedule via pg_cron (if available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-course-stats') THEN
            PERFORM cron.unschedule('refresh-course-stats');
        END IF;
        
        PERFORM cron.schedule(
            'refresh-course-stats',
            '*/5 * * * *',
            'SELECT public.refresh_course_stats_batch()'
        );
        
        RAISE NOTICE 'pg_cron job scheduled';
    ELSE
        RAISE NOTICE 'pg_cron not available';
    END IF;
END $$;

COMMENT ON FUNCTION public.refresh_course_stats_batch IS 
'Refreshes course_stats for published courses with recent activity. Called by pg_cron every 5 minutes. Processes max 50 courses per run.';

COMMIT;

NOTIFY pgrst, 'reload schema';
