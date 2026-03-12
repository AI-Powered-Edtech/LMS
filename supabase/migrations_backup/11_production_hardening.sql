-- ==========================================================================
-- Migration 11: Production Hardening
--
-- Phase 3: Performance, Security, and Scalability.
-- 1. Adds missing performance indexes.
-- 2. Optimizes lesson progress trigger to prevent redundant recomputations.
-- 3. Hardens Analytics RPCs with role and tenant validation.
-- 4. Adds debug/audit fields.
-- 5. Consolidates Student Progress into a single efficient RPC (N+1 fix).
-- ==========================================================================

-- 1. Add Missing Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_lesson_id 
ON public.quiz_attempts(lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson 
ON public.lesson_progress(user_id, lesson_id);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed 
ON public.lesson_progress(completed);

CREATE INDEX IF NOT EXISTS idx_course_progress_user_course 
ON public.course_progress(user_id, course_id);

CREATE INDEX IF NOT EXISTS idx_course_stats_course 
ON public.course_stats(course_id);


-- 2. Optimize Trigger: on_lesson_progress_completed
-- We update the trigger to only fire when completed transitions from false to true.
DROP TRIGGER IF EXISTS on_lesson_progress_completed ON public.lesson_progress;

CREATE TRIGGER on_lesson_progress_completed
AFTER INSERT OR UPDATE OF completed
ON public.lesson_progress
FOR EACH ROW
WHEN (
  NEW.completed = true
  AND (OLD.completed IS NULL OR OLD.completed = false)
)
EXECUTE FUNCTION public.recompute_course_progress_trigger();


-- 3. Harden Analytics RPC Security
-- refresh_course_stats
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
    -- Security Check
    v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    v_user_role := auth.jwt() ->> 'role';

    IF v_user_role NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Role must be teacher or admin';
    END IF;

    -- Get course tenant & validate
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN 
        RAISE EXCEPTION 'Course not found';
    END IF;

    IF v_tenant_id != v_user_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

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
        avg_quiz_score, lesson_completion_rate, quiz_pass_rate, at_risk_count, last_calculated_at, updated_at
    )
    VALUES (
        v_tenant_id, p_course_id, v_total_enrolled, v_active_students, v_avg_progress,
        v_avg_quiz_score, v_lesson_completion_rate, v_quiz_pass_rate, v_at_risk_count, now(), now()
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
        updated_at = now();
END;
$$;

-- get_question_difficulty
CREATE OR REPLACE FUNCTION public.get_question_difficulty(p_quiz_id uuid)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  question_position integer,
  correct_count bigint,
  total_attempts bigint,
  difficulty_percent numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_role text;
BEGIN
  v_role := auth.jwt() ->> 'role';
  IF v_role NOT IN ('teacher', 'admin') THEN
    RAISE EXCEPTION 'Unauthorized role';
  END IF;

  RETURN QUERY
  SELECT
    qq.id AS question_id,
    qq.question_text,
    qq.position AS question_position,
    COUNT(DISTINCT qa.attempt_id) FILTER (WHERE qa.is_correct = true) AS correct_count,
    COUNT(DISTINCT qa.attempt_id) AS total_attempts,
    ROUND(
      COUNT(DISTINCT qa.attempt_id) FILTER (WHERE qa.is_correct = true)::numeric
      / NULLIF(COUNT(DISTINCT qa.attempt_id), 0) * 100, 1
    ) AS difficulty_percent
  FROM public.quiz_questions qq
  JOIN public.quiz_answers qa ON qa.question_id = qq.id
  JOIN public.quiz_attempts qat ON qat.id = qa.attempt_id
  WHERE qq.quiz_id = p_quiz_id
    AND qq.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND qat.status IN ('submitted', 'graded')
  GROUP BY qq.id, qq.question_text, qq.position
  ORDER BY qq.position ASC;
END;
$$;


-- 4. Add Debug Fields
ALTER TABLE public.course_stats
ADD COLUMN IF NOT EXISTS last_calculated_at timestamptz DEFAULT now();

ALTER TABLE public.course_progress
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT now();


-- 5. Create Progress Bundle RPC
-- Purpose: Optimize StudentProgress page (N+1 fix)
CREATE OR REPLACE FUNCTION public.get_student_progress_bundle(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id uuid;
    v_result jsonb;
BEGIN
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

    -- Basic check: user can only see their own progress unless teacher/admin
    IF auth.uid() != p_student_id AND (auth.jwt() ->> 'role') NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url)
            FROM public.user_profiles
            WHERE id = p_student_id
        ),
        'total_xp', (
            SELECT COALESCE(points, 0)
            FROM public.user_points
            WHERE user_id = p_student_id
            LIMIT 1
        ),
        'completed_lessons_count', (
            SELECT COUNT(*)
            FROM public.lesson_progress
            WHERE user_id = p_student_id AND completed = true
        ),
        'quiz_attempts', (
            SELECT jsonb_agg(d) FROM (
                SELECT id, quiz_id, score, created_at
                FROM public.quiz_attempts
                WHERE student_id = p_student_id
                ORDER BY created_at DESC
            ) d
        ),
        'achievements', (
            SELECT jsonb_agg(d) FROM (
                SELECT ub.id, ub.earned_at, b.name, b.icon
                FROM public.user_badges ub
                JOIN public.badges b ON b.id = ub.badge_id
                WHERE ub.user_id = p_student_id
                ORDER BY ub.earned_at DESC
            ) d
        ),
        'course_progress', (
            SELECT jsonb_agg(d) FROM (
                SELECT cp.id, cp.course_id, cp.total_lessons, cp.completed_lessons, cp.percentage, cp.last_activity_type, cp.last_activity_at, c.title
                FROM public.course_progress cp
                JOIN public.courses c ON c.id = cp.course_id
                WHERE cp.user_id = p_student_id
                ORDER BY cp.last_activity_at DESC NULLS LAST
            ) d
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
