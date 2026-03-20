-- ============================================================
-- SP-18: In-App Learning Guidance
-- Teacher-configurable hints, tips, and walkthroughs shown during lessons
-- Tables: learning_guides, guide_interactions
-- RPCs: upsert_learning_guide, delete_learning_guide,
--        get_applicable_guides, record_guide_interaction, list_learning_guides
-- ============================================================

-- ----------------------------------------------------------------
-- learning_guides: teacher-created contextual guidance
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_guides (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id),
    created_by      UUID NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    guide_type      TEXT NOT NULL CHECK (guide_type IN ('tooltip', 'banner', 'walkthrough', 'checkpoint')),
    target_type     TEXT NOT NULL CHECK (target_type IN ('lesson', 'course', 'quiz')),
    target_id       UUID NOT NULL,
    segment         TEXT NOT NULL DEFAULT 'all'
                    CHECK (segment IN ('all', 'at_risk', 'low', 'medium', 'high', 'struggling')),
    trigger_type    TEXT NOT NULL DEFAULT 'on_enter'
                    CHECK (trigger_type IN ('on_enter', 'after_seconds', 'on_struggle', 'on_idle')),
    trigger_value   INT DEFAULT 0,
    priority        INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    max_impressions INT,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_guides_tenant
    ON public.learning_guides (tenant_id);
CREATE INDEX IF NOT EXISTS idx_learning_guides_active_target
    ON public.learning_guides (tenant_id, target_type, target_id)
    WHERE is_active = true;

-- ----------------------------------------------------------------
-- guide_interactions: tracks per-user guide events
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guide_interactions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    guide_id    UUID NOT NULL REFERENCES public.learning_guides(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL,
    action      TEXT NOT NULL CHECK (action IN ('shown', 'dismissed', 'completed', 'clicked')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guide_interactions_user
    ON public.guide_interactions (tenant_id, user_id, guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_interactions_guide
    ON public.guide_interactions (guide_id, action);

-- RLS
ALTER TABLE public.learning_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_interactions ENABLE ROW LEVEL SECURITY;

-- Teachers/admins can fully manage guides in their tenant
CREATE POLICY "guides_teacher_all"
    ON public.learning_guides
    FOR ALL USING (
        tenant_id = public.get_my_tenant_id()
        AND (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role))
    );

-- Students can read active guides in their tenant
CREATE POLICY "guides_student_read"
    ON public.learning_guides
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id()
        AND is_active = true
    );

-- Users manage their own interactions
CREATE POLICY "interactions_own"
    ON public.guide_interactions
    FOR ALL USING (
        tenant_id = public.get_my_tenant_id()
        AND user_id = auth.uid()
    );

-- Teachers can read all interactions in their tenant
CREATE POLICY "interactions_teacher_read"
    ON public.guide_interactions
    FOR SELECT USING (
        tenant_id = public.get_my_tenant_id()
        AND (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role))
    );

-- ----------------------------------------------------------------
-- upsert_learning_guide — create or update a guide (teacher only)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_learning_guide(
    p_guide_id       UUID DEFAULT NULL,
    p_title          TEXT DEFAULT NULL,
    p_content        TEXT DEFAULT NULL,
    p_guide_type     TEXT DEFAULT 'banner',
    p_target_type    TEXT DEFAULT 'lesson',
    p_target_id      UUID DEFAULT NULL,
    p_segment        TEXT DEFAULT 'all',
    p_trigger_type   TEXT DEFAULT 'on_enter',
    p_trigger_value  INT DEFAULT 0,
    p_priority       INT DEFAULT 0,
    p_is_active      BOOLEAN DEFAULT true,
    p_max_impressions INT DEFAULT NULL,
    p_starts_at      TIMESTAMPTZ DEFAULT NULL,
    p_ends_at        TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role)) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: must be teacher or admin';
    END IF;

    IF p_guide_id IS NOT NULL THEN
        UPDATE public.learning_guides SET
            title           = COALESCE(p_title, title),
            content         = COALESCE(p_content, content),
            guide_type      = COALESCE(p_guide_type, guide_type),
            target_type     = COALESCE(p_target_type, target_type),
            target_id       = COALESCE(p_target_id, target_id),
            segment         = COALESCE(p_segment, segment),
            trigger_type    = COALESCE(p_trigger_type, trigger_type),
            trigger_value   = COALESCE(p_trigger_value, trigger_value),
            priority        = COALESCE(p_priority, priority),
            is_active       = COALESCE(p_is_active, is_active),
            max_impressions = p_max_impressions,
            starts_at       = p_starts_at,
            ends_at         = p_ends_at,
            updated_at      = NOW()
        WHERE id = p_guide_id
          AND tenant_id = public.get_my_tenant_id()
        RETURNING id INTO v_id;
    ELSE
        INSERT INTO public.learning_guides (
            tenant_id, created_by, title, content, guide_type,
            target_type, target_id, segment, trigger_type, trigger_value,
            priority, is_active, max_impressions, starts_at, ends_at
        ) VALUES (
            public.get_my_tenant_id(), auth.uid(),
            p_title, p_content, p_guide_type,
            p_target_type, p_target_id, p_segment, p_trigger_type, p_trigger_value,
            p_priority, p_is_active, p_max_impressions, p_starts_at, p_ends_at
        ) RETURNING id INTO v_id;
    END IF;

    RETURN v_id;
