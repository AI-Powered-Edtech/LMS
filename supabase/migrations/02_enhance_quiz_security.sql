-- Migration: Enhance Quiz Security for Production
-- Adds enrollment checks, time limit enforcement, attempt locks, and strict tenant isolation.

-- 1. Add new columns to quizzes if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='max_attempts') THEN
        ALTER TABLE public.quizzes ADD COLUMN max_attempts integer DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='passing_score') THEN
        ALTER TABLE public.quizzes ADD COLUMN passing_score integer DEFAULT 70;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='shuffle_questions') THEN
        ALTER TABLE public.quizzes ADD COLUMN shuffle_questions boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='shuffle_options') THEN
        ALTER TABLE public.quizzes ADD COLUMN shuffle_options boolean DEFAULT false;
    END IF;
    -- Note: time_limit_minutes already exists based on previous schema dump

    -- Ensure lesson_id relationship is prioritized for future structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='lesson_id') THEN
        ALTER TABLE public.quizzes ADD COLUMN lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Enhanced start_quiz_attempt RPC
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_course_id uuid;
  v_class_id uuid;
  v_attempt_id uuid;
  v_existing_status attempt_status;
  v_attempt_count integer;
  v_max_attempts integer;
  v_is_enrolled boolean;
  v_user_tenant_id uuid;
BEGIN
  -- A. Get User Tenant ID from JWT for strict isolation
  v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  IF v_user_tenant_id IS NULL THEN
     RAISE EXCEPTION 'Unauthorized: Missing tenant context';
  END IF;

  -- B. Get Quiz Details & Verify Tenant
  SELECT tenant_id, class_id, course_id, max_attempts 
  INTO v_tenant_id, v_class_id, v_course_id, v_max_attempts
  FROM public.quizzes 
  WHERE id = p_quiz_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  IF v_tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
  END IF;

  -- C. Enrollment Check
  -- Verify student is actively enrolled in the class associated with this quiz/course
  SELECT EXISTS (
      SELECT 1 
      FROM public.enrollments 
      WHERE student_id = auth.uid() 
      AND (class_id = v_class_id OR class_id IN (SELECT id FROM public.classes WHERE course_id = v_course_id))
      AND status = 'ACTIVE'
      AND tenant_id = v_tenant_id
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
      RAISE EXCEPTION 'Unauthorized: Not actively enrolled in this class/course';
  END IF;

  -- D. Check for existing 'in_progress' attempt
  SELECT id, status INTO v_attempt_id, v_existing_status
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid() AND status = 'in_progress'
  LIMIT 1;

  IF v_attempt_id IS NOT NULL THEN
    RETURN jsonb_build_object('attempt_id', v_attempt_id, 'status', v_existing_status);
  END IF;

  -- E. Attempt Limit Detection
  SELECT count(*) INTO v_attempt_count
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id AND student_id = auth.uid() AND status IN ('submitted', 'graded');

  IF v_attempt_count >= COALESCE(v_max_attempts, 1) THEN
      RAISE EXCEPTION 'Attempt limit reached. Maximum allowed: %', v_max_attempts;
  END IF;

  -- F. Create new attempt
  INSERT INTO public.quiz_attempts (quiz_id, student_id, tenant_id, status, started_at)
  VALUES (p_quiz_id, auth.uid(), v_tenant_id, 'in_progress', now())
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'status', 'in_progress');
END;
$function$;


-- 3. Enhanced submit_quiz_attempt RPC
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_quiz_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_user_tenant_id uuid;
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
  SELECT tenant_id, passing_score, time_limit_minutes 
  INTO v_tenant_id, v_passing_score, v_time_limit_minutes
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
          SET status = 'expired', finished_at = now()
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
      answers = p_answers
  WHERE id = v_attempt_record.id;

  RETURN jsonb_build_object(
      'attempt_id', v_attempt_record.id,
      'score', v_score,
      'passed', v_passed,
      'correct_answers', v_correct_answers,
      'total_questions', v_total_questions
  );
END;
$function$;
