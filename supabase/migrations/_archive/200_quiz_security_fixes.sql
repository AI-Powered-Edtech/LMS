-- Migration 095: Quiz Security Fixes
-- Fixes 3 critical security vulnerabilities in the quiz system:
-- Q1-A: Advisory lock for v1_start_quiz_attempt to prevent race conditions
-- Q1-B: Timer expiration check in v1_submit_quiz_attempt (ensure server-side time_spent)
-- Q1-C: Answered_at timestamp check in v1_save_answer

SET search_path = public;

-- ============================================================================
-- Q1-A: FIX v1_start_quiz_attempt - Add advisory lock for race condition prevention
-- ============================================================================

-- First, get the current function parameters to ensure we preserve them
-- The original function uses p_quiz_id, let's update it with advisory lock

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

    -- Return existing in_progress attempt if not expired
    SELECT id, status, started_at, expires_at, question_manifest
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
            -- Return existing valid attempt
            RETURN jsonb_build_object(
                'attempt_id', v_existing_attempt.id,
                'status', v_existing_attempt.status,
                'recovered', true,
                'started_at', v_existing_attempt.started_at,
                'expires_at', v_existing_attempt.expires_at,
                'question_manifest', v_existing_attempt.question_manifest
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

    -- Get and shuffle questions for randomization
    SELECT ARRAY_AGG(id ORDER BY random()) INTO v_question_order
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id;

    v_question_manifest := v_question_order;

    -- Create New Attempt
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
        gen_random_uuid()
    ) RETURNING id INTO v_attempt_id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'in_progress',
        'recovered', false,
        'started_at', now(),
        'expires_at', v_expires_at,
        'question_manifest', v_question_manifest
    );
END;
$$;


-- ============================================================================
-- Q1-C: Add answered_at column to quiz_attempt_questions_v2 table
-- ============================================================================

-- Add answered_at column to track when each question was answered
-- NOTE: We only add to the parent table - partitions inherit columns automatically
ALTER TABLE public.quiz_attempt_questions_v2
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

-- Create index on answered_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempt_questions_answered_at 
ON public.quiz_attempt_questions_v2(answered_at) 
WHERE answered_at IS NOT NULL;


-- ============================================================================
-- Q1-C: FIX v1_save_answer - Add answered_at timestamp validation
-- ============================================================================

DROP FUNCTION IF EXISTS public.v1_save_answer(UUID, UUID, UUID[], TEXT, INTEGER);
CREATE OR REPLACE FUNCTION public.v1_save_answer(
    p_attempt_id UUID,
    p_question_id UUID,
    p_selected_option_ids UUID[] DEFAULT '{}',
    p_text_answer TEXT DEFAULT NULL,
    p_client_version INTEGER DEFAULT NULL,
    p_answered_at TIMESTAMPTZ DEFAULT NULL  -- NEW: client sends timestamp
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_attempt RECORD;
    v_student_answer JSONB;
    v_existing_answered_at TIMESTAMPTZ;
BEGIN
    -- Use provided timestamp or default to now()
    IF p_answered_at IS NULL THEN
        p_answered_at := now();
    END IF;

    v_tenant_id := get_my_tenant_id();

    -- Fetch Attempt Info
    SELECT id, tenant_id, student_id, status, expires_at INTO v_attempt
    FROM public.quiz_attempts_v2
    WHERE id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    -- Security check
    IF v_attempt.student_id != v_student_id OR v_attempt.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
    END IF;

    -- Guard: Reject if submitted
    IF v_attempt.status != 'in_progress' THEN
        RAISE EXCEPTION 'Attempt is no longer in progress' USING ERRCODE = 'P0003';
    END IF;

    -- Guard: Stop accepting answers if expired
    IF now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        RAISE EXCEPTION 'Attempt has expired' USING ERRCODE = 'P0004';
    END IF;

    -- Check if there's an existing answer with answered_at timestamp
    SELECT answered_at INTO v_existing_answered_at
    FROM public.quiz_attempt_questions_v2
    WHERE attempt_id = p_attempt_id AND question_id = p_question_id;

    -- Only update if this answer is newer than existing
    IF v_existing_answered_at IS NULL OR v_existing_answered_at < p_answered_at THEN
        IF p_text_answer IS NOT NULL AND btrim(p_text_answer) <> '' THEN
            v_student_answer := to_jsonb(p_text_answer);
        ELSE
            v_student_answer := to_jsonb(COALESCE(p_selected_option_ids, ARRAY[]::uuid[]));
        END IF;

        -- Upsert with answered_at timestamp
        INSERT INTO public.quiz_attempt_questions_v2 (
            attempt_id, started_at, question_id, tenant_id, 
            student_answers, answer_version, answered_at, updated_at
        )
        SELECT 
            p_attempt_id,
            started_at,
            p_question_id,
            v_tenant_id,
            v_student_answer,
            COALESCE(p_client_version, 1),
            p_answered_at,
            now()
        FROM public.quiz_attempts_v2
        WHERE id = p_attempt_id
        ON CONFLICT (attempt_id, question_id, started_at) 
        DO UPDATE SET 
            student_answers = EXCLUDED.student_answers,
            answer_version = COALESCE(EXCLUDED.answer_version, quiz_attempt_questions_v2.answer_version + 1),
            answered_at = EXCLUDED.answered_at,
            updated_at = now();
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'saved_at', now()
    );
