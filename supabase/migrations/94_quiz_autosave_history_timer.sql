-- =======================================================================================
-- Migration 94: Autosave Version Guard, Answer History, and Authoritative Timer
-- =======================================================================================

SET search_path = public;

-- ---------------------------------------------------------------------------------------
-- 1. SCHEMA CHANGES: Version Guard for Autosave
-- ---------------------------------------------------------------------------------------
ALTER TABLE public.quiz_attempt_questions_v2
  ADD COLUMN IF NOT EXISTS answer_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ---------------------------------------------------------------------------------------
-- 2. SCHEMA CHANGES: Answer History Table (Audit Trail)
-- ---------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_answer_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    attempt_id UUID NOT NULL,
    question_id UUID NOT NULL,
    previous_answers JSONB,
    new_answers JSONB,
    client_version INTEGER,
    changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_answer_history_attempt ON public.quiz_answer_history(attempt_id);
CREATE INDEX IF NOT EXISTS idx_answer_history_question ON public.quiz_answer_history(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_history_tenant ON public.quiz_answer_history(tenant_id);

ALTER TABLE public.quiz_answer_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can read answer history"
ON public.quiz_answer_history
FOR SELECT
USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND EXISTS (
        SELECT 1
        FROM public.quiz_attempts_v2 qa
        JOIN public.quizzes q ON qa.quiz_id = q.id
        JOIN public.classes c ON q.class_id = c.id
        WHERE qa.id = quiz_answer_history.attempt_id
          AND c.teacher_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Admins can read answer history"
ON public.quiz_answer_history
FOR SELECT
USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = (SELECT auth.uid()) 
          AND ur.tenant_id = quiz_answer_history.tenant_id 
          AND ur.role = 'ADMIN'
    )
);

-- ---------------------------------------------------------------------------------------
-- 3. RPC UPDATE: v1_save_partial_answers (Optimistic Locking + Answer Audit)
-- ---------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.v1_save_partial_answers(UUID, JSONB);
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

    -- Match 30s grace period
    IF v_attempt.expires_at IS NOT NULL AND now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        RAISE EXCEPTION 'Attempt has expired' USING ERRCODE = 'P0004';
    END IF;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        v_question_id := (v_answer.value->>'question_id')::UUID;
        v_student_answer := v_answer.value->'student_answers';
        
        v_item_client_version := COALESCE((v_answer.value->>'client_version')::INTEGER, p_client_version);

        IF NOT (v_question_id = ANY(v_attempt.question_manifest)) THEN
            RAISE EXCEPTION 'Invalid question_id for this attempt manifest: %', v_question_id USING ERRCODE = 'P0005';
        END IF;

        -- OPTIMISTIC LOCKING: Lock the specific question row
        SELECT answer_version, student_answers
        INTO v_current_version, v_previous_answers
        FROM public.quiz_attempt_questions_v2
        WHERE attempt_id = p_attempt_id 
          AND question_id = v_question_id 
          AND started_at = v_attempt.started_at
        FOR UPDATE;

        IF v_current_version IS NOT NULL THEN
            IF v_item_client_version IS NOT NULL AND v_item_client_version <= v_current_version THEN
                CONTINUE; 
            END IF;
        END IF;

        v_effective_version := COALESCE(v_item_client_version, COALESCE(v_current_version, 0) + 1);

        -- AUDIT TRAIL
        IF v_previous_answers IS NOT NULL AND v_previous_answers IS DISTINCT FROM v_student_answer THEN
            INSERT INTO public.quiz_answer_history (
                tenant_id, attempt_id, question_id, previous_answers, new_answers, client_version, changed_at
            ) VALUES (
                v_tenant_id, p_attempt_id, v_question_id, v_previous_answers, v_student_answer, v_effective_version, now()
            );
        END IF;

        -- UPSERT the answer
        INSERT INTO public.quiz_attempt_questions_v2 (
            attempt_id, started_at, question_id, tenant_id, student_answers, answer_version, updated_at
        )
        VALUES (
            v_attempt.id, v_attempt.started_at, v_question_id, v_tenant_id, v_student_answer, v_effective_version, now()
        )
        ON CONFLICT (attempt_id, question_id, started_at) 
        DO UPDATE SET 
            student_answers = EXCLUDED.student_answers,
            answer_version = EXCLUDED.answer_version,
            updated_at = EXCLUDED.updated_at;

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


