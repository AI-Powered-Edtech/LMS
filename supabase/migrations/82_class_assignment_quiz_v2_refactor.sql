-- Migration 82: Class-assignment quiz V2 refactor
-- Aligns class membership, standalone quiz assignments, lesson quiz ownership,
-- and all active quiz attempts on quiz_attempts_v2 / quiz_attempt_questions_v2.

SET search_path = public;

-- ---------------------------------------------------------------------------
-- 1. Reconcile course_enrollments uniqueness used by enrollment triggers
-- ---------------------------------------------------------------------------

WITH ranked AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY user_id, course_id
            ORDER BY
                CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END,
                enrolled_at DESC NULLS LAST,
                id
        ) AS rn
    FROM public.course_enrollments
)
DELETE FROM public.course_enrollments ce
USING ranked r
WHERE ce.id = r.id
  AND r.rn > 1;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.course_enrollments'::regclass
          AND conname = 'course_enrollments_user_id_course_id_key'
    ) THEN
        ALTER TABLE public.course_enrollments
            ADD CONSTRAINT course_enrollments_user_id_course_id_key
            UNIQUE (user_id, course_id);
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. quiz_assignments schedule and attempt controls
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quiz_assignments'
          AND column_name = 'available_until'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quiz_assignments'
          AND column_name = 'due_at'
    ) THEN
        ALTER TABLE public.quiz_assignments RENAME COLUMN available_until TO due_at;
    END IF;
END $$;

ALTER TABLE public.quiz_assignments
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER;

UPDATE public.quiz_assignments qa
SET max_attempts = q.max_attempts
FROM public.quizzes q
WHERE q.id = qa.quiz_id
  AND qa.max_attempts IS NULL;

-- ---------------------------------------------------------------------------
-- 3. V2 attempt telemetry / result columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.quiz_attempts_v2
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS passed BOOLEAN,
    ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS focus_loss_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cheating_signals JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.quiz_attempts_v2
    ADD COLUMN IF NOT EXISTS attempt_seed UUID DEFAULT gen_random_uuid();

