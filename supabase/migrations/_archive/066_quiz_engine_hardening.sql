-- =========================================================
-- EduSync LMS
-- Quiz Engine Hardening Migration
-- Version: 66
-- =========================================================

BEGIN;

-- =========================================================
-- 1. OPTIMISTIC LOCKING
-- =========================================================

ALTER TABLE public.quiz_attempts
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.quiz_attempts.version IS
'Optimistic locking version. Incremented on each submit to prevent race conditions.';


-- =========================================================
-- 2. CHEATING EVENTS TABLE (Append Only)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.quiz_cheating_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tenant_id UUID NOT NULL REFERENCES public.tenants(id),

    attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,

    student_id UUID NOT NULL REFERENCES public.profiles(id),

    signal_type TEXT NOT NULL,

    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quiz_cheating_events IS
'Append-only cheating signal events recorded during quiz attempts';


CREATE INDEX IF NOT EXISTS idx_cheating_events_attempt
ON public.quiz_cheating_events(attempt_id);

CREATE INDEX IF NOT EXISTS idx_cheating_events_tenant
ON public.quiz_cheating_events(tenant_id);

CREATE INDEX IF NOT EXISTS idx_cheating_events_student
ON public.quiz_cheating_events(student_id);


ALTER TABLE public.quiz_cheating_events ENABLE ROW LEVEL SECURITY;


-- =========================================================
-- 3. RLS POLICY FOR CHEATING EVENTS
-- =========================================================

CREATE POLICY "Tenant access cheating events"
ON public.quiz_cheating_events
FOR SELECT
USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);


-- =========================================================
-- 4. ATTEMPT STATE MACHINE VALIDATION
-- =========================================================

CREATE OR REPLACE FUNCTION public.validate_attempt_transition(
    p_old_status TEXT,
    p_new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE

        WHEN p_old_status = 'not_started'
        AND p_new_status = 'in_progress'
        THEN TRUE

        WHEN p_old_status = 'in_progress'
        AND p_new_status IN ('submitted','expired','abandoned')
        THEN TRUE

        WHEN p_old_status = 'submitted'
        AND p_new_status = 'graded'
        THEN TRUE

        ELSE FALSE
    END;
END;
$$;



CREATE OR REPLACE FUNCTION public.trg_validate_attempt_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN

    IF OLD.status IS DISTINCT FROM NEW.status THEN

        IF NOT validate_attempt_transition(OLD.status, NEW.status) THEN
            RAISE EXCEPTION
            'Invalid attempt state transition: % -> %',
            OLD.status,
            NEW.status;
        END IF;

    END IF;

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS trg_validate_attempt_status_guard
ON public.quiz_attempts;

CREATE TRIGGER trg_validate_attempt_status_guard
BEFORE UPDATE ON public.quiz_attempts
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_validate_attempt_status_change();


-- =========================================================
-- 5. BATCH ANSWER SAVE RPC
-- =========================================================

CREATE OR REPLACE FUNCTION public.batch_save_answers(
    p_attempt_id UUID,
    p_answers JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE

    v_student_id UUID := auth.uid();
    v_answer JSONB;

BEGIN

    -- Validate attempt ownership
    IF NOT EXISTS (
        SELECT 1
        FROM quiz_attempts
        WHERE id = p_attempt_id
        AND student_id = v_student_id
        AND status = 'in_progress'
    ) THEN
        RAISE EXCEPTION 'Invalid attempt or permission denied';
    END IF;


    FOR v_answer IN
        SELECT * FROM jsonb_array_elements(p_answers)
    LOOP

        UPDATE quiz_attempt_questions
        SET

            selected_option_ids =
            COALESCE(
                (
                    SELECT array_agg(value::UUID)
                    FROM jsonb_array_elements_text(v_answer->'selected_option_ids')
                ),
                '{}'
            ),

            text_answer = v_answer->>'text_answer',

            updated_at = now()

        WHERE attempt_id = p_attempt_id
        AND question_id = (v_answer->>'question_id')::UUID;

    END LOOP;


    RETURN TRUE;

END;
$$;


-- =========================================================
-- 6. RECORD CHEATING SIGNAL (NEW TABLE)
-- =========================================================

DROP FUNCTION IF EXISTS public.record_cheating_signal(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.record_cheating_signal(
    p_attempt_id UUID,
    p_signal_type TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE

    v_student UUID := auth.uid();
    v_tenant UUID;

BEGIN

    SELECT tenant_id
    INTO v_tenant
    FROM quiz_attempts
    WHERE id = p_attempt_id;

    INSERT INTO quiz_cheating_events(
        tenant_id,
        attempt_id,
        student_id,
        signal_type,
        metadata
    )
    VALUES(
        v_tenant,
        p_attempt_id,
        v_student,
        p_signal_type,
        p_metadata
    );

    RETURN TRUE;

END;
$$;


-- =========================================================
-- 7. EXPIRED ATTEMPT RECOVERY HELPER
-- =========================================================

CREATE OR REPLACE FUNCTION public.expire_dead_attempt(
    p_attempt_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

    UPDATE quiz_attempts
    SET
        status = 'expired',
        finished_at = expires_at,
        updated_at = now()
    WHERE id = p_attempt_id
    AND status = 'in_progress'
    AND expires_at IS NOT NULL
    AND now() > expires_at;

    RETURN TRUE;

END;
$$;


-- =========================================================
-- 8. INDEX IMPROVEMENTS
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_attempt_status
ON public.quiz_attempts(status);

CREATE INDEX IF NOT EXISTS idx_attempt_student_quiz
ON public.quiz_attempts(student_id, quiz_id);


-- =========================================================
-- DONE
-- =========================================================

COMMIT;
