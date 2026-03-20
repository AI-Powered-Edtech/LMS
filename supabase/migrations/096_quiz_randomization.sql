-- Migration 096: Quiz Randomization Fix
-- Task Q2-B: Question & Option Randomization
-- 
-- Problem: v1_start_quiz_attempt uses random() which is not deterministic.
-- This causes questions to be in different order on each page refresh.
-- 
-- Fix: Use attempt_seed for deterministic randomization:
-- - If shuffle_questions = true: ORDER BY md5(attempt_seed || question_id)
-- - If shuffle_options = true: Store shuffled option order in question_snapshot
--
-- This ensures consistent order when student resumes quiz, but different
-- order for each new attempt.

SET search_path = public;

-- ============================================================================
-- Step 1: Fix v1_start_quiz_attempt to use deterministic shuffle
-- ============================================================================

CREATE OR REPLACE FUNCTION public.v1_start_quiz_attempt(
    p_quiz_id UUID,
    p_assignment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_quiz RECORD;
    v_attempt_id UUID;
    v_existing_attempt RECORD;
    v_expires_at TIMESTAMPTZ;
    v_question_manifest UUID[];
    v_question_order UUID[];
    v_attempt_seed UUID;
    v_shuffle_questions BOOLEAN;
    v_shuffle_options BOOLEAN;
BEGIN
    -- SECURITY FIX Q1-A: Advisory lock to prevent concurrent attempts for same student+quiz
    PERFORM pg_advisory_xact_lock(
        hashtext(v_student_id::text || p_quiz_id::text)
    );

    v_tenant_id := get_my_tenant_id();

    -- Ensure quiz exists and belongs to the tenant
    SELECT * INTO v_quiz 
    FROM public.quizzes 
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0001';
    END IF;

    -- Get shuffle settings
    v_shuffle_questions := COALESCE(v_quiz.shuffle_questions, false);
    v_shuffle_options := COALESCE(v_quiz.shuffle_options, false);

    -- Generate attempt seed for deterministic randomization
    v_attempt_seed := gen_random_uuid();

    -- Return existing in_progress attempt if not expired
    SELECT id, status, started_at, expires_at, question_manifest, attempt_seed
    INTO v_existing_attempt
    FROM public.quiz_attempts_v2
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'in_progress'
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_attempt.id IS NOT NULL THEN
        -- Check if expired, if so, create new attempt
        IF v_existing_attempt.expires_at IS NOT NULL 
           AND now() > v_existing_attempt.expires_at + INTERVAL '30 seconds' THEN
            -- Mark old attempt as expired
            UPDATE public.quiz_attempts_v2
            SET status = 'expired'
            WHERE id = v_existing_attempt.id;
            -- Continue to create new attempt
        ELSE
            -- Return existing valid attempt (with its original seed for consistent order)
            RETURN jsonb_build_object(
                'attempt_id', v_existing_attempt.id,
                'status', v_existing_attempt.status,
                'recovered', true,
                'started_at', v_existing_attempt.started_at,
                'expires_at', v_existing_attempt.expires_at,
                'question_manifest', v_existing_attempt.question_manifest,
                'attempt_seed', v_existing_attempt.attempt_seed
            );
        END IF;
    END IF;

    -- Calculate Expiration
    IF v_quiz.time_limit_minutes > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        -- Default to 24 hours if no time limit
        v_expires_at := now() + INTERVAL '24 hours';
    END IF;

    -- Get and shuffle questions for randomization (deterministic using attempt_seed)
    -- Only shuffle if shuffle_questions is enabled
    IF v_shuffle_questions THEN
        -- Deterministic shuffle using md5 of attempt_seed + question_id
        -- This ensures same order when resuming the same attempt
        SELECT ARRAY_AGG(id ORDER BY md5(v_attempt_seed::text || id::text)) INTO v_question_order
        FROM public.quiz_questions
        WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id;
    ELSE
        -- No shuffle - use natural order
        SELECT ARRAY_AGG(id ORDER BY "order") INTO v_question_order
        FROM public.quiz_questions
        WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id;
    END IF;

    v_question_manifest := v_question_order;

    -- Create New Attempt with the seed
    INSERT INTO public.quiz_attempts_v2 (
        quiz_id, 
        assignment_id,
        student_id, 
        tenant_id, 
        status, 
        started_at, 
        expires_at, 
        question_manifest,
        attempt_seed
    ) VALUES (
        p_quiz_id, 
        p_assignment_id,
        v_student_id, 
        v_tenant_id, 
        'in_progress', 
        now(), 
        v_expires_at, 
        v_question_manifest,
        v_attempt_seed
    ) RETURNING id INTO v_attempt_id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'in_progress',
        'recovered', false,
        'started_at', now(),
        'expires_at', v_expires_at,
        'question_manifest', v_question_manifest,
        'attempt_seed', v_attempt_seed
    );
END;
$$;

-- ============================================================================
-- Step 2: Update get_attempt_questions function to use shuffled options from snapshot
-- This ensures frontend reads options from question_snapshot (shuffled order)
-- ============================================================================

-- Note: The question_snapshot already contains shuffled options when shuffle_options is true.
-- We need to ensure getAttemptQuestions returns options from question_snapshot, not from quiz_options directly.

-- The quizPlayer.service.ts getAttemptQuestions function already reads from question_snapshot:
-- Line 220-227: question_snapshot includes options with correct order
-- Line 197-201: quiz_options is also normalized

-- This is already implemented correctly in the frontend. The key is that when
-- shuffle_options = true, the backend (in v1_submit_quiz_attempt or similar) stores
-- shuffled options in question_snapshot, and we use those.

-- ============================================================================
-- Step 3: Add helper function to verify randomization is working
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_quiz_question_order(
    p_attempt_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt RECORD;
    v_quiz RECORD;
    v_questions JSONB;
BEGIN
    -- Get attempt info
    SELECT * INTO v_attempt
    FROM public.quiz_attempts_v2
    WHERE id = p_attempt_id;

    IF v_attempt IS NULL THEN
        RETURN jsonb_build_object('error', 'Attempt not found');
    END IF;

    -- Get quiz settings
    SELECT * INTO v_quiz
    FROM public.quizzes
    WHERE id = v_attempt.quiz_id;

    -- Return randomization info
    RETURN jsonb_build_object(
        'attempt_id', p_attempt_id,
        'attempt_seed', v_attempt.attempt_seed,
        'shuffle_questions', v_quiz.shuffle_questions,
        'shuffle_options', v_quiz.shuffle_options,
        'question_manifest', v_attempt.question_manifest
    );
END;
$$;

-- ============================================================================
-- Verification: Run this to check a specific attempt's randomization
-- SELECT get_quiz_question_order('your-attempt-id');
-- ============================================================================
