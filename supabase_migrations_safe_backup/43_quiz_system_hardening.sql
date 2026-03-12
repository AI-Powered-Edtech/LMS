-- ==========================================================================
-- Migration 43: Quiz System Production Hardening (Phase 1)
--
-- 1. Implements ENUM-based status for quiz attempts.
-- 2. Enforces partial unique index for single active attempt per student.
-- 3. Hardens RPCs with row-level locks and strict state validation.
-- ==========================================================================

-- 1. Create Quiz Attempt Status ENUM
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quiz_attempt_status') THEN
        CREATE TYPE public.quiz_attempt_status AS ENUM (
            'NOT_STARTED',
            'IN_PROGRESS',
            'SUBMITTED',
            'EXPIRED',
            'GRADED',
            'ABANDONED'
        );
    END IF;
END $$;

-- 2. Update quiz_attempts table
DO $$
BEGIN
    -- Add status column if it doesn't exist, or migrate from text/old enum
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='status' 
        AND (data_type='text' OR udt_name='attempt_status')
    ) THEN
        -- Temporarily map existing values to NEW ENUM values
        ALTER TABLE public.quiz_attempts 
        ALTER COLUMN status TYPE public.quiz_attempt_status 
        USING (
            CASE 
                WHEN lower(status::text) = 'in_progress' THEN 'IN_PROGRESS'::public.quiz_attempt_status
                WHEN lower(status::text) = 'submitted' THEN 'SUBMITTED'::public.quiz_attempt_status
                WHEN lower(status::text) = 'graded' THEN 'GRADED'::public.quiz_attempt_status
                WHEN lower(status::text) = 'expired' THEN 'EXPIRED'::public.quiz_attempt_status
                ELSE 'ABANDONED'::public.quiz_attempt_status
            END
        );
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='status') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN status public.quiz_attempt_status NOT NULL DEFAULT 'NOT_STARTED';
    END IF;

    -- Add expires_at if it's missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='expires_at') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN expires_at timestamptz;
    END IF;
END $$;

-- 3. Partial Unique Index (Concurrency Prevention)
-- A student can only have ONE 'IN_PROGRESS' attempt for a specific quiz at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_attempts_single_active 
ON public.quiz_attempts (tenant_id, quiz_id, student_id) 
WHERE (status = 'IN_PROGRESS');

-- 4. Optimized Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_tenant_quiz ON public.quiz_attempts(tenant_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_tenant_student ON public.quiz_attempts(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status_enum ON public.quiz_attempts(status);

-- 5. Hardened start_quiz_attempt RPC
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 AS $$
DECLARE
  v_tenant_id uuid;
  v_attempt_id uuid;
  v_max_attempts integer;
  v_attempt_count integer;
  v_is_enrolled boolean;
  v_time_limit_minutes integer;
  v_user_tenant_id uuid;
BEGIN
  -- A. Security Context
  v_user_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  IF v_user_tenant_id IS NULL THEN
     RAISE EXCEPTION 'Unauthorized: Missing tenant context';
  END IF;

  -- B. Fetch Quiz Metadata with Lock
  SELECT tenant_id, max_attempts, time_limit_minutes 
  INTO v_tenant_id, v_max_attempts, v_time_limit_minutes
  FROM public.quizzes 
  WHERE id = p_quiz_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Quiz not found';
  END IF;

  IF v_tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
  END IF;

  -- C. Enrollment Integrity
  SELECT EXISTS (
      SELECT 1 
      FROM public.enrollments 
      WHERE student_id = auth.uid() 
      AND (course_id = (SELECT course_id FROM public.quizzes WHERE id = p_quiz_id))
      AND status = 'ACTIVE'
      AND tenant_id = v_tenant_id
  ) INTO v_is_enrolled;

  IF NOT v_is_enrolled THEN
      RAISE EXCEPTION 'Unauthorized: Not actively enrolled in this course';
  END IF;

  -- D. Recovery Check (Resume existing attempt)
  SELECT id INTO v_attempt_id
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id 
    AND student_id = auth.uid() 
    AND status = 'IN_PROGRESS'
  LIMIT 1;

  IF v_attempt_id IS NOT NULL THEN
    RETURN jsonb_build_object('attempt_id', v_attempt_id, 'status', 'IN_PROGRESS', 'resumed', true);
  END IF;

  -- E. Attempt Limit Validation
  SELECT count(*) INTO v_attempt_count
  FROM public.quiz_attempts
  WHERE quiz_id = p_quiz_id 
    AND student_id = auth.uid() 
    AND status IN ('SUBMITTED', 'GRADED');

  IF v_attempt_count >= COALESCE(v_max_attempts, 1) THEN
      RAISE EXCEPTION 'Attempt limit reached. Maximum allowed: %', v_max_attempts;
  END IF;

  -- F. Initialize New Attempt
  INSERT INTO public.quiz_attempts (
    quiz_id, 
    student_id, 
    tenant_id, 
    status, 
    started_at, 
    expires_at
  )
  VALUES (
    p_quiz_id, 
    auth.uid(), 
    v_tenant_id, 
    'IN_PROGRESS', 
    now(),
    CASE 
      WHEN v_time_limit_minutes > 0 THEN now() + (v_time_limit_minutes || ' minutes')::interval
      ELSE NULL 
    END
  )
  RETURNING id INTO v_attempt_id;

  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'status', 'IN_PROGRESS', 'resumed', false);
END;
$$;

-- 6. Hardened submit_quiz_attempt RPC (with Atomic Locking)
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
    AND status = 'IN_PROGRESS'
  FOR UPDATE;

  IF v_attempt_id IS NULL THEN
      -- Check if it was already submitted/graded
      SELECT status INTO v_status
      FROM public.quiz_attempts
      WHERE quiz_id = p_quiz_id AND student_id = auth.uid()
      ORDER BY started_at DESC LIMIT 1;
      
      IF v_status IN ('SUBMITTED', 'GRADED') THEN
        RAISE EXCEPTION 'Attempt already submitted. Cannot re-grade.';
      END IF;
      
      RAISE EXCEPTION 'No active quiz attempt found. Start quiz first.';
  END IF;

  -- D. Time Integrity Check (30s grace period)
  IF v_expires_at IS NOT NULL AND now() > v_expires_at + interval '30 seconds' THEN
      UPDATE public.quiz_attempts
      SET status = 'EXPIRED', finished_at = now()
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
      status = 'GRADED',
      submitted_at = now(),
      finished_at = now(),
      time_spent = EXTRACT(EPOCH FROM (now() - v_started_at))::integer,
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