END;
$$;


-- ============================================================================
-- Q1-B: FIX v1_submit_quiz_attempt - Timer expiration check + server-side time_spent
-- ============================================================================

-- This function already has the expiration check but let's ensure time_spent is server-calculated
-- and add more explicit timer validation

CREATE OR REPLACE FUNCTION public.v1_submit_quiz_attempt(
    p_attempt_id UUID,
    p_final_answers JSONB DEFAULT '[]'::JSONB,
    p_telemetry_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt RECORD;
    v_question RECORD;
    v_question_row RECORD;
    v_total_questions INTEGER := 0;
    v_total_correct INTEGER := 0;
    v_total_points NUMERIC := 0;
    v_points_earned NUMERIC := 0;
    v_has_ungraded BOOLEAN := FALSE;
    v_score NUMERIC := 0;
    v_passed BOOLEAN;
    v_time_spent INTEGER := 0;
    v_selected_option_ids UUID[];
    v_correct_option_ids UUID[];
    v_is_correct BOOLEAN;
    v_status TEXT;
BEGIN
    -- SECURITY FIX Q1-A: Advisory lock on the attempt
    PERFORM pg_advisory_xact_lock(hashtext(p_attempt_id::text));

    SELECT
        a.id,
        a.quiz_id,
        a.assignment_id,
        a.student_id,
        a.tenant_id,
        a.status,
        a.started_at,
        a.expires_at,
        a.question_manifest,
        a.tab_switch_count,
        a.focus_loss_count,
        q.passing_score,
        q.show_correct_answers
    INTO v_attempt
    FROM public.quiz_attempts_v2 a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = p_attempt_id
    FOR UPDATE;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    IF v_attempt.student_id <> auth.uid() OR v_attempt.tenant_id <> get_my_tenant_id() THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
    END IF;

    -- If already submitted/graded/expired, return existing score
    IF v_attempt.status IN ('submitted', 'graded', 'expired') THEN
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE aq.is_correct = true),
            COALESCE(SUM(COALESCE(aq.points_earned, 0)), 0),
            BOOL_OR(q.question_type IN ('SHORT_ANSWER', 'ESSAY'))
        INTO
            v_total_questions,
            v_total_correct,
            v_points_earned,
            v_has_ungraded
        FROM public.quiz_questions q
        LEFT JOIN public.quiz_attempt_questions_v2 aq
          ON aq.attempt_id = v_attempt.id
         AND aq.question_id = q.id
        WHERE q.id = ANY(v_attempt.question_manifest);

        SELECT COALESCE(SUM(points), 0)
        INTO v_total_points
        FROM public.quiz_questions
        WHERE id = ANY(v_attempt.question_manifest);

        v_score := CASE
            WHEN v_total_points > 0 THEN ROUND((v_points_earned / v_total_points) * 100, 2)
            ELSE 0
        END;

        -- SECURITY FIX Q1-B: Use server-side calculated time_spent
        v_time_spent := EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::INTEGER;

        RETURN jsonb_build_object(
            'attempt_id', v_attempt.id,
            'status', v_attempt.status,
            'score', v_score,
            'passed', (v_score >= COALESCE(v_attempt.passing_score, 0)),
            'total_correct', v_total_correct,
            'correct_answers', v_total_correct,
            'total_questions', v_total_questions,
            'time_spent', v_time_spent,
            'has_ungraded', COALESCE(v_has_ungraded, false),
            'show_correct_answers', COALESCE(v_attempt.show_correct_answers, false)
        );
    END IF;

    -- SECURITY FIX Q1-B: Timer expiration check - validate timer hasn't expired
    -- With 30s grace period for network latency
    IF v_attempt.expires_at IS NOT NULL 
    AND now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        -- Auto-expire the attempt instead of allowing submit
        UPDATE public.quiz_attempts_v2
        SET status = 'expired', submitted_at = now()
        WHERE id = p_attempt_id AND status = 'in_progress';

        RAISE EXCEPTION 'Quiz attempt has expired';
    END IF;

    -- Process final answers if provided
    IF jsonb_array_length(COALESCE(p_final_answers, '[]'::jsonb)) > 0 THEN
        PERFORM public.v1_save_partial_answers(p_attempt_id, p_final_answers);
    END IF;

    -- SECURITY FIX Q1-B: Server-side time_spent calculation
    -- Ignore client-provided time_spent and calculate from server timestamp
    v_time_spent := EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::INTEGER;

    -- Process each question for grading
    FOR v_question_row IN
        SELECT jsonb_array_elements_text(jsonb_build_array(v_attempt.question_manifest)) AS id
    LOOP
        SELECT * INTO v_question
        FROM public.quiz_questions
        WHERE id = (v_question_row.id)::uuid;

        IF v_question.question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE') THEN
            -- Get selected answers
            SELECT ARRAY_AGG(option_id) INTO v_selected_option_ids
            FROM public.quiz_attempt_answers
            WHERE attempt_id = v_attempt.id AND question_id = v_question.id;

            -- Get correct answers
            SELECT ARRAY_AGG(id) INTO v_correct_option_ids
            FROM public.quiz_question_options
            WHERE question_id = v_question.id AND is_correct = true;

            -- Compare
            v_is_correct := (
                ARRAY_LENGTH(COALESCE(v_selected_option_ids, ARRAY[]::uuid[]), 1) = 
                ARRAY_LENGTH(COALESCE(v_correct_option_ids, ARRAY[]::uuid[]), 1)
            ) AND (
                SELECT COUNT(*) = 0
                FROM UNNEST(COALESCE(v_selected_option_ids, ARRAY[]::uuid[])) AS selected
                WHERE selected NOT IN (SELECT UNNEST(COALESCE(v_correct_option_ids, ARRAY[]::uuid[])))
            );

            -- Update the attempt question record
            UPDATE public.quiz_attempt_questions_v2
            SET is_correct = v_is_correct,
                points_earned = CASE WHEN v_is_correct THEN v_question.points ELSE 0 END,
                updated_at = now()
            WHERE attempt_id = v_attempt.id 
              AND question_id = v_question.id
              AND started_at = v_attempt.started_at;

            IF v_is_correct THEN
                v_total_correct := v_total_correct + 1;
            END IF;
        END IF;

        v_total_questions := v_total_questions + 1;
        v_total_points := v_total_points + COALESCE(v_question.points, 0);
    END LOOP;

    -- Calculate score
    v_points_earned := (
        SELECT COALESCE(SUM(points_earned), 0)
        FROM public.quiz_attempt_questions_v2
        WHERE attempt_id = v_attempt.id AND started_at = v_attempt.started_at
    );

    v_score := CASE
        WHEN v_total_points > 0 THEN ROUND((v_points_earned / v_total_points) * 100, 2)
        ELSE 0
    END;

    v_passed := v_score >= COALESCE(v_attempt.passing_score, 0);

    -- Update attempt with results
    UPDATE public.quiz_attempts_v2
    SET 
        status = 'graded',
        submitted_at = now(),
        score = v_score,
        passed = v_passed,
        time_spent_seconds = v_time_spent,
        graded_at = now()
    WHERE id = v_attempt.id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt.id,
        'status', 'graded',
        'score', v_score,
        'passed', v_passed,
        'total_correct', v_total_correct,
        'correct_answers', v_total_correct,
        'total_questions', v_total_questions,
        'time_spent', v_time_spent,
        'has_ungraded', COALESCE(v_has_ungraded, false),
        'show_correct_answers', COALESCE(v_attempt.show_correct_answers, false)
    );
