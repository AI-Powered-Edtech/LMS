-- Migration: 078_scorm_runtime_data.sql
--
-- Backfill skema yang direferensikan migration 008 (RLS list) tapi belum
-- dibuat tabelnya, plus RPC `upsert_scorm_runtime` yang dipanggil FE:
--   * lessonService.upsertScormRuntime  (Supabase RPC primary path)
--   * lessonService.sendBeaconUpsert    (BE beacon fallback path,
--                                        scorm_runtime_handler)
--
-- Dampak UX: tanpa tabel + RPC ini, kedua jalur hilang silent (RPC error
-- atau BE stub drop). Setelah migrasi: progres SCORM resume bekerja
-- (cmi.suspend_data, total_time) dan tutup-tab tidak kehilangan
-- window debounce 2 detik terakhir.

CREATE TABLE IF NOT EXISTS public.scorm_runtime_data (
    id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID             NOT NULL,
    scorm_package_id    UUID             NOT NULL,
    tenant_id           UUID             NOT NULL,
    cmi_data            JSONB            NOT NULL DEFAULT '{}'::jsonb,
    score_raw           DOUBLE PRECISION,
    score_max           DOUBLE PRECISION,
    lesson_status       TEXT,
    total_time          INTEGER,
    suspend_data        TEXT,
    created_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT scorm_runtime_data_unique_user_pkg
        UNIQUE (user_id, scorm_package_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_scorm_runtime_data_lookup
    ON public.scorm_runtime_data (user_id, scorm_package_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_scorm_runtime_data_tenant_recent
    ON public.scorm_runtime_data (tenant_id, updated_at DESC);

ALTER TABLE public.scorm_runtime_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scorm_runtime_data_select ON public.scorm_runtime_data;
CREATE POLICY scorm_runtime_data_select ON public.scorm_runtime_data
    FOR SELECT
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS scorm_runtime_data_insert ON public.scorm_runtime_data;
CREATE POLICY scorm_runtime_data_insert ON public.scorm_runtime_data
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS scorm_runtime_data_update ON public.scorm_runtime_data;
CREATE POLICY scorm_runtime_data_update ON public.scorm_runtime_data
    FOR UPDATE
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE OR REPLACE FUNCTION public.tg_scorm_runtime_data_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scorm_runtime_data_touch_updated_at
    ON public.scorm_runtime_data;
CREATE TRIGGER scorm_runtime_data_touch_updated_at
    BEFORE UPDATE ON public.scorm_runtime_data
    FOR EACH ROW EXECUTE FUNCTION public.tg_scorm_runtime_data_touch_updated_at();

-- RPC fungsi yang dipanggil FE (lessonService.upsertScormRuntime + beacon BE).
-- SECURITY DEFINER: bypass RLS karena caller (Supabase RPC dengan JWT atau
-- BE Rust dengan AuthedRequest) sudah memvalidasi tenant ownership di layer
-- atas (Rust handler cek ctx.user_id == p_user_id && ctx.tenant_id == p_tenant_id).
CREATE OR REPLACE FUNCTION public.upsert_scorm_runtime(
    p_user_id           UUID,
    p_scorm_package_id  UUID,
    p_tenant_id         UUID,
    p_cmi_data          JSONB,
    p_score_raw         DOUBLE PRECISION DEFAULT NULL,
    p_score_max         DOUBLE PRECISION DEFAULT NULL,
    p_lesson_status     TEXT             DEFAULT NULL,
    p_total_time        INTEGER          DEFAULT NULL,
    p_suspend_data      TEXT             DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.scorm_runtime_data (
        user_id, scorm_package_id, tenant_id, cmi_data,
        score_raw, score_max, lesson_status, total_time, suspend_data
    ) VALUES (
        p_user_id, p_scorm_package_id, p_tenant_id, p_cmi_data,
        p_score_raw, p_score_max, p_lesson_status, p_total_time, p_suspend_data
    )
    ON CONFLICT (user_id, scorm_package_id, tenant_id) DO UPDATE SET
        cmi_data      = EXCLUDED.cmi_data,
        score_raw     = COALESCE(EXCLUDED.score_raw, public.scorm_runtime_data.score_raw),
        score_max     = COALESCE(EXCLUDED.score_max, public.scorm_runtime_data.score_max),
        lesson_status = COALESCE(EXCLUDED.lesson_status, public.scorm_runtime_data.lesson_status),
        total_time    = COALESCE(EXCLUDED.total_time, public.scorm_runtime_data.total_time),
        suspend_data  = COALESCE(EXCLUDED.suspend_data, public.scorm_runtime_data.suspend_data),
        updated_at    = NOW();
END;
$$;

GRANT SELECT, INSERT, UPDATE ON public.scorm_runtime_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_scorm_runtime(
    UUID, UUID, UUID, JSONB, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, INTEGER, TEXT
) TO authenticated;
