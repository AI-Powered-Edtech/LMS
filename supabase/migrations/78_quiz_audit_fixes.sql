-- ============================================================
-- Migration 78: Quiz Engine Architecture Audit Fixes
-- Applies fixes for critical RLS flaws, data integrity mismatches,
-- and enables question shuffling.
-- ============================================================

SET search_path = public;

-- ────────────────────────────────────────────────────────────
-- 1. ADD attempt_seed TO V2 ATTEMPTS
-- ────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_attempts_v2' AND column_name = 'attempt_seed'
  ) THEN
    ALTER TABLE public.quiz_attempts_v2
      ADD COLUMN IF NOT EXISTS attempt_seed UUID DEFAULT gen_random_uuid();
  END IF;
END $$;

COMMENT ON COLUMN public.quiz_attempts_v2.attempt_seed IS 'Deterministic seed for shuffling questions/options within this attempt';

-- ────────────────────────────────────────────────────────────
-- 2. FIX RLS ON quiz_attempt_questions_v2
-- ────────────────────────────────────────────────────────────

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Students access own attempt questions" ON public.quiz_attempt_questions_v2;

-- Create correct policies bound to the attempt owner
CREATE POLICY "Students access own attempt questions"
ON public.quiz_attempt_questions_v2
FOR SELECT
USING (
  tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM public.quiz_attempts_v2 a
    WHERE a.id = quiz_attempt_questions_v2.attempt_id
    AND a.student_id = auth.uid()
  )
);

CREATE POLICY "Students insert own attempt questions"
ON public.quiz_attempt_questions_v2
FOR INSERT
WITH CHECK (
  tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM public.quiz_attempts_v2 a
    WHERE a.id = quiz_attempt_questions_v2.attempt_id
    AND a.student_id = auth.uid()
  )
);

CREATE POLICY "Students update own attempt questions"
ON public.quiz_attempt_questions_v2
FOR UPDATE
USING (
  tenant_id = get_my_tenant_id()
  AND EXISTS (
    SELECT 1
    FROM public.quiz_attempts_v2 a
    WHERE a.id = quiz_attempt_questions_v2.attempt_id
    AND a.student_id = auth.uid()
  )
);

