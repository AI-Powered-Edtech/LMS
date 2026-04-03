-- ============================================================
-- Phase 32A: Interactive Content Block Types
-- ============================================================

-- Extend resource_type enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FLASHCARD' AND enumtypid = 'public.resource_type'::regtype) THEN
        ALTER TYPE public.resource_type ADD VALUE 'FLASHCARD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DRAG_DROP' AND enumtypid = 'public.resource_type'::regtype) THEN
        ALTER TYPE public.resource_type ADD VALUE 'DRAG_DROP';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HOTSPOT' AND enumtypid = 'public.resource_type'::regtype) THEN
        ALTER TYPE public.resource_type ADD VALUE 'HOTSPOT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TIMELINE' AND enumtypid = 'public.resource_type'::regtype) THEN
        ALTER TYPE public.resource_type ADD VALUE 'TIMELINE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SORTING' AND enumtypid = 'public.resource_type'::regtype) THEN
        ALTER TYPE public.resource_type ADD VALUE 'SORTING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FILL_BLANK' AND enumtypid = 'public.resource_type'::regtype) THEN
        ALTER TYPE public.resource_type ADD VALUE 'FILL_BLANK';
    END IF;
END $$;

-- interactive_block_progress: track per-student per-block interaction
CREATE TABLE IF NOT EXISTS public.interactive_block_progress (
    id                uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    block_id          uuid NOT NULL REFERENCES public.lesson_resources(id) ON DELETE CASCADE,
    lesson_id         uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    interaction_data  jsonb DEFAULT '{}',
    is_completed      boolean DEFAULT false,
    score             numeric(5,2),
    attempts          int DEFAULT 0,
    tenant_id         uuid NOT NULL,
    created_at        timestamptz DEFAULT now() NOT NULL,
    updated_at        timestamptz DEFAULT now() NOT NULL,
    UNIQUE (user_id, block_id)
);

ALTER TABLE public.interactive_block_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ibp_user_id   ON public.interactive_block_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_ibp_block_id  ON public.interactive_block_progress(block_id);
CREATE INDEX IF NOT EXISTS idx_ibp_lesson_id ON public.interactive_block_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_ibp_tenant_id ON public.interactive_block_progress(tenant_id);

-- Students can read/write their own rows; teachers/admins can read all in tenant
CREATE POLICY "ibp_own_rows" ON public.interactive_block_progress
    FOR ALL
    USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND (
            user_id = auth.uid()
            OR public.has_role('TEACHER')
            OR public.has_role('ADMIN')
        )
    )
    WITH CHECK (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND user_id = auth.uid()
    );

GRANT ALL ON TABLE public.interactive_block_progress TO authenticated;

CREATE TRIGGER set_tenant_id_ibp
    BEFORE INSERT ON public.interactive_block_progress
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- RPC: save_interactive_progress
CREATE OR REPLACE FUNCTION public.save_interactive_progress(
    p_block_id        uuid,
    p_lesson_id       uuid,
    p_interaction_data jsonb,
    p_is_completed    boolean,
    p_score           numeric DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id   uuid;
    v_tenant_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
    v_tenant_id := public.get_my_tenant_id();

    INSERT INTO public.interactive_block_progress (
        user_id, block_id, lesson_id, interaction_data, is_completed, score, attempts, tenant_id
    )
    VALUES (v_user_id, p_block_id, p_lesson_id, p_interaction_data, p_is_completed, p_score, 1, v_tenant_id)
    ON CONFLICT (user_id, block_id) DO UPDATE SET
        interaction_data = EXCLUDED.interaction_data,
        is_completed     = CASE WHEN interactive_block_progress.is_completed THEN true ELSE EXCLUDED.is_completed END,
        score            = CASE WHEN EXCLUDED.score IS NOT NULL THEN EXCLUDED.score ELSE interactive_block_progress.score END,
        attempts         = interactive_block_progress.attempts + 1,
        updated_at       = now();
END;
$$;

REVOKE ALL ON FUNCTION public.save_interactive_progress(uuid, uuid, jsonb, boolean, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_interactive_progress(uuid, uuid, jsonb, boolean, numeric) TO authenticated;