UPDATE public.quiz_attempts_v2
SET last_heartbeat_at = COALESCE(last_heartbeat_at, started_at, now())
WHERE last_heartbeat_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qa_v2_assignment_student_status
    ON public.quiz_attempts_v2(assignment_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_qa_v2_quiz_student_status
    ON public.quiz_attempts_v2(quiz_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_qa_v2_assignment_submitted
    ON public.quiz_attempts_v2(assignment_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_qaq_v2_attempt_question
    ON public.quiz_attempt_questions_v2(attempt_id, question_id);

-- ---------------------------------------------------------------------------
-- 4. Enrollment triggers must target the real unique constraint
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_course_assigned_to_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    INSERT INTO public.course_enrollments (tenant_id, course_id, user_id, role, status)
    SELECT NEW.tenant_id, NEW.course_id, e.student_id, 'student', 'ACTIVE'
    FROM public.enrollments e
    WHERE e.class_id = NEW.class_id
      AND e.status = 'ACTIVE'
    ON CONFLICT ON CONSTRAINT course_enrollments_user_id_course_id_key
    DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        status = 'ACTIVE',
        enrolled_at = now();

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_student_joined_class()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    IF NEW.status = 'ACTIVE' THEN
        INSERT INTO public.course_enrollments (tenant_id, course_id, user_id, role, status)
        SELECT NEW.tenant_id, cc.course_id, NEW.student_id, 'student', 'ACTIVE'
        FROM public.course_classes cc
        WHERE cc.class_id = NEW.class_id
        ON CONFLICT ON CONSTRAINT course_enrollments_user_id_course_id_key
        DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            status = 'ACTIVE',
            enrolled_at = now();
    END IF;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Builder save contract: derive ownership from lesson_id, never class_id
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.save_quiz_builder(uuid, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.save_quiz_builder(
    p_lesson_id UUID,
    p_tenant_id UUID,
    p_quiz_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quiz_id UUID;
    v_course_id UUID;
    v_existing_q_ids UUID[];
    v_new_q_ids UUID[];
    v_q_ids_to_delete UUID[];
    v_question JSONB;
    v_option JSONB;
    v_question_id UUID;
    v_question_count INTEGER;
BEGIN
    IF p_tenant_id != (auth.jwt() ->> 'tenant_id')::uuid THEN
        RAISE EXCEPTION 'Tenant mismatch. Access denied.';
    END IF;

    SELECT m.course_id
    INTO v_course_id
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE l.id = p_lesson_id
      AND l.tenant_id = p_tenant_id;

    IF v_course_id IS NULL THEN
        RAISE EXCEPTION 'Lesson or course context not found';
    END IF;

    IF (p_quiz_data ->> 'status') = 'published' THEN
        v_question_count := COALESCE(jsonb_array_length(p_quiz_data -> 'questions'), 0);

        IF v_question_count < 1 THEN
            RAISE EXCEPTION 'Publish failed: Quiz must have at least 1 question.';
        END IF;

        FOR v_question IN SELECT * FROM jsonb_array_elements(p_quiz_data -> 'questions')
        LOOP
            IF COALESCE(v_question ->> 'question_type', 'MCQ') IN ('MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT') THEN
                IF jsonb_array_length(COALESCE(v_question -> 'options', '[]'::jsonb)) < 2 THEN
                    RAISE EXCEPTION 'Publish failed: Objective questions must have at least 2 options.';
                END IF;

                IF NOT EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements(COALESCE(v_question -> 'options', '[]'::jsonb)) AS opt
                    WHERE COALESCE((opt ->> 'is_correct')::boolean, false) = true
                ) THEN
                    RAISE EXCEPTION 'Publish failed: Objective questions must have at least 1 correct answer.';
                END IF;
            END IF;
        END LOOP;
    END IF;

    INSERT INTO public.quizzes (
        id,
        lesson_id,
        course_id,
        class_id,
        origin_class_id,
        tenant_id,
        title,
        instructions,
        max_attempts,
        passing_score,
        shuffle_questions,
        shuffle_options,
        time_limit_minutes,
        show_correct_answers,
        available_from,
        available_until,
        mode,
        status
    )
    VALUES (
        COALESCE((p_quiz_data ->> 'id')::uuid, gen_random_uuid()),
        p_lesson_id,
        v_course_id,
        NULL,
        NULL,
        p_tenant_id,
        COALESCE(NULLIF(p_quiz_data ->> 'title', ''), 'Kuis Baru'),
        NULLIF(p_quiz_data ->> 'instructions', ''),
        COALESCE((p_quiz_data ->> 'max_attempts')::integer, 1),
        COALESCE((p_quiz_data ->> 'passing_score')::integer, 70),
        COALESCE((p_quiz_data ->> 'shuffle_questions')::boolean, false),
        COALESCE((p_quiz_data ->> 'shuffle_options')::boolean, false),
        NULLIF(p_quiz_data ->> 'time_limit_minutes', '')::integer,
        COALESCE((p_quiz_data ->> 'show_correct_answers')::boolean, false),
        NULLIF(p_quiz_data ->> 'available_from', '')::timestamptz,
        NULLIF(p_quiz_data ->> 'available_until', '')::timestamptz,
        COALESCE((p_quiz_data ->> 'mode')::quiz_mode, 'graded'),
        COALESCE((p_quiz_data ->> 'status')::quiz_status, 'draft')
    )
    ON CONFLICT (id) DO UPDATE SET
        lesson_id = EXCLUDED.lesson_id,
        course_id = EXCLUDED.course_id,
        class_id = NULL,
        origin_class_id = NULL,
        title = EXCLUDED.title,
        instructions = EXCLUDED.instructions,
        max_attempts = EXCLUDED.max_attempts,
        passing_score = EXCLUDED.passing_score,
        shuffle_questions = EXCLUDED.shuffle_questions,
        shuffle_options = EXCLUDED.shuffle_options,
        time_limit_minutes = EXCLUDED.time_limit_minutes,
        show_correct_answers = EXCLUDED.show_correct_answers,
        available_from = EXCLUDED.available_from,
        available_until = EXCLUDED.available_until,
        mode = EXCLUDED.mode,
        status = EXCLUDED.status,
        updated_at = now()
    RETURNING id INTO v_quiz_id;

    SELECT ARRAY(
        SELECT id FROM public.quiz_questions WHERE quiz_id = v_quiz_id
    ) INTO v_existing_q_ids;

    SELECT ARRAY(
        SELECT (q ->> 'id')::uuid
        FROM jsonb_array_elements(COALESCE(p_quiz_data -> 'questions', '[]'::jsonb)) AS q
        WHERE q ->> 'id' IS NOT NULL
    ) INTO v_new_q_ids;

    v_q_ids_to_delete := ARRAY(
        SELECT unnest(COALESCE(v_existing_q_ids, ARRAY[]::uuid[]))
        EXCEPT
        SELECT unnest(COALESCE(v_new_q_ids, ARRAY[]::uuid[]))
    );

    IF array_length(v_q_ids_to_delete, 1) > 0 THEN
        DELETE FROM public.quiz_questions WHERE id = ANY(v_q_ids_to_delete);
    END IF;

    FOR v_question IN
        SELECT value
        FROM jsonb_array_elements(COALESCE(p_quiz_data -> 'questions', '[]'::jsonb))
    LOOP
        INSERT INTO public.quiz_questions (
            id,
            quiz_id,
            tenant_id,
            text,
            "order",
            question_type,
            points,
            explanation
        )
        VALUES (
            COALESCE((v_question ->> 'id')::uuid, gen_random_uuid()),
            v_quiz_id,
            p_tenant_id,
            COALESCE(v_question ->> 'text', ''),
            COALESCE((v_question ->> 'order')::integer, 1),
            COALESCE((v_question ->> 'question_type')::question_type, 'MCQ'),
            COALESCE((v_question ->> 'points')::integer, 1),
            NULLIF(v_question ->> 'explanation', '')
        )
        ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            "order" = EXCLUDED."order",
            question_type = EXCLUDED.question_type,
            points = EXCLUDED.points,
            explanation = EXCLUDED.explanation
        RETURNING id INTO v_question_id;

        DELETE FROM public.quiz_options WHERE question_id = v_question_id;

        FOR v_option IN
            SELECT value
            FROM jsonb_array_elements(COALESCE(v_question -> 'options', '[]'::jsonb))
        LOOP
            INSERT INTO public.quiz_options (question_id, tenant_id, text, is_correct)
            VALUES (
                v_question_id,
                p_tenant_id,
                COALESCE(v_option ->> 'text', ''),
                COALESCE((v_option ->> 'is_correct')::boolean, false)
            );
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'quiz_id', v_quiz_id,
        'status', COALESCE(p_quiz_data ->> 'status', 'draft'),
        'success', true
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. V2-only standalone + lesson quiz attempt lifecycle
-- ---------------------------------------------------------------------------

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
    v_new_attempt_id UUID := gen_random_uuid();
    v_attempt_seed UUID := gen_random_uuid();
    v_quiz RECORD;
    v_assignment RECORD;
    v_existing_attempt RECORD;
    v_manifest UUID[];
    v_expires_at TIMESTAMPTZ;
    v_available_from TIMESTAMPTZ;
    v_due_at TIMESTAMPTZ;
    v_attempt_number INTEGER;
    v_effective_max_attempts INTEGER;
    v_is_authorized BOOLEAN := FALSE;
    v_scope_lock_key TEXT;
BEGIN
    v_tenant_id := get_my_tenant_id();
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant not found' USING ERRCODE = 'P0001';
    END IF;

    SELECT
        id,
        lesson_id,
        course_id,
        origin_class_id,
        tenant_id,
        status,
        time_limit_minutes,
        max_attempts,
        available_from,
        available_until,
        shuffle_questions,
        show_correct_answers,
        passing_score
    INTO v_quiz
    FROM public.quizzes
    WHERE id = p_quiz_id
      AND tenant_id = v_tenant_id;

    IF v_quiz.id IS NULL THEN
        RAISE EXCEPTION 'Quiz not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_quiz.status <> 'published' THEN
        RAISE EXCEPTION 'Quiz is not published' USING ERRCODE = 'P0003';
    END IF;

    IF p_assignment_id IS NOT NULL THEN
        SELECT
            qa.id,
            qa.class_id,
            qa.available_from,
            qa.due_at,
            qa.max_attempts,
            qa.status
        INTO v_assignment
        FROM public.quiz_assignments qa
        WHERE qa.id = p_assignment_id
          AND qa.quiz_id = p_quiz_id
          AND qa.tenant_id = v_tenant_id;

        IF v_assignment.id IS NULL THEN
            RAISE EXCEPTION 'Quiz assignment not found' USING ERRCODE = 'P0004';
        END IF;

        IF v_assignment.status IN ('draft', 'ended') THEN
            RAISE EXCEPTION 'Quiz assignment is not active' USING ERRCODE = 'P0005';
        END IF;

        SELECT EXISTS (
            SELECT 1
            FROM public.enrollments e
            WHERE e.class_id = v_assignment.class_id
              AND e.student_id = v_student_id
              AND e.tenant_id = v_tenant_id
              AND e.status = 'ACTIVE'
        ) INTO v_is_authorized;

        IF NOT v_is_authorized THEN
            RAISE EXCEPTION 'Unauthorized: not enrolled in assigned class' USING ERRCODE = 'P0006';
        END IF;

        v_available_from := COALESCE(v_assignment.available_from, v_quiz.available_from);
        v_due_at := COALESCE(v_assignment.due_at, v_quiz.available_until);
        v_effective_max_attempts := COALESCE(v_assignment.max_attempts, v_quiz.max_attempts, 0);
        v_scope_lock_key := 'assignment:' || p_assignment_id::text || ':' || v_student_id::text;
    ELSE
        IF v_quiz.lesson_id IS NULL THEN
            RAISE EXCEPTION 'Standalone quiz requires assignment context' USING ERRCODE = 'P0007';
        END IF;

        IF v_quiz.course_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = v_quiz.course_id
                  AND ce.user_id = v_student_id
                  AND ce.tenant_id = v_tenant_id
                  AND ce.status = 'ACTIVE'
            ) INTO v_is_authorized;
        END IF;

        IF NOT v_is_authorized AND v_quiz.origin_class_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.enrollments e
                WHERE e.class_id = v_quiz.origin_class_id
                  AND e.student_id = v_student_id
                  AND e.tenant_id = v_tenant_id
                  AND e.status = 'ACTIVE'
            ) INTO v_is_authorized;
        END IF;

        IF NOT v_is_authorized THEN
            RAISE EXCEPTION 'Unauthorized: not enrolled in lesson context' USING ERRCODE = 'P0008';
        END IF;

        v_available_from := v_quiz.available_from;
        v_due_at := v_quiz.available_until;
        v_effective_max_attempts := COALESCE(v_quiz.max_attempts, 0);
        v_scope_lock_key := 'lesson:' || p_quiz_id::text || ':' || v_student_id::text;
    END IF;

    IF v_available_from IS NOT NULL AND now() < v_available_from THEN
        RAISE EXCEPTION 'Quiz is not yet available' USING ERRCODE = 'P0009';
    END IF;

    IF v_due_at IS NOT NULL AND now() > v_due_at THEN
        RAISE EXCEPTION 'Quiz is no longer available' USING ERRCODE = 'P0010';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_scope_lock_key));

    UPDATE public.quiz_attempts_v2
    SET status = 'ABANDONED'
    WHERE student_id = v_student_id
      AND status = 'IN_PROGRESS'
      AND expires_at < now()
      AND (
          (p_assignment_id IS NOT NULL AND assignment_id = p_assignment_id)
          OR
          (p_assignment_id IS NULL AND quiz_id = p_quiz_id AND assignment_id IS NULL)
      );

    SELECT
        id,
        started_at,
        expires_at,
        question_manifest,
        attempt_number,
        assignment_id,
        attempt_seed
    INTO v_existing_attempt
    FROM public.quiz_attempts_v2
    WHERE student_id = v_student_id
      AND status = 'IN_PROGRESS'
      AND expires_at >= now()
      AND (
          (p_assignment_id IS NOT NULL AND assignment_id = p_assignment_id)
          OR
          (p_assignment_id IS NULL AND quiz_id = p_quiz_id AND assignment_id IS NULL)
      )
    ORDER BY started_at DESC
    LIMIT 1;

    IF v_existing_attempt.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'attempt_id', v_existing_attempt.id,
            'assignment_id', v_existing_attempt.assignment_id,
            'status', 'IN_PROGRESS',
            'recovered', true,
            'started_at', v_existing_attempt.started_at,
            'expires_at', v_existing_attempt.expires_at,
            'question_manifest', v_existing_attempt.question_manifest,
            'attempt_number', v_existing_attempt.attempt_number,
            'attempt_seed', v_existing_attempt.attempt_seed
        );
    END IF;

    SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM public.quiz_attempts_v2
    WHERE student_id = v_student_id
      AND (
          (p_assignment_id IS NOT NULL AND assignment_id = p_assignment_id)
          OR
          (p_assignment_id IS NULL AND quiz_id = p_quiz_id AND assignment_id IS NULL)
      );

    IF v_effective_max_attempts > 0 AND v_attempt_number > v_effective_max_attempts THEN
        RAISE EXCEPTION 'Attempt limit reached. Maximum allowed: %', v_effective_max_attempts USING ERRCODE = 'P0011';
    END IF;

    IF v_quiz.shuffle_questions THEN
        SELECT ARRAY(
            SELECT qq.id
            FROM public.quiz_questions qq
            WHERE qq.quiz_id = p_quiz_id
              AND qq.tenant_id = v_tenant_id
            ORDER BY md5(qq.id::text || v_attempt_seed::text) ASC
        ) INTO v_manifest;
    ELSE
        SELECT ARRAY(
            SELECT qq.id
            FROM public.quiz_questions qq
            WHERE qq.quiz_id = p_quiz_id
              AND qq.tenant_id = v_tenant_id
            ORDER BY qq."order" ASC
        ) INTO v_manifest;
    END IF;

    IF COALESCE(v_quiz.time_limit_minutes, 0) > 0 THEN
        v_expires_at := now() + (v_quiz.time_limit_minutes * INTERVAL '1 minute');
    ELSE
        v_expires_at := now() + INTERVAL '24 hours';
    END IF;

    INSERT INTO public.quiz_attempts_v2 (
        id,
        tenant_id,
        quiz_id,
        assignment_id,
        student_id,
        started_at,
        status,
        expires_at,
        question_manifest,
        attempt_number,
        attempt_seed,
        last_heartbeat_at
    )
    VALUES (
        v_new_attempt_id,
        v_tenant_id,
        p_quiz_id,
        p_assignment_id,
        v_student_id,
        now(),
        'IN_PROGRESS',
        v_expires_at,
        COALESCE(v_manifest, ARRAY[]::uuid[]),
        v_attempt_number,
        v_attempt_seed,
        now()
    );

    RETURN jsonb_build_object(
        'attempt_id', v_new_attempt_id,
        'assignment_id', p_assignment_id,
        'status', 'IN_PROGRESS',
        'recovered', false,
        'started_at', now(),
        'expires_at', v_expires_at,
        'question_manifest', COALESCE(v_manifest, ARRAY[]::uuid[]),
        'attempt_number', v_attempt_number,
        'attempt_seed', v_attempt_seed
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.v1_save_answer(
    p_attempt_id UUID,
    p_question_id UUID,
    p_selected_option_ids UUID[] DEFAULT '{}',
    p_text_answer TEXT DEFAULT NULL
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
                'student_answers', v_student_answer
            )
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_quiz_heartbeat(p_attempt_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated BOOLEAN := FALSE;
BEGIN
    UPDATE public.quiz_attempts_v2
    SET last_heartbeat_at = now()
    WHERE id = p_attempt_id
      AND student_id = auth.uid()
      AND tenant_id = get_my_tenant_id()
      AND status = 'IN_PROGRESS';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_cheating_signal(
    p_attempt_id UUID,
    p_signal_type TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated BOOLEAN := FALSE;
BEGIN
    UPDATE public.quiz_attempts_v2
    SET
        last_heartbeat_at = now(),
        tab_switch_count = CASE WHEN p_signal_type = 'TAB_SWITCH' THEN tab_switch_count + 1 ELSE tab_switch_count END,
        focus_loss_count = CASE WHEN p_signal_type = 'FOCUS_LOSS' THEN focus_loss_count + 1 ELSE focus_loss_count END,
        cheating_signals = COALESCE(cheating_signals, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'type', p_signal_type,
                'timestamp', now(),
                'metadata', COALESCE(p_metadata, '{}'::jsonb)
            )
        )
    WHERE id = p_attempt_id
      AND student_id = auth.uid()
      AND tenant_id = get_my_tenant_id()
      AND status = 'IN_PROGRESS';

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated;
END;
$$;

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

    IF v_attempt.status IN ('SUBMITTED', 'GRADED') THEN
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
            'passed', v_attempt.passed,
            'total_correct', v_total_correct,
            'correct_answers', v_total_correct,
            'total_questions', v_total_questions,
            'time_spent', COALESCE((p_telemetry_data ->> 'time_spent_seconds')::integer, 0),
            'has_ungraded', COALESCE(v_has_ungraded, false),
            'show_correct_answers', COALESCE(v_attempt.show_correct_answers, false)
        );
    END IF;

    IF jsonb_array_length(COALESCE(p_final_answers, '[]'::jsonb)) > 0 THEN
        PERFORM public.v1_save_partial_answers(p_attempt_id, p_final_answers);
    END IF;

    v_time_spent := COALESCE(
        NULLIF((p_telemetry_data ->> 'time_spent_seconds')::integer, 0),
        GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - v_attempt.started_at)))::integer)
    );

    UPDATE public.quiz_attempts_v2
    SET
        status = 'SUBMITTED',
        submitted_at = now(),
        time_spent = v_time_spent,
        tab_switch_count = GREATEST(tab_switch_count, COALESCE((p_telemetry_data ->> 'tab_switches')::integer, tab_switch_count)),
        focus_loss_count = GREATEST(focus_loss_count, COALESCE((p_telemetry_data ->> 'focus_losses')::integer, focus_loss_count)),
        last_heartbeat_at = now()
    WHERE id = v_attempt.id
      AND started_at = v_attempt.started_at;

    FOR v_question IN
        SELECT
            q.id AS question_id,
            q.question_type,
            COALESCE(q.points, 0) AS max_points,
            aq.student_answers
        FROM public.quiz_questions q
        LEFT JOIN public.quiz_attempt_questions_v2 aq
          ON aq.attempt_id = v_attempt.id
         AND aq.question_id = q.id
        WHERE q.id = ANY(v_attempt.question_manifest)
        ORDER BY array_position(v_attempt.question_manifest, q.id)
    LOOP
        v_total_questions := v_total_questions + 1;
        v_total_points := v_total_points + COALESCE(v_question.max_points, 0);
        v_selected_option_ids := ARRAY[]::uuid[];
        v_correct_option_ids := ARRAY[]::uuid[];
        v_is_correct := FALSE;

        SELECT ARRAY(
            SELECT qo.id
            FROM public.quiz_options qo
            WHERE qo.question_id = v_question.question_id
              AND qo.is_correct = true
            ORDER BY qo.id
        )
        INTO v_correct_option_ids;

        IF v_question.student_answers IS NOT NULL
           AND jsonb_typeof(v_question.student_answers) = 'array' THEN
            SELECT ARRAY(
                SELECT value::uuid
                FROM jsonb_array_elements_text(v_question.student_answers)
                ORDER BY value
            )
            INTO v_selected_option_ids;
        END IF;

        IF v_question.question_type IN ('SHORT_ANSWER', 'ESSAY') THEN
            v_has_ungraded := TRUE;
            UPDATE public.quiz_attempt_questions_v2
            SET is_correct = NULL, points_earned = NULL
            WHERE attempt_id = v_attempt.id
              AND question_id = v_question.question_id;
            CONTINUE;
        END IF;

        IF COALESCE(array_length(v_selected_option_ids, 1), 0) > 0 THEN
            v_is_correct := v_selected_option_ids = COALESCE(v_correct_option_ids, ARRAY[]::uuid[]);
        END IF;

        IF v_is_correct THEN
            v_total_correct := v_total_correct + 1;
            v_points_earned := v_points_earned + COALESCE(v_question.max_points, 0);
        END IF;

        UPDATE public.quiz_attempt_questions_v2
        SET
            is_correct = v_is_correct,
            points_earned = CASE WHEN v_is_correct THEN COALESCE(v_question.max_points, 0) ELSE 0 END
        WHERE attempt_id = v_attempt.id
          AND question_id = v_question.question_id;
    END LOOP;

    v_score := CASE
        WHEN v_total_points > 0 THEN ROUND((v_points_earned / v_total_points) * 100, 2)
        ELSE 0
    END;

    v_passed := CASE
        WHEN v_has_ungraded THEN NULL
        ELSE v_score >= COALESCE(v_attempt.passing_score, 70)
    END;

    v_status := CASE WHEN v_has_ungraded THEN 'SUBMITTED' ELSE 'GRADED' END;

    UPDATE public.quiz_attempts_v2
    SET
        status = v_status,
        score = v_score,
        passed = v_passed,
        submitted_at = COALESCE(submitted_at, now()),
        time_spent = v_time_spent
    WHERE id = v_attempt.id
      AND started_at = v_attempt.started_at;

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

