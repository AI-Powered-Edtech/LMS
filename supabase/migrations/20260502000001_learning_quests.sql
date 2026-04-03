-- Phase 36A: Learning Quests / Missions System
-- Creates quests and quest_progress tables with RLS,
-- plus get_active_quests_with_progress RPC.

-- ────────────────────────────────────────────────────────────
-- 1. ENUM
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE public.quest_type AS ENUM ('daily','weekly','milestone','challenge');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. QUESTS (definitions managed by teacher/admin)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quests (
    id            uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title         text NOT NULL,
    description   text,
    quest_type    public.quest_type NOT NULL DEFAULT 'weekly',
    icon          text DEFAULT '🎯',
    conditions    jsonb NOT NULL DEFAULT '{}',
    xp_reward     int NOT NULL DEFAULT 50,
    badge_id      uuid REFERENCES public.badge_definitions(id) ON DELETE SET NULL,
    sort_order    int DEFAULT 0,
    is_active     boolean DEFAULT true,
    tenant_id     uuid NOT NULL,
    created_by    uuid REFERENCES auth.users(id),
    created_at    timestamptz DEFAULT now() NOT NULL,
    updated_at    timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quests_tenant_id  ON public.quests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quests_quest_type ON public.quests(quest_type);

-- Students & teachers can read active quests in their tenant
DROP POLICY IF EXISTS "quests_read_all" ON public.quests;
CREATE POLICY "quests_read_all" ON public.quests
    FOR SELECT USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND is_active = true
    );

-- Admins and teachers can write
DROP POLICY IF EXISTS "quests_write_admin" ON public.quests;
CREATE POLICY "quests_write_admin" ON public.quests
    FOR ALL USING (
        tenant_id = (SELECT public.get_my_tenant_id())
        AND (public.has_role('ADMIN') OR public.has_role('TEACHER'))
    )
    WITH CHECK (
        tenant_id = (SELECT public.get_my_tenant_id())
    );

GRANT ALL ON TABLE public.quests TO authenticated;

CREATE OR REPLACE TRIGGER set_tenant_id_quests
    BEFORE INSERT ON public.quests
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ────────────────────────────────────────────────────────────
-- 3. QUEST_PROGRESS (per-user progress rows)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quest_progress (
    id           uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    quest_id     uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES auth.users(id),
    progress     int DEFAULT 0,
    target       int DEFAULT 1,
    is_completed boolean DEFAULT false,
    completed_at timestamptz,
    tenant_id    uuid NOT NULL,
    week_key     text,  -- e.g. "2026-W15" for weekly quests
    created_at   timestamptz DEFAULT now() NOT NULL,
    updated_at   timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qp_user_id   ON public.quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_qp_quest_id  ON public.quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_qp_tenant_id ON public.quest_progress(tenant_id);

-- Each student sees their own rows; teachers/admins can read all
DROP POLICY IF EXISTS "qp_own_rows" ON public.quest_progress;
CREATE POLICY "qp_own_rows" ON public.quest_progress
    FOR ALL USING (
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

GRANT ALL ON TABLE public.quest_progress TO authenticated;

CREATE OR REPLACE TRIGGER set_tenant_id_qp
    BEFORE INSERT ON public.quest_progress
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ────────────────────────────────────────────────────────────
-- 4. RPC: get_active_quests_with_progress
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_active_quests_with_progress(p_tenant_id uuid)
RETURNS TABLE (
    quest_id     uuid,
    title        text,
    description  text,
    quest_type   text,
    icon         text,
    xp_reward    int,
    progress     int,
    target       int,
    is_completed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id uuid;
    v_week    text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- ISO week key, e.g. "2026-W15"
    v_week := TO_CHAR(NOW(), 'IYYY-"W"IW');

    RETURN QUERY
    SELECT
        q.id                                                          AS quest_id,
        q.title,
        q.description,
        q.quest_type::text,
        q.icon,
        q.xp_reward,
        COALESCE(qp.progress, 0)                                      AS progress,
        COALESCE(qp.target, (q.conditions->>'target')::int, 1)        AS target,
        COALESCE(qp.is_completed, false)                              AS is_completed
    FROM public.quests q
    LEFT JOIN public.quest_progress qp
           ON qp.quest_id = q.id
          AND qp.user_id  = v_user_id
          AND (q.quest_type != 'weekly' OR qp.week_key = v_week)
    WHERE q.tenant_id = p_tenant_id
      AND q.is_active  = true
    ORDER BY q.sort_order, q.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_quests_with_progress(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_active_quests_with_progress(uuid) TO authenticated;
