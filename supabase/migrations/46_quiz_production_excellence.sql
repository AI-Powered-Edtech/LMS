-- ==========================================================================
-- Migration 46: Quiz Production Excellence (10/10 Readiness)
--
-- 1. Adds cheating_signals telemetry to attempts.
-- 2. Implements backend-driven question randomization.
-- 3. Adds partial index for historical performance.
-- ==========================================================================

-- 1. Add cheating_signals column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quiz_attempts' AND column_name='cheating_signals') THEN
        ALTER TABLE public.quiz_attempts ADD COLUMN cheating_signals JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. Hardened Cleanup: Ensure 'ABANDONED' state is available (already added in 43, but ensuring safety)
-- This is already in the ENUM from 43_migration.sql

-- 3. Optimization: Partial index for historical queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_hist 
ON public.quiz_attempts (submitted_at) 
WHERE (status = 'SUBMITTED' OR status = 'GRADED');

-- 4. Re-implement start_quiz_attempt with Backend Randomization
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(p_quiz_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_attempt_id UUID;
    v_status public.quiz_attempt_status;
    v_time_limit INTEGER;
    v_expires_at TIMESTAMPTZ;
    v_max_attempts INTEGER;
    v_attempt_count INTEGER;
    v_course_id UUID;
    v_is_enrolled BOOLEAN;
BEGIN
    -- 1. Identity & Tenant Isolation
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- 2. Validate Quiz Ownership & Metadata
    SELECT tenant_id, time_limit_minutes, max_attempts, course_id 
    INTO v_tenant_id, v_time_limit, v_max_attempts, v_course_id
    FROM public.quizzes 
    WHERE id = p_quiz_id AND tenant_id = v_tenant_id;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found or access denied';
    END IF;

    -- 3. Enrollment Check
    SELECT EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.classes c ON c.id = e.class_id
        WHERE e.student_id = auth.uid() 
        AND c.course_id = v_course_id
        AND e.status = 'ACTIVE'
        AND e.tenant_id = v_tenant_id
    ) INTO v_is_enrolled;

    IF NOT v_is_enrolled THEN
        RAISE EXCEPTION 'Unauthorized: Not actively enrolled in this course';
    END IF;

    -- 4. Recovery: Check for active attempt
    SELECT id, status INTO v_attempt_id, v_status
    FROM public.quiz_attempts
    WHERE student_id = auth.uid() AND quiz_id = p_quiz_id AND status = 'IN_PROGRESS'
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_attempt_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'attempt_id', v_attempt_id,
            'status', v_status,
            'recovered', true
        );
    END IF;

    -- 5. Attempt Limit Validation
    SELECT count(*) INTO v_attempt_count
    FROM public.quiz_attempts
    WHERE quiz_id = p_quiz_id 
      AND student_id = auth.uid() 
      AND status IN ('SUBMITTED', 'GRADED');

    IF v_attempt_count >= COALESCE(v_max_attempts, 1) THEN
        RAISE EXCEPTION 'Attempt limit reached. Maximum allowed: %', v_max_attempts;
    END IF;

    -- 6. Create New Attempt
    IF v_time_limit > 0 THEN
        v_expires_at := now() + (v_time_limit * INTERVAL '1 minute');
    END IF;

    INSERT INTO public.quiz_attempts (
        quiz_id, student_id, tenant_id, status, started_at, expires_at
    ) VALUES (
        p_quiz_id, auth.uid(), v_tenant_id, 'IN_PROGRESS', now(), v_expires_at
    ) RETURNING id INTO v_attempt_id;

    -- 7. Snapshot Questions with BACKEND RANDOMIZATION
    -- We use row_number() over (order by random()) to assign a persistent random order for this attempt.
    INSERT INTO public.quiz_attempt_questions (
        attempt_id, question_id, tenant_id, text, explanation, order_index
    )
    SELECT 
        v_attempt_id,
        id,
        v_tenant_id,
        text,
        explanation,
        row_number() OVER (ORDER BY random()) -- Randomized order saved to DB
    FROM public.quiz_questions
    WHERE quiz_id = p_quiz_id;

    -- Optional: If we want to support a "Question Pool" (e.g. pick 10 out of 50), 
    -- we would add LIMIT v_num_questions here.

    RETURN jsonb_build_object(
        'attempt_id', v_attempt_id,
        'status', 'IN_PROGRESS',
        'recovered', false
    );
END;
$$;

-- 5. Atomic Cheating Signal Recording
CREATE OR REPLACE FUNCTION public.record_cheating_signal(p_attempt_id UUID, p_signal_type TEXT, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.quiz_attempts
    SET cheating_signals = cheating_signals || jsonb_build_array(
        jsonb_build_object(
            'type', p_signal_type,
            'timestamp', now(),
            'metadata', p_metadata
        )
    )
    WHERE id = p_attempt_id 
      AND student_id = auth.uid();
END;
$$;

-- 6. Cleanup Logic for Stale Attempts
-- Marks IN_PROGRESS attempts as ABANDONED if they are past their expires_at (+ grace period)
-- or if they have been inactive for more than 48 hours.
CREATE OR REPLACE FUNCTION public.cleanup_stale_quiz_attempts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count_expired INTEGER;
    v_count_abandoned INTEGER;
BEGIN
    -- A. Mark as EXPIRED if past time limit
    UPDATE public.quiz_attempts
    SET status = 'EXPIRED', finished_at = COALESCE(expires_at, now())
    WHERE status = 'IN_PROGRESS'
      AND expires_at IS NOT NULL
      AND now() > expires_at + INTERVAL '5 minutes';
    
    GET DIAGNOSTICS v_count_expired = ROW_COUNT;

    -- B. Mark as ABANDONED if inactive for > 48h (no updated_at change)
    -- Note: quiz_attempts should have an updated_at column for this to be accurate.
    -- If not, we use started_at.
    UPDATE public.quiz_attempts
    SET status = 'ABANDONED', finished_at = now()
    WHERE status = 'IN_PROGRESS'
      AND started_at < now() - INTERVAL '48 hours';

    GET DIAGNOSTICS v_count_abandoned = ROW_COUNT;

    RETURN jsonb_build_object(
        'expired_count', v_count_expired,
        'abandoned_count', v_count_abandoned,
        'timestamp', now()
    );
END;
$$;
