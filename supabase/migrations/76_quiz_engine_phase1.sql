-- ============================================================
-- Migration 76: Quiz Engine Core Phase 1 (High Concurrency)
-- 
-- Implements the V2 attempt tracking architecture:
--   1. Partitioned quiz_attempts_v2 and quiz_attempt_questions_v2
--   2. quiz_submission_queue for async write isolation
--   3. quiz_attempt_telemetry for behavioral tracking
--   4. v1_start_attempt RPC
--   5. v1_save_partial_answers RPC
--   6. v1_submit_quiz_attempt RPC
-- ============================================================

SET search_path = public;

-- ────────────────────────────────────────────────────────────
-- 1. QUEUE AND TELEMETRY TABLES
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.quiz_submission_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL, -- Logical FK to quiz_attempts_v2
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_submit_queue_status 
    ON public.quiz_submission_queue(status, submitted_at);

CREATE TABLE IF NOT EXISTS public.quiz_attempt_telemetry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    tab_switches INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempt_telemetry_attempt 
    ON public.quiz_attempt_telemetry(attempt_id);


-- ────────────────────────────────────────────────────────────
-- 2. PARTITIONED ATTEMPTS & QUESTIONS TABLES
-- ────────────────────────────────────────────────────────────

-- Note: We use _v2 suffix to cleanly transition from legacy attempt tracking
-- without dropping active historical data in the middle of the school year.

CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2 (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    status VARCHAR(20) DEFAULT 'IN_PROGRESS' 
        CHECK (status IN ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'ABANDONED')),
    score NUMERIC(5,2),
    expires_at TIMESTAMPTZ NOT NULL,
    question_manifest UUID[] NOT NULL DEFAULT '{}',
    is_adaptive BOOLEAN DEFAULT FALSE,
    attempt_number INTEGER DEFAULT 1,

    PRIMARY KEY (id, started_at)
) PARTITION BY RANGE (started_at);

-- Create initial partitions
CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2_historic 
    PARTITION OF public.quiz_attempts_v2 FOR VALUES FROM (MINVALUE) TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2_2026_03 
    PARTITION OF public.quiz_attempts_v2 FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2_2026_04 
    PARTITION OF public.quiz_attempts_v2 FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_v2_student_quiz 
    ON public.quiz_attempts_v2(student_id, quiz_id, status);


CREATE TABLE IF NOT EXISTS public.quiz_attempt_questions_v2 (
    attempt_id UUID NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    student_answers JSONB,
    points_earned NUMERIC(5,2) DEFAULT 0,
    is_correct BOOLEAN,
    
    PRIMARY KEY (attempt_id, question_id, started_at),
    FOREIGN KEY (attempt_id, started_at) REFERENCES public.quiz_attempts_v2(id, started_at) ON DELETE CASCADE
) PARTITION BY RANGE (started_at);

-- Create initial partitions
CREATE TABLE IF NOT EXISTS public.quiz_a_q_v2_historic 
    PARTITION OF public.quiz_attempt_questions_v2 FOR VALUES FROM (MINVALUE) TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS public.quiz_a_q_v2_2026_03 
    PARTITION OF public.quiz_attempt_questions_v2 FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS public.quiz_a_q_v2_2026_04 
    PARTITION OF public.quiz_attempt_questions_v2 FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');


-- ────────────────────────────────────────────────────────────
-- 3. CORE RPCs
-- ────────────────────────────────────────────────────────────

-- RPC 1: v1_start_attempt
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
    SELECT id, mode, time_limit_minutes, max_attempts, available_from, available_until, status
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
    SELECT id, started_at, expires_at, question_manifest, attempt_number
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
            'is_adaptive', false
        );
    END IF;

    -- 2. Build the Snapshot Manifest from quiz_questions
    SELECT ARRAY(
        SELECT id FROM public.quiz_questions 
        WHERE quiz_id = p_quiz_id AND tenant_id = v_tenant_id
        ORDER BY "order" ASC
    ) INTO v_manifest;

    -- 3. Calculate Expiration
    IF v_quiz.time_limit_minutes IS NOT NULL AND v_quiz.time_limit_minutes > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        v_expires_at := now() + interval '24 hours';
    END IF;

    -- 4. Insert V2 Attempt
    INSERT INTO public.quiz_attempts_v2 (
        id, tenant_id, quiz_id, student_id, started_at, status, 
        expires_at, question_manifest, attempt_number
    )
    VALUES (
        v_new_attempt_id, v_tenant_id, p_quiz_id, v_student_id, now(), 'IN_PROGRESS', 
        v_expires_at, v_manifest, v_previous_attempts + 1
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
        'is_adaptive', false
    );
END;
$$;