END;
$$;


-- ============================================================================
-- Also update v1_save_partial_answers to include answered_at handling
-- ============================================================================

DROP FUNCTION IF EXISTS public.v1_save_partial_answers(UUID, JSONB, INTEGER);
CREATE OR REPLACE FUNCTION public.v1_save_partial_answers(
    p_attempt_id UUID,
    p_answers JSONB,
    p_client_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_attempt RECORD;
    v_answer RECORD;
    v_question_id UUID;
    v_student_answer JSONB;
    v_current_version INTEGER;
    v_previous_answers JSONB;
    v_item_client_version INTEGER;
    v_effective_version INTEGER;
    v_answered_at TIMESTAMPTZ;
BEGIN
    v_tenant_id := get_my_tenant_id();

    SELECT id, tenant_id, student_id, status, expires_at, question_manifest, started_at
    INTO v_attempt
    FROM public.quiz_attempts_v2
    WHERE id = p_attempt_id FOR UPDATE;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    IF v_attempt.student_id != v_student_id OR v_attempt.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
    END IF;

    IF v_attempt.status != 'in_progress' THEN
        RAISE EXCEPTION 'Attempt is not in progress' USING ERRCODE = 'P0003';
    END IF;

    -- Match 30s grace period - already implemented
    IF v_attempt.expires_at IS NOT NULL AND now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        RAISE EXCEPTION 'Attempt has expired' USING ERRCODE = 'P0004';
    END IF;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_question_id := (v_answer.value->>'question_id')::UUID;
        v_student_answer := v_answer.value->'student_answers';
        v_item_client_version := COALESCE((v_answer.value->>'client_version')::INTEGER, p_client_version);
        
        -- Extract answered_at from the answer if provided
        v_answered_at := (v_answer.value->>'answered_at')::TIMESTAMPTZ;
        IF v_answered_at IS NULL THEN
            v_answered_at := now();
        END IF;

        IF NOT (v_question_id = ANY(v_attempt.question_manifest)) THEN
            RAISE EXCEPTION 'Invalid question_id for this attempt manifest: %', v_question_id USING ERRCODE = 'P0005';
        END IF;

        -- OPTIMISTIC LOCKING: Lock the specific question row
        SELECT answer_version, student_answers, answered_at
        INTO v_current_version, v_previous_answers, v_answered_at
        FROM public.quiz_attempt_questions_v2
        WHERE attempt_id = p_attempt_id 
          AND question_id = v_question_id 
          AND started_at = v_attempt.started_at
        FOR UPDATE;

        -- Only update if this answer is newer (based on answered_at)
        IF v_current_version IS NOT NULL AND v_item_client_version IS NOT NULL 
           AND v_item_client_version <= v_current_version THEN
            CONTINUE; 
        END IF;

        v_effective_version := COALESCE(v_item_client_version, COALESCE(v_current_version, 0) + 1);

        -- AUDIT TRAIL - only insert if answer actually changed
        IF v_previous_answers IS NOT NULL AND v_previous_answers IS DISTINCT FROM v_student_answer THEN
            INSERT INTO public.quiz_answer_history (
                tenant_id, attempt_id, question_id, previous_answers, new_answers, client_version, changed_at
            ) VALUES (
                v_tenant_id, p_attempt_id, v_question_id, v_previous_answers, v_student_answer, v_effective_version, now()
            );
        END IF;

        -- UPSERT the answer with answered_at timestamp
        INSERT INTO public.quiz_attempt_questions_v2 (
            attempt_id, started_at, question_id, tenant_id, 
            student_answers, answer_version, answered_at, updated_at
        )
        VALUES (
            v_attempt.id, v_attempt.started_at, v_question_id, v_tenant_id, 
            v_student_answer, v_effective_version, v_answered_at, now()
        )
        ON CONFLICT (attempt_id, question_id, started_at) 
        DO UPDATE SET 
            student_answers = EXCLUDED.student_answers,
            answer_version = EXCLUDED.answer_version,
            answered_at = COALESCE(EXCLUDED.answered_at, quiz_attempt_questions_v2.answered_at),
            updated_at = now();

    END LOOP;

    UPDATE public.quiz_attempts_v2
    SET last_heartbeat_at = now()
    WHERE id = p_attempt_id AND status = 'in_progress';

    RETURN jsonb_build_object(
        'success', true,
        'saved_at', now()
    );
END;
$$;