-- ---------------------------------------------------------------------------
-- 7. Teacher reporting RPCs now scope by assignment and V2 attempts
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.v1_get_assignment_results(p_assignment_id UUID)
RETURNS TABLE (
    attempt_id UUID,
    student_id UUID,
    student_name TEXT,
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    score NUMERIC,
    status TEXT,
    passed BOOLEAN,
    time_spent INTEGER,
    quiz_id UUID,
    quiz_title TEXT,
    passing_score INTEGER,
    max_attempts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment RECORD;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    SELECT
        qa.id,
        qa.class_id,
        qa.quiz_id,
        q.title,
        q.passing_score,
        COALESCE(qa.max_attempts, q.max_attempts) AS effective_max_attempts
    INTO v_assignment
    FROM public.quiz_assignments qa
    JOIN public.quizzes q ON q.id = qa.quiz_id
    WHERE qa.id = p_assignment_id
      AND qa.tenant_id = get_my_tenant_id();

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'super_admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin AND NOT EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.id = v_assignment.class_id
          AND c.teacher_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Must be the class teacher or an admin' USING ERRCODE = 'P0002';
    END IF;

    RETURN QUERY
    SELECT
        a.id,
        a.student_id,
        COALESCE(p.full_name, p.first_name || ' ' || p.last_name, 'Siswa') AS student_name,
        a.started_at,
        a.submitted_at,
        a.score,
        a.status,
        a.passed,
        a.time_spent,
        a.quiz_id,
        v_assignment.title,
        v_assignment.passing_score,
        v_assignment.effective_max_attempts
    FROM public.quiz_attempts_v2 a
    JOIN public.profiles p ON p.id = a.student_id
    WHERE a.assignment_id = p_assignment_id
    ORDER BY a.submitted_at DESC NULLS LAST, a.started_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_attempt_detail(p_attempt_id UUID)
RETURNS TABLE (
    question_id UUID,
    question_text TEXT,
    question_position INTEGER,
    question_type TEXT,
    selected_option_id UUID,
    selected_option_ids UUID[],
    selected_option_text TEXT,
    text_answer TEXT,
    correct_option_id UUID,
    correct_option_text TEXT,
    is_correct BOOLEAN,
    points_earned NUMERIC,
    max_points NUMERIC,
    grader_comment TEXT,
    explanation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_attempt RECORD;
    v_is_admin BOOLEAN := FALSE;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    SELECT
        a.id,
        a.quiz_id,
        a.assignment_id,
        a.student_id,
        q.course_id
    INTO v_attempt
    FROM public.quiz_attempts_v2 a
    JOIN public.quizzes q ON q.id = a.quiz_id
    WHERE a.id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    IF v_attempt.student_id = auth.uid() THEN
        v_is_authorized := TRUE;
    END IF;

    IF NOT v_is_authorized THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'super_admin')
        ) INTO v_is_admin;

        IF v_is_admin THEN
            v_is_authorized := TRUE;
        ELSIF v_attempt.assignment_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.quiz_assignments qa
                JOIN public.classes c ON c.id = qa.class_id
                WHERE qa.id = v_attempt.assignment_id
                  AND c.teacher_id = auth.uid()
            ) INTO v_is_authorized;
        ELSIF v_attempt.course_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM public.course_enrollments ce
                WHERE ce.course_id = v_attempt.course_id
                  AND ce.user_id = auth.uid()
                  AND ce.role IN ('teacher', 'admin')
            ) INTO v_is_authorized;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized to view this attempt detail';
    END IF;

    RETURN QUERY
    WITH attempt_source AS (
        SELECT id, question_manifest
        FROM public.quiz_attempts_v2
        WHERE id = p_attempt_id
    )
    SELECT
        q.id AS question_id,
        q.text AS question_text,
        array_position(src.question_manifest, q.id) AS question_position,
        q.question_type::TEXT,
        CASE
            WHEN aq.student_answers IS NOT NULL
             AND jsonb_typeof(aq.student_answers) = 'array'
             AND jsonb_array_length(aq.student_answers) = 1
            THEN (aq.student_answers ->> 0)::uuid
            ELSE NULL
        END AS selected_option_id,
        CASE
            WHEN aq.student_answers IS NOT NULL AND jsonb_typeof(aq.student_answers) = 'array'
            THEN ARRAY(
                SELECT value::uuid
                FROM jsonb_array_elements_text(aq.student_answers)
            )
            ELSE ARRAY[]::uuid[]
        END AS selected_option_ids,
        CASE
            WHEN aq.student_answers IS NOT NULL AND jsonb_typeof(aq.student_answers) = 'array'
            THEN (
                SELECT string_agg(qo.text, ', ' ORDER BY qo.text)
                FROM public.quiz_options qo
                WHERE qo.id = ANY(
                    ARRAY(
                        SELECT value::uuid
                        FROM jsonb_array_elements_text(aq.student_answers)
                    )
                )
            )
            ELSE NULL
        END AS selected_option_text,
        CASE
            WHEN aq.student_answers IS NOT NULL AND jsonb_typeof(aq.student_answers) = 'string'
            THEN trim(both '"' FROM aq.student_answers::text)
            ELSE NULL
        END AS text_answer,
        (
            SELECT qo.id
            FROM public.quiz_options qo
            WHERE qo.question_id = q.id
              AND qo.is_correct = true
            ORDER BY qo.id
            LIMIT 1
        ) AS correct_option_id,
        (
            SELECT string_agg(qo.text, ', ' ORDER BY qo.text)
            FROM public.quiz_options qo
            WHERE qo.question_id = q.id
              AND qo.is_correct = true
        ) AS correct_option_text,
        aq.is_correct,
        aq.points_earned,
        q.points AS max_points,
        NULL::TEXT AS grader_comment,
        q.explanation
    FROM attempt_source src
    JOIN public.quiz_questions q
      ON q.id = ANY(src.question_manifest)
    LEFT JOIN public.quiz_attempt_questions_v2 aq
      ON aq.attempt_id = p_attempt_id
     AND aq.question_id = q.id
    ORDER BY array_position(src.question_manifest, q.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_question_difficulty(p_assignment_id UUID)
RETURNS TABLE (
    question_id UUID,
    question_text TEXT,
    question_position INTEGER,
    correct_count BIGINT,
    total_attempts BIGINT,
    difficulty_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_assignment RECORD;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    SELECT qa.id, qa.class_id, qa.quiz_id
    INTO v_assignment
    FROM public.quiz_assignments qa
    WHERE qa.id = p_assignment_id
      AND qa.tenant_id = get_my_tenant_id();

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Assignment not found';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin', 'super_admin')
    ) INTO v_is_admin;

    IF NOT v_is_admin AND NOT EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.id = v_assignment.class_id
          AND c.teacher_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized role';
    END IF;

    RETURN QUERY
    WITH attempts AS (
        SELECT a.id
        FROM public.quiz_attempts_v2 a
        WHERE a.assignment_id = p_assignment_id
          AND a.status IN ('SUBMITTED', 'GRADED')
    ),
    questions AS (
        SELECT q.id, q.text, q."order"
        FROM public.quiz_questions q
        WHERE q.quiz_id = v_assignment.quiz_id
    ),
    totals AS (
        SELECT COUNT(*)::bigint AS total_attempts FROM attempts
    )
    SELECT
        q.id AS question_id,
        q.text AS question_text,
        q."order" AS question_position,
        COUNT(DISTINCT aq.attempt_id) FILTER (WHERE aq.is_correct = true) AS correct_count,
        t.total_attempts,
        ROUND(
            COALESCE(
                COUNT(DISTINCT aq.attempt_id) FILTER (WHERE aq.is_correct = true)::numeric
                / NULLIF(t.total_attempts, 0) * 100,
                0
            ),
            1
        ) AS difficulty_percent
    FROM questions q
    CROSS JOIN totals t
    LEFT JOIN public.quiz_attempt_questions_v2 aq
      ON aq.question_id = q.id
     AND aq.attempt_id IN (SELECT id FROM attempts)
    GROUP BY q.id, q.text, q."order", t.total_attempts
    ORDER BY q."order" ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_progress_bundle(p_student_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;

    IF auth.uid() <> p_student_id AND (auth.jwt() ->> 'role') NOT IN ('teacher', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url)
            FROM public.profiles
            WHERE id = p_student_id
        ),
        'total_xp', (
            SELECT COALESCE(SUM(points), 0)
            FROM public.user_points
            WHERE user_id = p_student_id
              AND tenant_id = v_tenant_id
        ),
        'completed_lessons_count', (
            SELECT COUNT(*)
            FROM public.lesson_progress
            WHERE user_id = p_student_id
              AND completed = true
              AND tenant_id = v_tenant_id
        ),
        'quiz_attempts', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
            FROM (
                SELECT
                    a.id,
                    a.quiz_id,
                    a.score,
                    COALESCE(a.submitted_at, a.started_at) AS created_at
                FROM public.quiz_attempts_v2 a
                WHERE a.student_id = p_student_id
                  AND a.tenant_id = v_tenant_id
                  AND a.status IN ('SUBMITTED', 'GRADED')
                ORDER BY COALESCE(a.submitted_at, a.started_at) DESC
            ) d
        ),
        'achievements', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
            FROM (
                SELECT ub.id, ub.earned_at, b.name, b.icon
                FROM public.user_badges ub
                JOIN public.badges b ON b.id = ub.badge_id
                WHERE ub.user_id = p_student_id
                ORDER BY ub.earned_at DESC
            ) d
        ),
        'course_progress', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb)
            FROM (
                SELECT cp.id, cp.course_id, cp.total_lessons, cp.completed_lessons, cp.percentage, cp.last_activity_type, cp.last_activity_at, c.title
                FROM public.course_progress cp
                JOIN public.courses c ON c.id = cp.course_id
                WHERE cp.user_id = p_student_id
                ORDER BY cp.last_activity_at DESC NULLS LAST
            ) d
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