-- RPC 2: v1_save_partial_answers (Batched Save)
CREATE OR REPLACE FUNCTION public.v1_save_partial_answers(
    p_attempt_id UUID,
    p_answers JSONB -- Array of { question_id: UUID, student_answers: JSONB }
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
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- Fetch and explicitly lock Attempt
    SELECT id, tenant_id, student_id, status, expires_at, question_manifest, started_at
    INTO v_attempt
    FROM public.quiz_attempts_v2
    WHERE id = p_attempt_id FOR UPDATE;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    -- Security Guard
    IF v_attempt.student_id != v_student_id OR v_attempt.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002'; -- HTTP 403 conceptually
    END IF;

    -- Status Guard (Must be IN_PROGRESS and not expired)
    IF v_attempt.status != 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'Attempt is not in progress' USING ERRCODE = 'P0003'; -- Maps to 409
    END IF;
    IF now() > v_attempt.expires_at THEN
        RAISE EXCEPTION 'Attempt has expired' USING ERRCODE = 'P0004'; -- Maps to 409
    END IF;

    -- Process Batched Array
    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_question_id := (v_answer.value->>'question_id')::UUID;
        v_student_answer := v_answer.value->'student_answers';

        -- Manifest Integrity Check (Server guarantees students only answer locked questions)
        IF NOT (v_question_id = ANY(v_attempt.question_manifest)) THEN
            RAISE EXCEPTION 'Invalid question_id for this attempt manifest: %', v_question_id USING ERRCODE = 'P0005';
        END IF;

        -- UPSERT the answer
        INSERT INTO public.quiz_attempt_questions_v2 (
            attempt_id, started_at, question_id, tenant_id, student_answers
        )
        VALUES (
            v_attempt.id, v_attempt.started_at, v_question_id, v_tenant_id, v_student_answer
        )
        ON CONFLICT (attempt_id, question_id, started_at) 
        DO UPDATE SET student_answers = EXCLUDED.student_answers;

    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'saved_at', now()
    );
END;
$$;


-- RPC 3: v1_submit_quiz_attempt (Idempotent Submit and Queue Push)
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
    v_tenant_id UUID;
    v_student_id UUID := auth.uid();
    v_attempt RECORD;
    v_queue_ticket_id UUID := gen_random_uuid();
BEGIN
    v_tenant_id := get_my_tenant_id();

    SELECT id, tenant_id, student_id, status, started_at
    INTO v_attempt
    FROM public.quiz_attempts_v2
    WHERE id = p_attempt_id FOR UPDATE;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found' USING ERRCODE = 'P0001';
    END IF;

    -- Security Guard
    IF v_attempt.student_id != v_student_id OR v_attempt.tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
    END IF;

    -- Strictly Idempotent Returns
    IF v_attempt.status IN ('SUBMITTED', 'GRADED') THEN
        RETURN jsonb_build_object(
            'status', v_attempt.status,
            'message', 'Submission already exists. Grading underway or complete.',
            'submitted_at', now()
        );
    END IF;

    IF v_attempt.status != 'IN_PROGRESS' THEN
        RAISE EXCEPTION 'Attempt cannot be submitted from current state' USING ERRCODE = 'P0003';
    END IF;

    -- Force save any straggler final answers if provided
    IF jsonb_array_length(p_final_answers) > 0 THEN
        PERFORM public.v1_save_partial_answers(p_attempt_id, p_final_answers);
    END IF;

    -- 1. State Transition
    UPDATE public.quiz_attempts_v2
    SET status = 'SUBMITTED'
    WHERE id = v_attempt.id AND started_at = v_attempt.started_at;

    -- 2. Insert into Grading Queue (Write Isolation)
    -- We push an empty payload here because the source of truth is now purely in quiz_attempt_questions_v2
    -- The worker will read directly from the attempt tables.
    INSERT INTO public.quiz_submission_queue (
        id, tenant_id, attempt_id, payload, status
    )
    VALUES (
        v_queue_ticket_id, v_tenant_id, v_attempt.id, p_final_answers, 'PENDING'
    );

    -- 3. Telemetry Store (Avoid blooming queue)
    INSERT INTO public.quiz_attempt_telemetry (
        attempt_id, tenant_id, tab_switches, time_spent_seconds, user_agent
    )
    VALUES (
        v_attempt.id,
        v_tenant_id,
        COALESCE((p_telemetry_data->>'tab_switches')::INTEGER, 0),
        COALESCE((p_telemetry_data->>'time_spent_seconds')::INTEGER, 0),
        p_telemetry_data->>'user_agent'
    );

    RETURN jsonb_build_object(
        'status', 'SUBMITTED',
        'message', 'Submission received. Grading in progress.',
        'submitted_at', now(),
        'queue_ticket_id', v_queue_ticket_id
    );
END;
$$;


-- RPC 4: v1_checkout_submission_queue (For Edge Worker)
CREATE OR REPLACE FUNCTION public.v1_checkout_submission_queue()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    -- atomically lock and update one pending ticket
    UPDATE public.quiz_submission_queue
    SET status = 'PROCESSING'
    WHERE id = (
        SELECT id FROM public.quiz_submission_queue
        WHERE status = 'PENDING'
        ORDER BY submitted_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING id, attempt_id, tenant_id, payload INTO v_ticket;

    IF v_ticket.id IS NULL THEN
        RETURN NULL; -- No pending submissions
    END IF;

    RETURN jsonb_build_object(
        'ticket_id', v_ticket.id,
        'attempt_id', v_ticket.attempt_id,
        'tenant_id', v_ticket.tenant_id,
        'payload', v_ticket.payload
    );
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.quiz_attempts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_questions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submission_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_telemetry ENABLE ROW LEVEL SECURITY;

-- quiz_attempts_v2
CREATE POLICY "Students access their attempts"
ON public.quiz_attempts_v2
FOR SELECT
USING (
  student_id = auth.uid()
  AND tenant_id = get_my_tenant_id()
);

CREATE POLICY "Students create attempts"
ON public.quiz_attempts_v2
FOR INSERT
WITH CHECK (
  student_id = auth.uid()
  AND tenant_id = get_my_tenant_id()
);

-- quiz_attempt_questions_v2
CREATE POLICY "Students access own attempt questions"
ON public.quiz_attempt_questions_v2
FOR ALL
USING (
  tenant_id = get_my_tenant_id()
)
WITH CHECK (
  tenant_id = get_my_tenant_id()
);
