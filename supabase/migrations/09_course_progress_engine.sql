-- ==========================================================================
-- Migration 09: Course Progress Engine
--
-- Phase 3B: Database-first progress computation using triggers.
-- Adds `course_progress` table, `recompute_course_progress` RPC, and 
-- a trigger on `lesson_progress`.
-- Updates `quiz_attempts` to include `lesson_id` and `submit_quiz_attempt`
-- to feed into `lesson_progress`.
-- ==========================================================================

-- 1. Add `lesson_id` to `quiz_attempts` (User feedback: simplifies analytics)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='lesson_id') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Create `course_progress` table
CREATE TABLE IF NOT EXISTS public.course_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    total_lessons integer DEFAULT 0,
    completed_lessons integer DEFAULT 0,
    percentage numeric DEFAULT 0,
    last_activity_type text,           -- 'quiz', 'video', 'lesson'
    last_activity_at timestamptz DEFAULT now(),
    last_calculated_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_progress_tenant_user ON public.course_progress(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_tenant_course ON public.course_progress(tenant_id, course_id);

-- Enable RLS for course_progress
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course progress"
ON public.course_progress FOR SELECT
USING (auth.uid() = user_id AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Teachers can view tenant course progress"
ON public.course_progress FOR SELECT
USING (
  tenant_id = (auth.jwt() ->> 'tenant_id')::uuid 
  AND (auth.jwt() ->> 'role' IN ('teacher', 'admin'))
);

-- 3. RPC: recompute_course_progress
CREATE OR REPLACE FUNCTION public.recompute_course_progress(p_user_id uuid, p_course_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id uuid;
    v_total_lessons integer := 0;
    v_completed_lessons integer := 0;
    v_percentage numeric := 0;
    v_last_activity_type text;
    v_last_activity_at timestamptz;
BEGIN
    -- Get tenant_id from course
    SELECT tenant_id INTO v_tenant_id FROM public.courses WHERE id = p_course_id;
    IF v_tenant_id IS NULL THEN RETURN; END IF;

    -- Count total published lessons in the course
    SELECT COUNT(*) INTO v_total_lessons
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id
      AND l.status = 'published';

    -- Count completed lessons for this user in this course
    SELECT COUNT(*) INTO v_completed_lessons
    FROM public.lesson_progress lp
    JOIN public.lessons l ON l.id = lp.lesson_id
    JOIN public.modules m ON m.id = l.module_id
    WHERE m.course_id = p_course_id
      AND lp.user_id = p_user_id
      AND lp.completed = true;

    -- Calculate percentage
    IF v_total_lessons > 0 THEN
        v_percentage := ROUND((v_completed_lessons::numeric / v_total_lessons::numeric) * 100, 2);
    ELSE
        v_percentage := 0;
    END IF;

    -- Upsert course_progress
    INSERT INTO public.course_progress (
        tenant_id, course_id, user_id, total_lessons, completed_lessons, percentage, updated_at, last_calculated_at
    )
    VALUES (
        v_tenant_id, p_course_id, p_user_id, v_total_lessons, v_completed_lessons, v_percentage, now(), now()
    )
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET 
        total_lessons = EXCLUDED.total_lessons,
        completed_lessons = EXCLUDED.completed_lessons,
        percentage = EXCLUDED.percentage,
        last_calculated_at = now(),
        updated_at = now();
END;
$$;

-- 4. Trigger on lesson_progress
CREATE OR REPLACE FUNCTION public.recompute_course_progress_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_course_id uuid;
BEGIN
    -- Find course_id for this lesson
    SELECT m.course_id INTO v_course_id
    FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = NEW.lesson_id;

    IF v_course_id IS NOT NULL THEN
        PERFORM public.recompute_course_progress(NEW.user_id, v_course_id);
        
        -- Also update last_activity on existing course_progress (optional improvement)
        UPDATE public.course_progress
        SET last_activity_at = now()
            -- Could derive type based on lesson type if needed, omitting for simplicity
        WHERE user_id = NEW.user_id AND course_id = v_course_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lesson_progress_completed ON public.lesson_progress;
CREATE TRIGGER on_lesson_progress_completed
AFTER INSERT OR UPDATE OF completed
ON public.lesson_progress
FOR EACH ROW
WHEN (NEW.completed = true)
EXECUTE FUNCTION public.recompute_course_progress_trigger();


-- 5. Enhanced submit_quiz_attempt RPC (Replace existing)
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_user_tenant_id uuid;
  v_lesson_id uuid;
  v_attempt_record record;
  v_total_questions int := 0;
  v_correct_answers int := 0;
  v_score float8 := 0;
  v_passed boolean := false;
  v_passing_score int;
  v_time_limit_minutes int;
  answer_record record;
  v_is_correct boolean;
  v_option_id uuid;
  v_question_id uuid;
BEGIN
  -- A. Get User Tenant ID from JWT
  v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  
  -- B. Get Quiz Details & Validate Target
  SELECT tenant_id, passing_score, time_limit_minutes, lesson_id
  INTO v_tenant_id, v_passing_score, v_time_limit_minutes, v_lesson_id
  FROM public.quizzes
  WHERE id = p_quiz_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  IF v_tenant_id != v_user_tenant_id THEN
     RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
  END IF;

  -- C. Fetch In-Progress Attempt & ATTEMPT LOCK validation
  SELECT id, status, started_at 
  INTO v_attempt_record
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid()
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_attempt_record.id IS NULL THEN
      RAISE EXCEPTION 'No active quiz attempt found. Start quiz first.';
  END IF;

  -- REPLAY ATTACK & DOUBLE SUBMIT PREVENTION (Attempt Lock)
  IF v_attempt_record.status IN ('submitted', 'graded') THEN
      RAISE EXCEPTION 'Attempt already submitted. Cannot submit again.';
  END IF;

  IF v_attempt_record.status = 'expired' THEN
      RAISE EXCEPTION 'Attempt has already expired.';
  END IF;

  -- D. TIME LIMIT ENFORCEMENT
  IF v_time_limit_minutes IS NOT NULL AND v_time_limit_minutes > 0 THEN
      -- Add a 30-second grace period for network latency
      IF now() > v_attempt_record.started_at + (v_time_limit_minutes || ' minutes')::interval + interval '30 seconds' THEN
          
          UPDATE public.quiz_attempts
          SET status = 'expired', finished_at = now(), lesson_id = v_lesson_id
          WHERE id = v_attempt_record.id;

          RAISE EXCEPTION 'Time limit exceeded. Attempt expired.';
      END IF;
  END IF;

  -- E. Grading Logic (Transaction safe)
  FOR answer_record IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(question_id uuid, option_id uuid)
  LOOP
      v_question_id := answer_record.question_id;
      v_option_id := answer_record.option_id;

      -- Check option correctness ensuring it belongs to the same tenant and question to prevent spoofing
      SELECT is_correct INTO v_is_correct
      FROM public.quiz_options
      WHERE id = v_option_id 
        AND question_id = v_question_id 
        AND tenant_id = v_tenant_id;

      IF v_is_correct IS NULL THEN
          v_is_correct := false;
      END IF;

      IF v_is_correct THEN
          v_correct_answers := v_correct_answers + 1;
      END IF;

      -- Insert Answers idempotently (handling potential duplicates gracefully if needed, though locked by status above)
      INSERT INTO public.quiz_answers (tenant_id, attempt_id, question_id, option_id, is_correct)
      VALUES (v_tenant_id, v_attempt_record.id, v_question_id, v_option_id, v_is_correct)
      ON CONFLICT (attempt_id, question_id) 
      DO UPDATE SET option_id = EXCLUDED.option_id, is_correct = EXCLUDED.is_correct;

      v_total_questions := v_total_questions + 1;
  END LOOP;

  -- F. Calculate final outcome
  IF v_total_questions > 0 THEN
      v_score := (v_correct_answers::float / v_total_questions::float) * 100;
      v_score := round(v_score::numeric, 2); -- Keep 2 decimal places max
  END IF;

  IF v_passing_score IS NOT NULL THEN
      v_passed := v_score >= v_passing_score;
  ELSE
      v_passed := v_score >= 70;
  END IF;

  -- G. Finalize Attempt
  UPDATE public.quiz_attempts
  SET
      score = v_score,
      status = 'graded', -- Move straight to graded
      submitted_at = now(),
      finished_at = now(),
      time_spent = EXTRACT(EPOCH FROM (now() - started_at))::integer,
      passed = v_passed,
      answers = p_answers,
      lesson_id = v_lesson_id -- Populate new column
  WHERE id = v_attempt_record.id;

  -- H. Upsert lesson_progress (bridge for Phase 3B)
  IF v_lesson_id IS NOT NULL THEN
      INSERT INTO public.lesson_progress (tenant_id, user_id, lesson_id, completed, progress_percent, updated_at)
      VALUES (v_tenant_id, auth.uid(), v_lesson_id, true, 100, now())
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET 
          completed = true, 
          progress_percent = 100, 
          updated_at = now();
          
      -- Also update course_progress last_activity_type manually here
      -- Trigger will handle the percentage recomputation
      UPDATE public.course_progress cp
      SET last_activity_type = 'quiz'
      FROM public.lessons l
      JOIN public.modules m ON m.id = l.module_id
      WHERE cp.user_id = auth.uid() 
        AND l.id = v_lesson_id
        AND m.course_id = cp.course_id;
  END IF;

  RETURN jsonb_build_object(
      'attempt_id', v_attempt_record.id,
      'score', v_score,
      'passed', v_passed,
      'correct_answers', v_correct_answers,
      'total_questions', v_total_questions
  );
END;
$function$;
