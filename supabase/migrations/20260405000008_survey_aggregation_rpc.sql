-- =============================================================================
-- Migration: 20260405000008_survey_aggregation_rpc
-- Sprint 2.1: Survey aggregation RPC
-- Memindahkan agregasi dari client-side JS ke database untuk skalabilitas.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_survey_aggregation(p_survey_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_total_responses INTEGER;
BEGIN
  -- Auth check wajib
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  -- Hitung total respons
  SELECT COUNT(*) INTO v_total_responses
  FROM public.survey_responses
  WHERE survey_id = p_survey_id;

  -- Bangun agregasi per pertanyaan dari JSONB answers
  SELECT jsonb_build_object(
    'total_responses', v_total_responses,
    'responses_by_question', (
      SELECT jsonb_object_agg(
        q_key,
        jsonb_build_object(
          'type', q_type,
          'answers', q_answers
        )
      )
      FROM (
        SELECT
          key AS q_key,
          jsonb_agg(value) AS q_answers,
          'aggregated' AS q_type
        FROM public.survey_responses sr,
          jsonb_each(sr.answers)
        WHERE sr.survey_id = p_survey_id
        GROUP BY key
      ) agg
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_survey_aggregation(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_survey_aggregation(UUID) FROM anon;
