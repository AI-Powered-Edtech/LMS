-- 70_quiz_engine_critical_fixes.sql
-- Migration to harden the Quiz Engine based on architectural review.

-- 1. Schema Migration: Link quiz_questions directly to question_bank
ALTER TABLE public.quiz_questions
ADD COLUMN IF NOT EXISTS question_bank_id UUID REFERENCES public.question_bank(id) ON DELETE RESTRICT;

-- Index for performance when querying a quiz's questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_bank
ON public.quiz_questions(question_bank_id);

-- Unique constraint to prevent duplicate questions in the same quiz
ALTER TABLE public.quiz_questions
DROP CONSTRAINT IF EXISTS unique_quiz_question; -- ensure idempotency if running down/up

ALTER TABLE public.quiz_questions
ADD CONSTRAINT unique_quiz_question
UNIQUE (quiz_id, question_bank_id);

-- 2. Update `add_question_to_quiz` to use the new reference
DROP FUNCTION IF EXISTS public.add_question_to_quiz(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.add_question_to_quiz(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.add_question_to_quiz(
    p_quiz_id UUID,
    p_question_bank_id UUID,
    p_order INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_quiz public.quizzes;
    v_question public.question_bank;
    v_new_quiz_question public.quiz_questions;
BEGIN
    -- Authorization & validation
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
    IF v_quiz IS NULL THEN
        RAISE EXCEPTION 'Quiz not found';
    END IF;

    -- Ensure the user owns the tenant
    IF v_quiz.tenant_id != (auth.jwt() ->> 'tenant_id')::uuid THEN
        RAISE EXCEPTION 'Unauthorized: Tenant mismatch';
    END IF;

    -- Fetch the question
    SELECT * INTO v_question FROM public.question_bank WHERE id = p_question_bank_id AND tenant_id = v_quiz.tenant_id;
    IF v_question IS NULL THEN
         RAISE EXCEPTION 'Question not found in the tenant bank';
    END IF;

    -- Insert the reference into quiz_questions
    INSERT INTO public.quiz_questions (
        quiz_id,
        tenant_id,
        "order",
        question_bank_id,
        -- provide a fallback for text as it is NOT NULL currently, we'll populate it with preview text
        text
    )
    VALUES (
        p_quiz_id,
        v_quiz.tenant_id,
        p_order,
        p_question_bank_id,
        v_question.question_text
    )
    RETURNING * INTO v_new_quiz_question;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Question added to quiz successfully',
        'quiz_question_id', v_new_quiz_question.id
    );
END;
$$;

-- 3. Security Hardening: Apply ownership check to cheating signals
DROP FUNCTION IF EXISTS public.record_cheating_signal(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_cheating_signal(
    p_attempt_id UUID,
    p_signal_type TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_attempt public.quiz_attempts;
    v_signal_id UUID;
BEGIN
    -- Ensure the attempt exists AND belongs to the authenticated user
    SELECT * INTO v_attempt 
    FROM public.quiz_attempts 
    WHERE id = p_attempt_id;

    IF v_attempt IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;
    
    -- HARDENING: Ownership check
    IF v_attempt.student_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: Cannot record signal for another user''s attempt';
    END IF;

    -- Validate signal type
    IF p_signal_type NOT IN ('TAB_SWITCH', 'WINDOW_BLUR', 'COPY_PASTE', 'MULTIPLE_FACES', 'NO_FACE', 'DEVICE_CHANGE') THEN
         RAISE EXCEPTION 'Invalid signal type: %', p_signal_type;
    END IF;

    -- Insert the cheating event
    INSERT INTO public.quiz_cheating_events (
        tenant_id,
        attempt_id,
        student_id,
        signal_type,
        metadata
    )
    VALUES (
        v_attempt.tenant_id,
        p_attempt_id,
        v_attempt.student_id,
        p_signal_type,
        p_metadata
    )
    RETURNING id INTO v_signal_id;

    -- Optionally, we could choose to automatically terminate the attempt here based on strictness rules
    -- UPDATE public.quiz_attempts SET status = 'terminated', finished_at = now() WHERE id = p_attempt_id

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Cheating signal recorded',
        'signal_id', v_signal_id
    );
END;
$$;

-- 4. Optimistic Locking: start_quiz_attempt must return the version
DROP FUNCTION IF EXISTS public.start_quiz_attempt(UUID);

CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_quiz public.quizzes;
    v_attempt_id uuid;
    v_tenant_id uuid;
    v_student_id uuid;
    v_existing_attempt public.quiz_attempts;
    v_questions jsonb;
BEGIN
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
    IF v_quiz IS NULL THEN
        RAISE EXCEPTION 'Quiz not found';
    END IF;
    v_tenant_id := v_quiz.tenant_id;

    -- Check for an existing IN_PROGRESS attempt
    SELECT * INTO v_existing_attempt 
    FROM public.quiz_attempts 
    WHERE quiz_id = p_quiz_id 
      AND student_id = v_student_id 
      AND status = 'in_progress';

    IF v_existing_attempt IS NOT NULL THEN
        -- Check if it should be expired
        IF v_quiz.time_limit_minutes IS NOT NULL THEN
             IF v_existing_attempt.started_at + (v_quiz.time_limit_minutes || ' minutes')::interval < now() THEN
                 -- Auto-submit expired
                 UPDATE public.quiz_attempts 
                 SET status = 'submitted', finished_at = now() 
                 WHERE id = v_existing_attempt.id;
                 
                 RAISE EXCEPTION 'Previous attempt has expired and was auto-submitted';
             END IF;
        END IF;

        -- Return the recovered attempt WITH the version for optimistic locking
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Recovered existing attempt',
            'attempt_id', v_existing_attempt.id,
            'status', v_existing_attempt.status,
            'started_at', v_existing_attempt.started_at,
            'version', v_existing_attempt.version,
            'is_new', false
        );
    END IF;

    -- Enforce max_attempts if set
    IF v_quiz.max_attempts IS NOT NULL THEN
        DECLARE
            v_attempt_count int;
        BEGIN
            SELECT COUNT(*) INTO v_attempt_count 
            FROM public.quiz_attempts 
            WHERE quiz_id = p_quiz_id AND student_id = v_student_id;
            
            IF v_attempt_count >= v_quiz.max_attempts THEN
                RAISE EXCEPTION 'Maximum attempts reached for this quiz';
            END IF;
        END;
    END IF;

    -- Snapshot the questions from the question_bank via the quiz_questions link
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', qb.id, -- We use the question bank ID for the snapshot
            'text', qb.question_text,
            'order', qq."order",
            'type', qb.question_type,
            'options', (
                 SELECT jsonb_agg(
                     jsonb_build_object(
                         'id', qo.id,
                         'text', qo.option_text,
                         'is_correct', qo.is_correct
                     )
                 )
                 FROM public.question_bank_options qo
                 WHERE qo.question_id = qb.id
            )
        ) ORDER BY qq."order" ASC
    ) INTO v_questions
    FROM public.quiz_questions qq
    JOIN public.question_bank qb ON qq.question_bank_id = qb.id
    WHERE qq.quiz_id = p_quiz_id;

    IF v_questions IS NULL OR jsonb_array_length(v_questions) = 0 THEN
         RAISE EXCEPTION 'Quiz has no questions';
    END IF;

    -- Optional: Shuffle logic could be applied here to v_questions if v_quiz.shuffle_questions is true

    -- Insert the new attempt
    INSERT INTO public.quiz_attempts (
        quiz_id,
        tenant_id,
        student_id,
        status,
        started_at
        -- attempt_number is handled by default or trigger if it exists
    )
    VALUES (
        p_quiz_id,
        v_tenant_id,
        v_student_id,
        'in_progress',
        now()
    )
    RETURNING id INTO v_attempt_id;
    
    -- Store the snapshots
    -- Given that quiz_attempt_questions needs standard relational mapping:
    INSERT INTO public.quiz_attempt_questions (
        attempt_id,
        tenant_id,
        question_id,
        question_snapshot,
        "order"
    )
    SELECT 
        v_attempt_id,
        v_tenant_id,
        (q->>'id')::uuid,
        q,
        (q->>'order')::int
    FROM jsonb_array_elements(v_questions) as q;

    -- Return the newly created attempt, assuming a fresh insert has version 1 (or 0 depending on the trigger logic)
    -- We perform a select to ensure we return the DB-assigned version (e.g., if a trigger initializes it).
    DECLARE 
        v_final_version INT;
    BEGIN
        SELECT version INTO v_final_version FROM public.quiz_attempts WHERE id = v_attempt_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'New attempt started',
            'attempt_id', v_attempt_id,
            'status', 'in_progress',
            'started_at', now(),
            'version', COALESCE(v_final_version, 1),
            'is_new', true
        );
    END;
END;
$$;
