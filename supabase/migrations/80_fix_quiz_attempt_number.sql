-- Fix v1_start_quiz_attempt to calculate attempt_number correctly
-- Prevents duplicate key value violates unique constraint "uq_quiz_student_attempt"

SET search_path = public;

CREATE OR REPLACE FUNCTION public.v1_start_quiz_attempt(p_quiz_id UUID)
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
    v_attempt_number INTEGER;
    v_max_attempts INTEGER;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Ensure quiz exists and belongs to the tenant
    SELECT * INTO v_quiz 
    FROM public.quizzes 
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0001';
    END IF;

    -- Guard 1: Return existing attempt if in_progress and not expired
    SELECT id, status, started_at, expires_at INTO v_existing_attempt
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'IN_PROGRESS';

    IF v_existing_attempt.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'status', v_existing_attempt.status,
            'recovered', true,
            'started_at', v_existing_attempt.started_at,
            'expires_at', v_existing_attempt.expires_at
        );
    END IF;

    -- Calculate next attempt_number
    SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_attempt_number
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id AND student_id = v_student_id;
    
    -- Check max attempts guard
    v_max_attempts := COALESCE(v_quiz.max_attempts, 3);
    IF v_attempt_number > v_max_attempts AND v_max_attempts > 0 THEN
        RAISE EXCEPTION 'Maximum attempts reached' USING ERRCODE = 'P0005';
    END IF;

    -- Calculate Expiration
    IF v_quiz.time_limit_minutes > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        -- Default to 24 hours if no time limit
        v_expires_at := now() + INTERVAL '24 hours';
    END IF;

    -- Create New Attempt
    INSERT INTO public.quiz_attempts (
        quiz_id, student_id, tenant_id, status, started_at, expires_at, attempt_seed, attempt_number
    ) VALUES (
        p_quiz_id, v_student_id, v_tenant_id, 'IN_PROGRESS', now(), v_expires_at, gen_random_uuid(), v_attempt_number
    ) RETURNING id INTO v_attempt_id;

    -- Snapshot Questions (With Randomization/Shuffling)
    -- We order by random() seeded by the attempt_seed if needed, or just random() 
    INSERT INTO public.quiz_attempt_questions (
        attempt_id, question_id, tenant_id, text, explanation, order_index, question_type, points_earned, max_points
    )
    SELECT 
        v_attempt_id,
        id,
        v_tenant_id,
        text,
        explanation,
        row_number() OVER (ORDER BY random()) AS order_index,
        question_type,
        0,
        points
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id
    AND tenant_id = v_tenant_id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'IN_PROGRESS',
        'recovered', false,
        'attempt_number', v_attempt_number,
        'started_at', now(),
        'expires_at', v_expires_at
    );
END;
$$;
