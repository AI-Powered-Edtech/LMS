-- ==========================================================================
-- Migration 08: Quiz Analytics RPC
--
-- Phase 3A: Gradebook Enhancements
-- Adds RPC for question difficulty analysis.
-- Uses DISTINCT attempt_id for future multi-answer type safety.
-- ==========================================================================

-- --------------------------------------------------------------------------
-- RPC: get_question_difficulty
-- Returns per-question correctness statistics for a quiz.
-- Used by the Teacher Gradebook to identify hard/easy questions.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_question_difficulty(p_quiz_id uuid)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  question_position integer,
  correct_count bigint,
  total_attempts bigint,
  difficulty_percent numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    qq.id AS question_id,
    qq.question_text,
    qq.position AS question_position,
    COUNT(DISTINCT qa.attempt_id) FILTER (WHERE qa.is_correct = true) AS correct_count,
    COUNT(DISTINCT qa.attempt_id) AS total_attempts,
    ROUND(
      COUNT(DISTINCT qa.attempt_id) FILTER (WHERE qa.is_correct = true)::numeric
      / NULLIF(COUNT(DISTINCT qa.attempt_id), 0) * 100, 1
    ) AS difficulty_percent
  FROM quiz_questions qq
  JOIN quiz_answers qa ON qa.question_id = qq.id
  JOIN quiz_attempts qat ON qat.id = qa.attempt_id
  WHERE qq.quiz_id = p_quiz_id
    AND qq.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND qat.status IN ('submitted', 'graded')
  GROUP BY qq.id, qq.question_text, qq.position
  ORDER BY qq.position ASC;
$$;

-- --------------------------------------------------------------------------
-- RPC: get_attempt_detail
-- Returns per-question answers for a specific quiz attempt.
-- Shows student's selected answer vs correct answer.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_attempt_detail(p_attempt_id uuid)
RETURNS TABLE (
  question_id uuid,
  question_text text,
  question_position integer,
  selected_option_id uuid,
  selected_option_text text,
  correct_option_id uuid,
  correct_option_text text,
  is_correct boolean
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    qq.id AS question_id,
    qq.question_text,
    qq.position AS question_position,
    qa.option_id AS selected_option_id,
    sel_opt.option_text AS selected_option_text,
    cor_opt.id AS correct_option_id,
    cor_opt.option_text AS correct_option_text,
    qa.is_correct
  FROM quiz_answers qa
  JOIN quiz_questions qq ON qq.id = qa.question_id
  JOIN quiz_attempts qat ON qat.id = qa.attempt_id
  -- Student's selected option
  LEFT JOIN quiz_options sel_opt ON sel_opt.id = qa.option_id
  -- Correct option for this question
  LEFT JOIN quiz_options cor_opt ON cor_opt.question_id = qq.id AND cor_opt.is_correct = true
  WHERE qa.attempt_id = p_attempt_id
    AND qq.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  ORDER BY qq.position ASC;
$$;
