-- =============================================================================
-- Phase 33A: Question Bank Pool Randomization
-- Migration: 20260418000001_question_bank_pools.sql
--
-- Creates:
--   1. question_banks        — Named collections that group question_bank questions
--   2. question_bank_members — Junction: which questions belong to which bank
--   3. quiz_pool_config      — Which banks a quiz draws from and how many
--   4. RPC: get_pool_questions_for_attempt — Server-side seeded draw
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. question_banks — Named collections of questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.question_banks (
    id              uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id       uuid NOT NULL,
    title           text NOT NULL,
    description     text,
    question_count  int NOT NULL DEFAULT 0,
    created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now() NOT NULL,
    updated_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.question_banks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qbanks_tenant_id ON public.question_banks(tenant_id);

CREATE POLICY "qbanks_tenant_isolation" ON public.question_banks
    FOR ALL
    USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.question_banks TO authenticated;

CREATE TRIGGER set_tenant_id_question_banks
    BEFORE INSERT ON public.question_banks
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. question_bank_members — Junction table: questions → bank collection
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.question_bank_members (
    id          uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    bank_id     uuid NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.question_bank(id) ON DELETE CASCADE,
    tenant_id   uuid NOT NULL,
    created_at  timestamptz DEFAULT now() NOT NULL,
    UNIQUE (bank_id, question_id)
);

ALTER TABLE public.question_bank_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qbm_bank_id    ON public.question_bank_members(bank_id);
CREATE INDEX IF NOT EXISTS idx_qbm_tenant_id  ON public.question_bank_members(tenant_id);

CREATE POLICY "qbm_tenant_isolation" ON public.question_bank_members
    FOR ALL
    USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.question_bank_members TO authenticated;

CREATE TRIGGER set_tenant_id_question_bank_members
    BEFORE INSERT ON public.question_bank_members
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. quiz_pool_config — Which bank a quiz draws from, and how many questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_pool_config (
    id                  uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    quiz_id             uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    bank_id             uuid NOT NULL REFERENCES public.question_banks(id) ON DELETE CASCADE,
    draw_count          int NOT NULL CHECK (draw_count > 0),
    points_per_question int NOT NULL DEFAULT 10,
    tenant_id           uuid NOT NULL,
    created_at          timestamptz DEFAULT now() NOT NULL,
    UNIQUE (quiz_id, bank_id)
);

ALTER TABLE public.quiz_pool_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qpc_quiz_id    ON public.quiz_pool_config(quiz_id);
CREATE INDEX IF NOT EXISTS idx_qpc_tenant_id  ON public.quiz_pool_config(tenant_id);

CREATE POLICY "qpc_tenant_isolation" ON public.quiz_pool_config
    FOR ALL
    USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.quiz_pool_config TO authenticated;

CREATE TRIGGER set_tenant_id_qpc
    BEFORE INSERT ON public.quiz_pool_config
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Trigger: keep question_banks.question_count in sync
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_question_bank_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.question_banks
        SET question_count = question_count + 1,
            updated_at     = now()
        WHERE id = NEW.bank_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.question_banks
        SET question_count = GREATEST(question_count - 1, 0),
            updated_at     = now()
        WHERE id = OLD.bank_id;
    END IF;
    RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_question_bank_count
    AFTER INSERT OR DELETE ON public.question_bank_members
    FOR EACH ROW EXECUTE FUNCTION public.sync_question_bank_count();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: get_pool_questions_for_attempt
--    Called by load-quiz-data Edge Function.
--    Draws questions from each configured bank using a seeded random order.
--    Returns question data WITHOUT is_correct (security: no answer leakage).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_pool_questions_for_attempt(
    p_quiz_id   uuid,
    p_seed      uuid,
    p_tenant_id uuid
)
RETURNS TABLE (
    id             uuid,
    text           text,
    question_type  text,
    points         int,
    "order"        int,
    explanation    text,
    options        jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id    uuid;
    v_config     record;
    v_seed_int   bigint;
    v_seed_val   double precision;
    v_row_offset int := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
    END IF;

    -- Convert UUID seed to a 0.0–1.0 double precision for setseed()
    v_seed_int := ('x' || LEFT(replace(p_seed::text, '-', ''), 16))::bit(64)::bigint;
    v_seed_val := (ABS(v_seed_int) % 1000000000)::double precision / 1000000000.0;
    -- setseed() accepts values in [-1, 1]; normalize to [0, 1]
    PERFORM setseed(v_seed_val - 0.5);

    FOR v_config IN
        SELECT qpc.bank_id, qpc.draw_count, qpc.points_per_question
        FROM public.quiz_pool_config qpc
        WHERE qpc.quiz_id   = p_quiz_id
          AND qpc.tenant_id = p_tenant_id
        ORDER BY qpc.created_at ASC
    LOOP
        RETURN QUERY
        SELECT
            qb.id,
            qb.question_text                                AS text,
            qb.question_type,
            v_config.points_per_question                    AS points,
            (v_row_offset + ROW_NUMBER() OVER ())::int      AS "order",
            qb.explanation,
            COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id',         qo.id,
                            'option_text', qo.option_text,
                            'order_index', qo.order_index
                            -- NOTE: is_correct intentionally omitted
                        )
                        ORDER BY qo.order_index
                    )
                    FROM public.question_options qo
                    WHERE qo.question_id = qb.id
                ),
                '[]'::jsonb
            )                                               AS options
        FROM public.question_bank_members qbm
        JOIN public.question_bank qb
          ON qb.id        = qbm.question_id
         AND qb.tenant_id = p_tenant_id
         AND qb.is_archived = false
        WHERE qbm.bank_id   = v_config.bank_id
          AND qbm.tenant_id = p_tenant_id
        ORDER BY random()
        LIMIT v_config.draw_count;

        -- Advance row offset so ORDER numbers are contiguous across banks
        v_row_offset := v_row_offset + v_config.draw_count;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.get_pool_questions_for_attempt(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pool_questions_for_attempt(uuid, uuid, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. RPC: get_question_banks_list
--    Returns banks with question_count for the teacher UI dropdown.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_question_banks_list(p_tenant_id uuid)
RETURNS TABLE (
    id             uuid,
    title          text,
    description    text,
    question_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT
        qb.id,
        qb.title,
        qb.description,
        qb.question_count
    FROM public.question_banks qb
    WHERE qb.tenant_id = p_tenant_id
    ORDER BY qb.title ASC
    LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.get_question_banks_list(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_question_banks_list(uuid) TO authenticated;
