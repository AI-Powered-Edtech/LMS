-- Fix quiz submission column error
-- Relates to 43_migration.sql where time_spent was incorrectly used instead of duration_seconds

CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
DECLARE
  v_tenant_id uuid;
  v_user_tenant_id uuid;
  v_attempt_id uuid;
  v_started_at timestamptz;
  v_expires_at timestamptz;
  v_status public.quiz_attempt_status;
  
  -- Grading vars
  v_total_questions int := 0;
  v_correct_answers int := 0;
  v_score float8 := 0;
  v_passed boolean := false;
  v_passing_score int;
  
  answer_record record;
  v_is_correct boolean;
  v_option_id uuid;
  v_question_id uuid;
BEGIN
  -- A. Get User Tenant ID
  v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  
  -- B. Get Quiz Config
  SELECT tenant_id, passing_score 
  INTO v_tenant_id, v_passing_score
  FROM public.quizzes
  WHERE id = p_quiz_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  IF v_tenant_id != v_user_tenant_id THEN
     RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
  END IF;

  -- C. Fetch and LOCK the attempt record to prevent race conditions
  -- Use FOR UPDATE to block other concurrent submissions for this specific attempt
  SELECT id, status, started_at, expires_at 
  INTO v_attempt_id, v_status, v_started_at, v_expires_at
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id 
    AND student_id = auth.uid()
    AND status = 'in_progress'
  FOR UPDATE;

  IF v_attempt_id IS NULL THEN
      -- Check if it was already submitted/graded
      SELECT status INTO v_status
      FROM public.quiz_attempts
      WHERE quiz_id = p_quiz_id AND student_id = auth.uid()
      ORDER BY started_at DESC LIMIT 1;
      
      IF v_status IN ('submitted', 'graded') THEN
        RAISE EXCEPTION 'Attempt already submitted. Cannot re-grade.';
      END IF;
      
      RAISE EXCEPTION 'No active quiz attempt found. Start quiz first.';
  END IF;

  -- D. Time Integrity Check (30s grace period)
  IF v_expires_at IS NOT NULL AND now() > v_expires_at + interval '30 seconds' THEN
      UPDATE public.quiz_attempts
      SET status = 'expired', finished_at = now()
      WHERE id = v_attempt_id;
      
      RAISE EXCEPTION 'Time limit exceeded. Attempt marked as EXPIRED.';
  END IF;

  -- E. Atomic Grading Pipeline
  FOR answer_record IN SELECT * FROM jsonb_to_recordset(p_answers) AS x(question_id uuid, option_id uuid)
  LOOP
      v_question_id := answer_record.question_id;
      v_option_id := answer_record.option_id;

      SELECT is_correct INTO v_is_correct
      FROM public.quiz_options
      WHERE id = v_option_id 
        AND question_id = v_question_id 
        AND tenant_id = v_tenant_id;

      IF COALESCE(v_is_correct, false) THEN
          v_correct_answers := v_correct_answers + 1;
      END IF;

      -- Use idempotency for question-level answers
      -- Note: Constraint quiz_answers_attempt_id_question_id_key was added in migration 59
      INSERT INTO public.quiz_answers (tenant_id, attempt_id, question_id, option_id, is_correct)
      VALUES (v_tenant_id, v_attempt_id, v_question_id, v_option_id, COALESCE(v_is_correct, false))
      ON CONFLICT (attempt_id, question_id) 
      DO UPDATE SET option_id = EXCLUDED.option_id, is_correct = EXCLUDED.is_correct;

      v_total_questions := v_total_questions + 1;
  END LOOP;

  -- F. Calculate Metrics
  IF v_total_questions > 0 THEN
      v_score := round(((v_correct_answers::float / v_total_questions::float) * 100)::numeric, 2);
  END IF;

  v_passed := v_score >= COALESCE(v_passing_score, 70);

  -- G. Final Transition
  UPDATE public.quiz_attempts
  SET
      score = v_score,
      status = 'graded',
      submitted_at = now(),
      finished_at = now(),
      duration_seconds = EXTRACT(EPOCH FROM (now() - v_started_at))::integer,
      passed = v_passed,
      answers = p_answers
  WHERE id = v_attempt_id;

  RETURN jsonb_build_object(
      'attempt_id', v_attempt_id,
      'score', v_score,
      'passed', v_passed,
      'correct_answers', v_correct_answers,
      'total_questions', v_total_questions
  );
END;
$$;