-- ---------------------------------------------------------------------------------------
-- 4. RPC UPDATE: v1_save_answer (Wrapper)
-- ---------------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.v1_save_answer(UUID, UUID, UUID[], TEXT);
CREATE OR REPLACE FUNCTION public.v1_save_answer(
    p_attempt_id UUID,
    p_question_id UUID,
    p_selected_option_ids UUID[] DEFAULT '{}',
    p_text_answer TEXT DEFAULT NULL,
    p_client_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_answer JSONB;
BEGIN
    IF p_text_answer IS NOT NULL AND btrim(p_text_answer) <> '' THEN
        v_student_answer := to_jsonb(p_text_answer);
    ELSE
        v_student_answer := to_jsonb(COALESCE(p_selected_option_ids, ARRAY[]::uuid[]));
    END IF;

    RETURN public.v1_save_partial_answers(
        p_attempt_id,
        jsonb_build_array(
            jsonb_build_object(
                'question_id', p_question_id,
                'student_answers', v_student_answer,
                'client_version', p_client_version
            )
        )
    );
END;
$$;


-- ---------------------------------------------------------------------------------------
-- 5. RPC UPDATE: v1_submit_quiz_attempt (Authoritative Timer Guard)
-- ---------------------------------------------------------------------------------------
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

        RETURN jsonb_build_object(
            'attempt_id', v_attempt.id,
            'status', v_attempt.status,
            'score', v_score,
            'passed', (v_score >= COALESCE(v_attempt.passing_score, 0)),
            'total_correct', v_total_correct,
            'correct_answers', v_total_correct,
            'total_questions', v_total_questions,
            'time_spent', COALESCE((p_telemetry_data ->> 'time_spent_seconds')::integer, 0),
            'has_ungraded', COALESCE(v_has_ungraded, false),
            'show_correct_answers', COALESCE(v_attempt.show_correct_answers, false)
        );
    END IF;

    -- SERVER-AUTHORITATIVE TIMER GUARD
    -- If submission arrives > 30s after expiration, mark as EXPIRED and ignore new payload
    IF v_attempt.expires_at IS NOT NULL AND now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        UPDATE public.quiz_attempts_v2
        SET status = 'expired', submitted_at = now()
        WHERE id = p_attempt_id AND status = 'in_progress';

        RETURN jsonb_build_object(
            'status', 'expired'
        );
    END IF;

    IF jsonb_array_length(COALESCE(p_final_answers, '[]'::jsonb)) > 0 THEN
        PERFORM public.v1_save_partial_answers(p_attempt_id, p_final_answers);
    END IF;

    v_time_spent := COALESCE(
        (p_telemetry_data ->> 'time_spent_seconds')::integer,
        COALESCE(v_attempt.tab_switch_count * 5, 0)
    );

    FOR v_question_row IN
        SELECT jsonb_array_elements_text(jsonb_build_array(v_attempt.question_manifest)) AS id
    LOOP
        SELECT * INTO v_question
        FROM public.quiz_questions
        WHERE id = (v_question_row.id)::uuid;

        IF v_question.question_type IN ('MULTIPLE_CHOICE', 'TRUE_FALSE') THEN
            SELECT ARRAY_AGG(option_id) INTO v_selected_option_ids
            FROM public.quiz_attempt_answers
            WHERE attempt_id = v_attempt.id AND question_id = v_question.id;

            SELECT ARRAY_AGG(id) INTO v_correct_option_ids
            FROM public.quiz_question_options
            WHERE question_id = v_question.id AND is_correct = true;

            IF v_selected_option_ids IS NOT NULL AND v_correct_option_ids IS NOT NULL AND
               ARRAY_LENGTH(v_selected_option_ids, 1) = ARRAY_LENGTH(v_correct_option_ids, 1) AND
               v_selected_option_ids <@ v_correct_option_ids AND v_selected_option_ids @> v_correct_option_ids THEN
                v_is_correct := true;
                v_points_earned := v_question.points;
            ELSE
                v_is_correct := false;
                v_points_earned := 0;
            END IF;

            INSERT INTO public.quiz_attempt_questions_v2 (
                attempt_id, started_at, question_id, tenant_id, is_correct, points_earned
            ) VALUES (
                v_attempt.id, v_attempt.started_at, v_question.id, v_attempt.tenant_id, v_is_correct, v_points_earned
            )
            ON CONFLICT (attempt_id, question_id, started_at) DO UPDATE
            SET is_correct = EXCLUDED.is_correct,
                points_earned = EXCLUDED.points_earned;

        ELSIF v_question.question_type IN ('SHORT_ANSWER', 'ESSAY') THEN
            v_has_ungraded := TRUE;
            INSERT INTO public.quiz_attempt_questions_v2 (
                attempt_id, started_at, question_id, tenant_id, is_correct, points_earned
            ) VALUES (
                v_attempt.id, v_attempt.started_at, v_question.id, v_attempt.tenant_id, false, 0
            )
            ON CONFLICT (attempt_id, question_id, started_at) DO NOTHING;
        END IF;

    END LOOP;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE aq.is_correct = true),
        COALESCE(SUM(COALESCE(aq.points_earned, 0)), 0)
    INTO
        v_total_questions,
        v_total_correct,
        v_points_earned
    FROM public.quiz_questions q
    LEFT JOIN public.quiz_attempt_questions_v2 aq
      ON aq.attempt_id = v_attempt.id
     AND aq.question_id = q.id
    WHERE q.id = ANY(v_attempt.question_manifest);

    SELECT COALESCE(SUM(points), 0)
    INTO v_total_points
    FROM public.quiz_questions
    WHERE id = ANY(v_attempt.question_manifest);

    IF v_total_points > 0 THEN
        v_score := ROUND((v_points_earned / v_total_points) * 100, 2);
    ELSE
        v_score := 0;
    END IF;

    v_passed := v_score >= COALESCE(v_attempt.passing_score, 0);
    v_status := CASE WHEN v_has_ungraded THEN 'submitted' ELSE 'graded' END;

    UPDATE public.quiz_attempts_v2
    SET
        status = v_status,
        score = v_score,
        passed = v_passed,
        submitted_at = NOW()
    WHERE id = v_attempt.id;

    RETURN jsonb_build_object(
        'attempt_id', v_attempt.id,
        'status', v_status,
        'score', v_score,
        'passed', v_passed,
        'total_correct', v_total_correct,
        'correct_answers', v_total_correct,
        'total_questions', v_total_questions,
        'time_spent', v_time_spent,
        'has_ungraded', v_has_ungraded,
        'show_correct_answers', COALESCE(v_attempt.show_correct_answers, false)
    );
END;
$$;
