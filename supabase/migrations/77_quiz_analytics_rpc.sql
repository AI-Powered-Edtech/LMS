-- Migration 77: Add get_attempt_detail RPC for Review Mode

BEGIN;

CREATE OR REPLACE FUNCTION get_attempt_detail(p_attempt_id UUID)
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
    v_attempt quiz_attempts;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Get the attempt
    SELECT * INTO v_attempt
    FROM quiz_attempts
    WHERE id = p_attempt_id;

    IF v_attempt IS NULL THEN
        RAISE EXCEPTION 'Attempt not found';
    END IF;

    -- 2. Check authorization
    -- 2a. Student checking their own attempt
    IF v_attempt.student_id = auth.uid() THEN
        v_is_authorized := TRUE;
    END IF;

    -- 2b. Teacher checking an attempt in their class
    IF NOT v_is_authorized THEN
        IF EXISTS (
            SELECT 1
            FROM quizzes q
            JOIN classes c ON q.class_id = c.id
            WHERE q.id = v_attempt.quiz_id
              AND (c.teacher_id = auth.uid() OR c.tenant_id IN (
                  SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
              ))
        ) THEN
            v_is_authorized := TRUE;
        END IF;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Unauthorized to view this attempt detail';
    END IF;

    -- 3. Return the detailed answers
    RETURN QUERY
    SELECT 
        q.id AS question_id,
        q.text AS question_text,
        q."order" AS question_position,
        q.question_type::TEXT,
        aa.selected_option_id,
        aa.selected_option_ids,
        -- Get text for single choice
        (SELECT o.text FROM quiz_options o WHERE o.id = aa.selected_option_id) AS selected_option_text,
        aa.text_answer,
        -- Get the (first) correct option id for this question
        (SELECT o.id FROM quiz_options o WHERE o.question_id = q.id AND o.is_correct = true LIMIT 1) AS correct_option_id,
        -- Get the text of that correct option
        (SELECT o.text FROM quiz_options o WHERE o.question_id = q.id AND o.is_correct = true LIMIT 1) AS correct_option_text,
        aa.is_correct,
        aa.points_earned,
        q.points AS max_points,
        aa.grader_comment,
        q.explanation
    FROM quiz_attempt_answers aa
    JOIN quiz_questions q ON aa.question_id = q.id
    WHERE aa.attempt_id = p_attempt_id
    ORDER BY q."order" ASC;

END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_attempt_detail(UUID) TO authenticated;

COMMIT;
