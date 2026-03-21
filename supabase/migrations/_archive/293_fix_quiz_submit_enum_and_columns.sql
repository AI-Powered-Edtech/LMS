-- =============================================================================
-- Migration 293: Fix v1_submit_quiz_attempt — enum + column name mismatches
--
-- Bugs fixed in migration 291 that still need correction:
-- 1. question_type IN ('MULTIPLE_CHOICE') → actual enum value is 'MCQ'
-- 2. UPDATE uses time_spent_seconds — actual column is time_spent
-- 3. UPDATE uses graded_at — column does not exist in quiz_attempts_v2
-- =============================================================================

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
    v_question_id UUID;
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

    -- FIX: use COALESCE for tenant check so NULL JWT claim doesn't block
    IF v_attempt.student_id <> auth.uid()
    OR v_attempt.tenant_id <> COALESCE(get_my_tenant_id(),
        (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
    THEN
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

    -- Timer expiration check with 30s grace period
    IF v_attempt.expires_at IS NOT NULL
    AND now() > v_attempt.expires_at + INTERVAL '30 seconds' THEN
        UPDATE public.quiz_attempts_v2
        SET status = 'expired', submitted_at = now()
        WHERE id = p_attempt_id AND status = 'in_progress';

        RAISE EXCEPTION 'Quiz attempt has expired';
    END IF;

    -- Save final answers if provided
    IF jsonb_array_length(COALESCE(p_final_answers, '[]'::jsonb)) > 0 THEN
        PERFORM public.v1_save_partial_answers(p_attempt_id, p_final_answers);
    END IF;

    -- Server-side time calculation
    v_time_spent := EXTRACT(EPOCH FROM (now() - v_attempt.started_at))::INTEGER;

    -- Grade each question in the manifest
    FOR v_question_id IN
        SELECT UNNEST(v_attempt.question_manifest)
    LOOP
        SELECT * INTO v_question
        FROM public.quiz_questions
        WHERE id = v_question_id;

        IF NOT FOUND THEN
            CONTINUE;
        END IF;

        -- FIX: correct enum values are 'MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT'
        IF v_question.question_type IN ('MCQ', 'TRUE_FALSE', 'MULTIPLE_SELECT') THEN
            -- Read selected option IDs from student_answers JSONB array
            SELECT ARRAY(
                SELECT jsonb_array_elements_text(aqq.student_answers)::uuid
                FROM public.quiz_attempt_questions_v2 aqq
                WHERE aqq.attempt_id = v_attempt.id
                  AND aqq.question_id = v_question_id
                  AND aqq.started_at = v_attempt.started_at
                  AND aqq.student_answers IS NOT NULL
                  AND jsonb_typeof(aqq.student_answers) = 'array'
            ) INTO v_selected_option_ids;

            -- Read correct option IDs from quiz_options
            SELECT ARRAY_AGG(id) INTO v_correct_option_ids
            FROM public.quiz_options
            WHERE question_id = v_question_id AND is_correct = true;

            -- Compare selected vs correct
            v_is_correct := (
                v_selected_option_ids IS NOT NULL
                AND v_correct_option_ids IS NOT NULL
                AND ARRAY_LENGTH(v_selected_option_ids, 1) = ARRAY_LENGTH(v_correct_option_ids, 1)
                AND (
                    SELECT COUNT(*) = 0
                    FROM UNNEST(v_selected_option_ids) AS sel
                    WHERE sel NOT IN (SELECT UNNEST(v_correct_option_ids))
                )
            );

            -- Update grading result
            UPDATE public.quiz_attempt_questions_v2
            SET is_correct = v_is_correct,
                points_earned = CASE WHEN v_is_correct THEN COALESCE(v_question.points, 1) ELSE 0 END,
                updated_at = now()
            WHERE attempt_id = v_attempt.id
              AND question_id = v_question_id
              AND started_at = v_attempt.started_at;

            -- INSERT if row not found (unanswered question)
            IF NOT FOUND THEN
                INSERT INTO public.quiz_attempt_questions_v2 (
                    attempt_id, started_at, question_id, tenant_id, is_correct, points_earned
                ) VALUES (
                    v_attempt.id, v_attempt.started_at, v_question_id, v_attempt.tenant_id,
                    false, 0
                )
                ON CONFLICT (attempt_id, question_id, started_at) DO NOTHING;
            END IF;

            IF v_is_correct THEN
                v_total_correct := v_total_correct + 1;
            END IF;

        ELSIF v_question.question_type IN ('SHORT_ANSWER', 'ESSAY') THEN
            v_has_ungraded := TRUE;
            INSERT INTO public.quiz_attempt_questions_v2 (
                attempt_id, started_at, question_id, tenant_id, is_correct, points_earned
            ) VALUES (
                v_attempt.id, v_attempt.started_at, v_question_id, v_attempt.tenant_id, false, 0
            )
            ON CONFLICT (attempt_id, question_id, started_at) DO NOTHING;
        END IF;

        v_total_questions := v_total_questions + 1;
        v_total_points := v_total_points + COALESCE(v_question.points, 1);
    END LOOP;

    -- Recalculate from stored records
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

    -- FIX: correct column name is time_spent (not time_spent_seconds); no graded_at column
    UPDATE public.quiz_attempts_v2
    SET
        status = 'graded',
        submitted_at = now(),
        score = v_score,
        passed = v_passed,
        time_spent = v_time_spent
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
