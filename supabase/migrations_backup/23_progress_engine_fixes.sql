-- ==========================================================================
-- Migration 23: Progress Engine Race Condition Fixes
--
-- This migration addresses two critical issues found in the architectural 
-- audit of the Progress Tracking engine:
-- 1. Double-Submit Vulnerability in Quizzes (Adds FOR UPDATE lock)
-- 2. Redundant Trigger Firing on lesson_progress (Adds status check)
-- ==========================================================================

-- 1. Fix Redundant Trigger Execution (Performance Bottleneck)
-- The remote project uses 'lesson_progress_update_course_trigger' 
-- which calls 'trigger_update_course_progress()'.

-- Drop the original combined trigger
DROP TRIGGER IF EXISTS lesson_progress_update_course_trigger ON public.lesson_progress;
-- Drop potentially old names from codebase audit just in case
DROP TRIGGER IF EXISTS on_lesson_progress_completed ON public.lesson_progress;
DROP TRIGGER IF EXISTS on_lesson_progress_completed_insert ON public.lesson_progress;
DROP TRIGGER IF EXISTS on_lesson_progress_completed_update ON public.lesson_progress;

-- Recreate trigger for INSERT (only if status is completed)
CREATE TRIGGER lesson_progress_update_course_trigger_insert
AFTER INSERT
ON public.lesson_progress
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.trigger_update_course_progress();

-- Recreate trigger for UPDATE (only if status CHANGES to completed)
CREATE TRIGGER lesson_progress_update_course_trigger_update
AFTER UPDATE OF status
ON public.lesson_progress
FOR EACH ROW
WHEN (NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM NEW.status))
EXECUTE FUNCTION public.trigger_update_course_progress();


-- 2. Fix Double-Submit Vulnerability (Quiz RPC)
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
  -- CRITICAL FIX: Add FOR UPDATE to employ Row-level Locking, preventing double-submit race condition.
  SELECT id, status, started_at 
  INTO v_attempt_record
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid()
  ORDER BY started_at DESC
  LIMIT 1
  FOR UPDATE;

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
      INSERT INTO public.lesson_progress (tenant_id, user_id, lesson_id, completed, progress_percent, updated_at, status)
      VALUES (v_tenant_id, auth.uid(), v_lesson_id, true, 100, now(), 'completed')
      ON CONFLICT (user_id, lesson_id)
      DO UPDATE SET 
          completed = true, 
          progress_percent = 100, 
          updated_at = now(),
          status = 'completed';
          
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
