-- 033_fix_search_questions_return_json.sql
-- Fix P0: VIL resolver tolak RETURNS TABLE(...). Ganti search_questions ke RETURNS JSON.
-- FE (questionBankService.searchQuestions) expect Array<QuestionBankItem>, jadi kembalikan JSON array.

BEGIN;

DROP FUNCTION IF EXISTS public.search_questions(
    uuid, uuid, integer, text, text, text[], integer, integer
);

CREATE OR REPLACE FUNCTION public.search_questions(
    p_subject_id        uuid DEFAULT NULL,
    p_topic_id          uuid DEFAULT NULL,
    p_difficulty_level  integer DEFAULT NULL,
    p_question_type     text DEFAULT NULL,
    p_search_query      text DEFAULT NULL,
    p_tags              text[] DEFAULT NULL,
    p_limit             integer DEFAULT 50,
    p_offset            integer DEFAULT 0
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
    v_tenant uuid := get_my_tenant_id();
    v_result json;
BEGIN
    IF v_tenant IS NULL THEN
        RAISE EXCEPTION 'TENANT_REQUIRED' USING ERRCODE = 'P0001';
    END IF;

    SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)
      INTO v_result
      FROM (
        SELECT qb.id,
               qb.subject_id,
               qb.topic_id,
               qb.question_type::text AS question_type,
               qb.question_text,
               qb.explanation,
               qb.difficulty_level,
               qb.created_at,
               COALESCE(
                   ARRAY(SELECT qt.tag FROM public.question_tags qt WHERE qt.question_id = qb.id ORDER BY qt.tag),
                   ARRAY[]::text[]
               ) AS tags
          FROM public.question_bank qb
         WHERE qb.tenant_id = v_tenant
           AND qb.is_archived = false
           AND (p_subject_id       IS NULL OR qb.subject_id = p_subject_id)
           AND (p_topic_id         IS NULL OR qb.topic_id = p_topic_id)
           AND (p_difficulty_level IS NULL OR qb.difficulty_level = p_difficulty_level)
           AND (p_question_type    IS NULL OR qb.question_type::text = p_question_type)
           AND (
                 p_search_query IS NULL
                 OR qb.question_text ILIKE '%' || p_search_query || '%'
                 OR COALESCE(qb.explanation, '') ILIKE '%' || p_search_query || '%'
               )
           AND (
                 p_tags IS NULL
                 OR EXISTS (
                     SELECT 1 FROM public.question_tags qt2
                      WHERE qt2.question_id = qb.id AND qt2.tag = ANY(p_tags)
                 )
               )
         ORDER BY qb.created_at DESC
         LIMIT GREATEST(COALESCE(p_limit, 50), 1)
        OFFSET GREATEST(COALESCE(p_offset, 0), 0)
      ) q;

    RETURN COALESCE(v_result, '[]'::json);
END;
$fn$;

COMMIT;