-- ────────────────────────────────────────────────────────────
-- 3. UPDATE v1_start_attempt FOR SHUFFLE & SEED
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.v1_start_attempt(
    p_quiz_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_new_attempt_id UUID := gen_random_uuid();
    v_attempt_seed UUID := gen_random_uuid();
    v_quiz RECORD;
    v_previous_attempts INTEGER;
    v_manifest UUID[];
    v_expires_at TIMESTAMPTZ;
    v_existing_attempt RECORD;
BEGIN
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found' USING ERRCODE = 'P0001';
    END IF;

    -- 1. Fetch Quiz Configuration & Ensure Eligibility
    SELECT id, mode, time_limit_minutes, max_attempts, available_from, available_until, status, shuffle_questions
    INTO v_quiz
    FROM public.quizzes
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002';
    END IF;

    -- Check if quiz is active
    IF v_quiz.available_from IS NOT NULL AND now() < v_quiz.available_from THEN
        RAISE EXCEPTION 'Quiz is not yet available' USING ERRCODE = 'P0003';
    END IF;
    IF v_quiz.available_until IS NOT NULL AND now() > v_quiz.available_until THEN
        RAISE EXCEPTION 'Quiz is no longer available' USING ERRCODE = 'P0004';
    END IF;

    -- Auto-abandon expired IN_PROGRESS attempts before checking
    UPDATE public.quiz_attempts_v2
    SET status = 'ABANDONED'
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'IN_PROGRESS'
      AND expires_at < now();

    -- Enforce Attempt Limits
    SELECT COUNT(*) INTO v_previous_attempts
    FROM public.quiz_attempts_v2
    WHERE quiz_id = p_quiz_id AND student_id = v_student_id;

    IF v_quiz.max_attempts IS NOT NULL AND v_previous_attempts >= v_quiz.max_attempts THEN
        RAISE EXCEPTION 'Maximum attempts exceeded' USING ERRCODE = 'P0005';
    END IF;

    -- Check for existing active (non-expired) attempt — allow resume
    SELECT id, started_at, expires_at, question_manifest, attempt_number, attempt_seed
    INTO v_existing_attempt
    FROM public.quiz_attempts_v2 
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'IN_PROGRESS'
      AND expires_at >= now()
    LIMIT 1;

    IF v_existing_attempt.id IS NOT NULL THEN
        -- Return existing attempt for resume instead of error
        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'status', 'IN_PROGRESS',
            'recovered', true,
            'started_at', v_existing_attempt.started_at,
            'expires_at', v_existing_attempt.expires_at,
            'question_manifest', v_existing_attempt.question_manifest,
            'attempt_number', v_existing_attempt.attempt_number,
            'attempt_seed', v_existing_attempt.attempt_seed,
            'is_adaptive', false
        );
    END IF;

    -- 2. Build the Snapshot Manifest from quiz_questions (with deterministic shuffle if enabled)
    IF COALESCE(v_quiz.shuffle_questions, false) THEN
        SELECT ARRAY(
            SELECT id FROM public.quiz_questions 
            WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id
            ORDER BY md5(id::text || v_attempt_seed::text) ASC
        ) INTO v_manifest;
    ELSE
        SELECT ARRAY(
            SELECT id FROM public.quiz_questions 
            WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id
            ORDER BY "order" ASC
        ) INTO v_manifest;
    END IF;

    -- 3. Calculate Expiration
    IF v_quiz.time_limit_minutes IS NOT NULL AND v_quiz.time_limit_minutes > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        v_expires_at := now() + interval '24 hours';
    END IF;

    -- 4. Insert V2 Attempt
    INSERT INTO public.quiz_attempts_v2 (
        id, tenant_id, quiz_id, student_id, started_at, status, 
        expires_at, question_manifest, attempt_number, attempt_seed
    )
    VALUES (
        v_new_attempt_id, v_tenant_id, p_quiz_id, v_student_id, now(), 'IN_PROGRESS', 
        v_expires_at, v_manifest, v_previous_attempts + 1, v_attempt_seed
    );

    -- Return API Contract matched payload
    RETURN jsonb_build_object(
        'attempt_id', v_new_attempt_id,
        'status', 'IN_PROGRESS',
        'recovered', false,
        'started_at', now(),
        'expires_at', v_expires_at,
        'question_manifest', v_manifest,
        'attempt_number', v_previous_attempts + 1,
        'attempt_seed', v_attempt_seed,
        'is_adaptive', false
    );
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. CLEANUP OLD GRADING SYSTEMS
-- ────────────────────────────────────────────────────────────

-- Drop the legacy v1 sync grading functions to ensure only async is used.
DROP FUNCTION IF EXISTS public.submit_quiz_attempt(UUID, JSONB);
DROP FUNCTION IF EXISTS public.submit_quiz_attempt(UUID, JSONB, INTEGER);

-- ────────────────────────────────────────────────────────────
-- 5. ADD TEACHER RLS POLICIES FOR V2 QUIZ ATTEMPTS
-- ────────────────────────────────────────────────────────────

-- 1. Create policy on quiz_attempts_v2 for teachers
DROP POLICY IF EXISTS "Teachers view attempts for their classes" ON public.quiz_attempts_v2;
CREATE POLICY "Teachers view attempts for their classes"
ON public.quiz_attempts_v2
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM quizzes q
    JOIN classes c ON c.id = q.class_id
    WHERE q.id = quiz_attempts_v2.quiz_id
      AND c.teacher_id = auth.uid()
  )
);

-- 2. Create policy on quiz_attempt_questions_v2 for teachers
DROP POLICY IF EXISTS "Teachers view attempt answers for their classes" ON public.quiz_attempt_questions_v2;
CREATE POLICY "Teachers view attempt answers for their classes"
ON public.quiz_attempt_questions_v2
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM quiz_attempts_v2 a
    JOIN quizzes q ON q.id = a.quiz_id
    JOIN classes c ON c.id = q.class_id
    WHERE a.id = quiz_attempt_questions_v2.attempt_id
      AND c.teacher_id = auth.uid()
  )
);
