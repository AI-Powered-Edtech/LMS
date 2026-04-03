-- ============================================================
-- Phase 32B: Video CDN + Adaptive Streaming
-- ============================================================

CREATE TABLE IF NOT EXISTS public.video_assets (
    id                uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    lesson_id         uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
    block_id          uuid REFERENCES public.lesson_resources(id) ON DELETE SET NULL,
    provider          text NOT NULL DEFAULT 'mux' CHECK (provider IN ('mux', 'bunny', 'direct')),
    provider_asset_id text,
    playback_id       text,
    status            text NOT NULL DEFAULT 'processing'
                          CHECK (status IN ('processing', 'ready', 'error', 'deleted')),
    duration_seconds  int,
    resolution        text,
    thumbnail_url     text,
    hls_url           text,
    dash_url          text,
    mp4_url           text,
    original_filename text,
    file_size_bytes   bigint,
    metadata          jsonb DEFAULT '{}',
    error_message     text,
    tenant_id         uuid NOT NULL,
    created_by        uuid NOT NULL REFERENCES auth.users(id),
    created_at        timestamptz DEFAULT now() NOT NULL,
    updated_at        timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_video_assets_tenant_id   ON public.video_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_block_id    ON public.video_assets(block_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_lesson_id   ON public.video_assets(lesson_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_status      ON public.video_assets(status);

CREATE POLICY "video_assets_tenant_isolation" ON public.video_assets
    FOR ALL
    USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.video_assets TO authenticated;

CREATE TRIGGER set_tenant_id_video_assets
    BEFORE INSERT ON public.video_assets
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();
