-- ==========================================================================
-- Migration 807: Fix Essay Grading for V2 Schema
--
-- Problem: grade_attempt_question RPC queries quiz_attempt_questions VIEW
-- which has no 'id' column (v2 uses composite key attempt_id+question_id).
-- Also v2 table lacks grading columns (grader_comment, graded_by, graded_at).
--
-- This migration:
-- 1. Adds grading columns to quiz_attempt_questions_v2
-- 2. Updates the VIEW to expose grading columns
-- 3. Recreates grade_attempt_question RPC for v2 composite key
-- 4. Fixes get_attempt_detail RPC to return actual grader_comment
-- ==========================================================================

SET search_path = public;

-- ==========================================================================
-- 1. Add grading columns to quiz_attempt_questions_v2
-- ==========================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempt_questions_v2' AND column_name = 'grader_comment'
    ) THEN
        ALTER TABLE quiz_attempt_questions_v2 ADD COLUMN grader_comment text;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempt_questions_v2' AND column_name = 'graded_by'
    ) THEN
        ALTER TABLE quiz_attempt_questions_v2 ADD COLUMN graded_by uuid REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quiz_attempt_questions_v2' AND column_name = 'graded_at'
    ) THEN
        ALTER TABLE quiz_attempt_questions_v2 ADD COLUMN graded_at timestamptz;
    END IF;
END $$;

-- ==========================================================================
-- 2. Update the VIEW to include grading columns
-- ==========================================================================

CREATE OR REPLACE VIEW quiz_attempt_questions AS
SELECT
    attempt_id,
    question_id,
    tenant_id,
    is_correct,
    points_earned,
    student_answers,
    grader_comment,
    graded_by,
    graded_at
FROM quiz_attempt_questions_v2;

-- ==========================================================================
-- 3. Recreate grade_attempt_question RPC for v2 composite key
--    Now accepts (p_attempt_id, p_question_id) instead of p_attempt_question_id
-- ==========================================================================

CREATE OR REPLACE FUNCTION grade_attempt_question(
    p_attempt_id uuid,
    p_question_id uuid,
    p_points_earned numeric,
    p_is_correct boolean,
    p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_attempt RECORD;
    v_quiz RECORD;
    v_is_authorized BOOLEAN := false;
    v_max_points numeric;
BEGIN
    -- 1. Identity
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'TENANT_NOT_FOUND';
    END IF;

    -- 2. Get attempt
    SELECT a.id, a.quiz_id, a.tenant_id AS attempt_tenant_id, a.student_id
    INTO v_attempt
    FROM quiz_attempts_v2 a
    WHERE a.id = p_attempt_id;

    IF v_attempt.id IS NULL THEN
        RAISE EXCEPTION 'ATTEMPT_NOT_FOUND';
    END IF;

    -- Tenant check
    IF v_attempt.attempt_tenant_id != v_tenant_id THEN
        RAISE EXCEPTION 'TENANT_MISMATCH';
    END IF;

    -- 3. Authorization: teacher of class, course creator, or admin
    SELECT * INTO v_quiz FROM quizzes WHERE id = v_attempt.quiz_id;

    IF EXISTS(SELECT 1 FROM user_roles WHERE user_id = v_user_id AND tenant_id = v_tenant_id AND role = 'ADMIN') THEN
        v_is_authorized := true;
    ELSIF v_quiz.class_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM classes WHERE id = v_quiz.class_id AND teacher_id = v_user_id
    ) THEN
        v_is_authorized := true;
    ELSIF v_quiz.course_id IS NOT NULL AND EXISTS(
        SELECT 1 FROM courses WHERE id = v_quiz.course_id AND created_by = v_user_id
    ) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'UNAUTHORIZED_NOT_TEACHER';
    END IF;

    -- 4. Get max_points from question
    SELECT points INTO v_max_points FROM quiz_questions WHERE id = p_question_id;
    v_max_points := COALESCE(v_max_points, 10);

    IF p_points_earned < 0 OR p_points_earned > v_max_points THEN
        RAISE EXCEPTION 'INVALID_POINTS: must be 0-%', v_max_points;
    END IF;

    -- 5. Grade the question in v2 table
    UPDATE quiz_attempt_questions_v2
    SET points_earned = p_points_earned,
        is_correct = p_is_correct,
        grader_comment = p_comment,
        graded_by = v_user_id,
        graded_at = now(),
        updated_at = now()
    WHERE attempt_id = p_attempt_id
      AND question_id = p_question_id
      AND tenant_id = v_tenant_id;

    -- 6. Also update legacy table if row exists
    UPDATE quiz_attempt_questions_legacy
    SET points_earned = p_points_earned,
        is_correct = p_is_correct,
        grader_comment = p_comment,
        graded_by = v_user_id,
        graded_at = now(),
        updated_at = now()
    WHERE attempt_id = p_attempt_id
      AND question_id = p_question_id
      AND tenant_id = v_tenant_id;

    -- 7. Recalculate attempt score
    PERFORM recalculate_attempt_score(p_attempt_id);

    RETURN jsonb_build_object(
        'success', true,
        'attempt_id', p_attempt_id,
        'question_id', p_question_id,
        'points_earned', p_points_earned,
        'is_correct', p_is_correct
    );
END;
$$;

-- ==========================================================================
-- 4. Fix get_attempt_detail to return actual grader_comment
-- ==========================================================================

CREATE OR REPLACE FUNCTION get_attempt_detail(p_attempt_id uuid)
RETURNS TABLE(
    question_id uuid,
    question_text text,
    question_position integer,
    question_type text,
    selected_option_id uuid,
    selected_option_ids uuid[],
    selected_option_text text,
    text_answer text,
    correct_option_id uuid,
    correct_option_text text,
    is_correct boolean,
    points_earned numeric,
    max_points numeric,
    grader_comment text,
    explanation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    FROM quiz_attempts_v2 a
    JOIN quizzes q ON q.id = a.quiz_id
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
            FROM user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.role IN ('admin', 'super_admin')
        ) INTO v_is_admin;

        IF v_is_admin THEN
            v_is_authorized := TRUE;
        ELSIF v_attempt.assignment_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM quiz_assignments qa
                JOIN classes c ON c.id = qa.class_id
                WHERE qa.id = v_attempt.assignment_id
                  AND c.teacher_id = auth.uid()
            ) INTO v_is_authorized;
        ELSIF v_attempt.course_id IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1
                FROM course_enrollments ce
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
        FROM quiz_attempts_v2
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
                FROM quiz_options qo
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
            FROM quiz_options qo
            WHERE qo.question_id = q.id
              AND qo.is_correct = true
            ORDER BY qo.id
            LIMIT 1
        ) AS correct_option_id,
        (
            SELECT string_agg(qo.text, ', ' ORDER BY qo.text)
            FROM quiz_options qo
            WHERE qo.question_id = q.id
              AND qo.is_correct = true
        ) AS correct_option_text,
        aq.is_correct,
        aq.points_earned,
        q.points AS max_points,
        aq.grader_comment,  -- Now returns actual value instead of NULL
        q.explanation
    FROM attempt_source src
    JOIN quiz_questions q
      ON q.id = ANY(src.question_manifest)
    LEFT JOIN quiz_attempt_questions_v2 aq
      ON aq.attempt_id = p_attempt_id
     AND aq.question_id = q.id
    ORDER BY array_position(src.question_manifest, q.id);
END;
$$;