END;
$$;

-- ----------------------------------------------------------------
-- delete_learning_guide — teacher only
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_learning_guide(p_guide_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF NOT (public.has_role('TEACHER'::public.app_role) OR public.has_role('ADMIN'::public.app_role)) THEN
        RAISE EXCEPTION 'PERMISSION_DENIED: must be teacher or admin';
    END IF;

    DELETE FROM public.learning_guides
    WHERE id = p_guide_id
      AND tenant_id = public.get_my_tenant_id();
END;
$$;

-- ----------------------------------------------------------------
-- get_applicable_guides — student-facing
-- Returns guides applicable to the current user for a given target,
-- filtered by segment (engagement_segment + struggle_score) and impressions
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_applicable_guides(
    p_target_type TEXT,
    p_target_id   UUID
)
RETURNS TABLE (
    id              UUID,
    title           TEXT,
    content         TEXT,
    guide_type      TEXT,
    trigger_type    TEXT,
    trigger_value   INT,
    priority        INT,
    impression_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        lg.id, lg.title, lg.content, lg.guide_type,
        lg.trigger_type, lg.trigger_value, lg.priority,
        COALESCE(ic.cnt, 0) AS impression_count
    FROM public.learning_guides lg
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM public.guide_interactions gi
        WHERE gi.guide_id = lg.id
          AND gi.user_id = auth.uid()
          AND gi.action = 'shown'
    ) ic ON true
    LEFT JOIN public.student_lesson_signals sls
        ON lg.target_type = 'lesson'
        AND sls.user_id = auth.uid()
        AND sls.lesson_id = lg.target_id
        AND sls.tenant_id = lg.tenant_id
    WHERE lg.tenant_id = public.get_my_tenant_id()
      AND lg.is_active = true
      AND lg.target_type = p_target_type
      AND lg.target_id = p_target_id
      AND (lg.starts_at IS NULL OR lg.starts_at <= NOW())
      AND (lg.ends_at IS NULL OR lg.ends_at > NOW())
      AND (lg.max_impressions IS NULL OR COALESCE(ic.cnt, 0) < lg.max_impressions)
      AND (
          lg.segment = 'all'
          OR (lg.segment = 'struggling' AND COALESCE(sls.struggle_score, 0) >= 3)
          OR (lg.segment = 'at_risk'    AND sls.engagement_segment = 'at_risk')
          OR (lg.segment = 'low'        AND sls.engagement_segment = 'low')
          OR (lg.segment = 'medium'     AND sls.engagement_segment = 'medium')
          OR (lg.segment = 'high'       AND sls.engagement_segment = 'high')
      )
    ORDER BY lg.priority DESC, lg.created_at DESC;
$$;

-- ----------------------------------------------------------------
-- record_guide_interaction — called by frontend when guide is shown/dismissed
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_guide_interaction(
    p_guide_id UUID,
    p_action   TEXT DEFAULT 'shown'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.guide_interactions (tenant_id, guide_id, user_id, action)
    VALUES (public.get_my_tenant_id(), p_guide_id, auth.uid(), p_action);
END;
$$;

-- ----------------------------------------------------------------
-- list_learning_guides — teacher management view with aggregate stats
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_learning_guides(
    p_target_type TEXT DEFAULT NULL,
    p_target_id   UUID DEFAULT NULL
)
RETURNS TABLE (
    id                UUID,
    title             TEXT,
    content           TEXT,
    guide_type        TEXT,
    target_type       TEXT,
    target_id         UUID,
    segment           TEXT,
    trigger_type      TEXT,
    trigger_value     INT,
    priority          INT,
    is_active         BOOLEAN,
    max_impressions   INT,
    starts_at         TIMESTAMPTZ,
    ends_at           TIMESTAMPTZ,
    total_impressions BIGINT,
    total_dismissals  BIGINT,
    total_completions BIGINT,
    created_at        TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        lg.id, lg.title, lg.content, lg.guide_type,
        lg.target_type, lg.target_id, lg.segment,
        lg.trigger_type, lg.trigger_value, lg.priority,
        lg.is_active, lg.max_impressions, lg.starts_at, lg.ends_at,
        COUNT(gi.id) FILTER (WHERE gi.action = 'shown'),
        COUNT(gi.id) FILTER (WHERE gi.action = 'dismissed'),
        COUNT(gi.id) FILTER (WHERE gi.action = 'completed'),
        lg.created_at
    FROM public.learning_guides lg
    LEFT JOIN public.guide_interactions gi ON gi.guide_id = lg.id
    WHERE lg.tenant_id = public.get_my_tenant_id()
      AND (p_target_type IS NULL OR lg.target_type = p_target_type)
      AND (p_target_id IS NULL OR lg.target_id = p_target_id)
    GROUP BY lg.id
    ORDER BY lg.is_active DESC, lg.priority DESC, lg.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_learning_guide(UUID,TEXT,TEXT,TEXT,TEXT,UUID,TEXT,TEXT,INT,INT,BOOLEAN,INT,TIMESTAMPTZ,TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_learning_guide(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_applicable_guides(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_guide_interaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_learning_guides(TEXT, UUID) TO authenticated;
GRANT ALL ON TABLE public.learning_guides TO authenticated;
GRANT ALL ON TABLE public.guide_interactions TO authenticated;
