-- EduSync LMS — Survey System Enhancement Migration
-- Adds response aggregation RPC, analytics views, and deduplication enforcement

-- ---------------------------------------------------------------------------
-- 1. Enforce One Response Per User Per Survey
-- ---------------------------------------------------------------------------

-- Add unique constraint if not exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'survey_responses_survey_respondent_key'
  ) THEN
    ALTER TABLE survey_responses
      ADD CONSTRAINT survey_responses_survey_respondent_key
      UNIQUE (survey_id, respondent_id);
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2. Survey Response Aggregation RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_survey_results(p_survey_id UUID)
RETURNS TABLE (
  survey_id UUID,
  survey_title TEXT,
  target_audience TEXT,
  status TEXT,
  total_responses BIGINT,
  response_rate NUMERIC,
  question_id TEXT,
  question_text TEXT,
  question_type TEXT,
  rating_avg NUMERIC,
  rating_distribution JSONB,
  yes_count BIGINT,
  no_count BIGINT,
  text_answers TEXT[],
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_survey RECORD;
  v_question JSONB;
  v_total_responses BIGINT;
  v_response_rate NUMERIC;
BEGIN
  -- Get survey details
  SELECT * INTO v_survey
  FROM satisfaction_surveys
  WHERE id = p_survey_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get total response count
  SELECT COUNT(*) INTO v_total_responses
  FROM survey_responses
  WHERE survey_id = p_survey_id;

  -- Calculate response rate (responses / target audience size)
  -- This is an approximation since we don't know exact target audience size
  v_response_rate := NULL;

  -- Process each question
  FOR v_question IN SELECT * FROM jsonb_array_elements(v_survey.questions)
  LOOP
    question_id := v_question->>'id';
    question_text := v_question->>'text';
    question_type := v_question->>'type';

    IF v_question->>'type' = 'rating' THEN
      -- Rating question aggregation
      SELECT
        AVG((answers->>question_id)::NUMERIC),
        jsonb_build_object(
          '1', COUNT(*) FILTER (WHERE (answers->>question_id)::INT = 1),
          '2', COUNT(*) FILTER (WHERE (answers->>question_id)::INT = 2),
          '3', COUNT(*) FILTER (WHERE (answers->>question_id)::INT = 3),
          '4', COUNT(*) FILTER (WHERE (answers->>question_id)::INT = 4),
          '5', COUNT(*) FILTER (WHERE (answers->>question_id)::INT = 5)
        )
      INTO rating_avg, rating_distribution
      FROM survey_responses
      WHERE survey_id = p_survey_id
        AND answers ? question_id
        AND (answers->>question_id) ~ '^[1-5]$';

      yes_count := NULL;
      no_count := NULL;
      text_answers := NULL;

    ELSIF v_question->>'type' = 'yesno' THEN
      -- Yes/No question aggregation
      SELECT
        COUNT(*) FILTER (WHERE answers->>question_id IN ('true', 'ya', 'yes', '1')),
        COUNT(*) FILTER (WHERE answers->>question_id IN ('false', 'tidak', 'no', '0'))
      INTO yes_count, no_count
      FROM survey_responses
      WHERE survey_id = p_survey_id
        AND answers ? question_id;

      rating_avg := NULL;
      rating_distribution := NULL;
      text_answers := NULL;

    ELSIF v_question->>'type' = 'text' THEN
      -- Text question aggregation
      SELECT ARRAY_AGG(answers->>question_id)
      INTO text_answers
      FROM survey_responses
      WHERE survey_id = p_survey_id
        AND answers ? question_id
        AND answers->>question_id IS NOT NULL
        AND answers->>question_id != '';

      rating_avg := NULL;
      rating_distribution := NULL;
      yes_count := NULL;
      no_count := NULL;
    END IF;

    survey_id := v_survey.id;
    survey_title := v_survey.title;
    target_audience := v_survey.target_audience;
    status := v_survey.status;
    total_responses := v_total_responses;
    response_rate := v_response_rate;
    created_at := v_survey.created_at;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 3. Survey Analytics Summary View
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW survey_analytics_summary AS
SELECT
  s.id AS survey_id,
  s.title,
  s.target_audience,
  s.status,
  s.created_at,
  s.start_date,
  s.end_date,
  COUNT(DISTINCT r.id) AS total_responses,
  COUNT(DISTINCT r.respondent_id) AS unique_respondents,
  MIN(r.created_at) AS first_response_at,
  MAX(r.created_at) AS last_response_at,
  -- Average completion time (if tracked)
  CASE
    WHEN COUNT(r.id) > 0 THEN
      ROUND(AVG(EXTRACT(EPOCH FROM (r.created_at - s.created_at)))::NUMERIC, 2)
    ELSE NULL
  END AS avg_response_time_seconds
FROM satisfaction_surveys s
LEFT JOIN survey_responses r ON r.survey_id = s.id
GROUP BY s.id, s.title, s.target_audience, s.status, s.created_at, s.start_date, s.end_date;

-- ---------------------------------------------------------------------------
-- 4. Survey Response Export Function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION export_survey_responses(p_survey_id UUID)
RETURNS TABLE (
  respondent_id UUID,
  responded_at TIMESTAMPTZ,
  question_id TEXT,
  question_text TEXT,
  question_type TEXT,
  answer_value TEXT
) AS $$
DECLARE
  v_survey RECORD;
  v_response RECORD;
  v_question JSONB;
BEGIN
  SELECT * INTO v_survey
  FROM satisfaction_surveys
  WHERE id = p_survey_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR v_response IN
    SELECT respondent_id, created_at, answers
    FROM survey_responses
    WHERE survey_id = p_survey_id
    ORDER BY created_at
  LOOP
    FOR v_question IN SELECT * FROM jsonb_array_elements(v_survey.questions)
    LOOP
      respondent_id := v_response.respondent_id;
      responded_at := v_response.created_at;
      question_id := v_question->>'id';
      question_text := v_question->>'text';
      question_type := v_question->>'type';
      answer_value := v_response.answers->>question_id;

      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 5. Comments
-- ---------------------------------------------------------------------------

COMMENT ON FUNCTION get_survey_results IS 'Returns aggregated results for a survey with per-question analytics';
COMMENT ON VIEW survey_analytics_summary IS 'Summary view of survey response metrics';
COMMENT ON FUNCTION export_survey_responses IS 'Returns flattened response data for CSV export';
