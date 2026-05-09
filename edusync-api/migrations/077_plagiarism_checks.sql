-- 077_plagiarism_checks.sql
-- Plagiarism check history table.
--
-- FE `PlagiarismDashboard` reads this via Supabase (`plagiarismService.getAllChecks` /
-- `getCheckResult`); BE writes here from POST /api/v1/plagiarism/check
-- (`services::plagiarism::check_plagiarism`).
--
-- Replaces the previously-undeclared `plagiarism_reports` table that the BE
-- INSERTed into without a matching migration.

CREATE TABLE IF NOT EXISTS public.plagiarism_checks (
    id                UUID         PRIMARY KEY,
    submission_id     UUID         NOT NULL,
    provider          TEXT         NOT NULL,                                                                  -- 'internal' | 'copyleaks'
    status            TEXT         NOT NULL CHECK (status IN ('pending','processing','completed','error')),
    similarity_score  INTEGER      NULL CHECK (similarity_score IS NULL OR (similarity_score BETWEEN 0 AND 100)),
    report_data       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    checked_by        UUID         NULL,
    tenant_id         UUID         NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_submission
    ON public.plagiarism_checks (submission_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_plagiarism_checks_tenant
    ON public.plagiarism_checks (tenant_id, created_at DESC);

-- ─── RLS ─ tenant isolation ──────────────────────────────────────────────────────────
ALTER TABLE public.plagiarism_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plagiarism_checks_tenant_select ON public.plagiarism_checks;
CREATE POLICY plagiarism_checks_tenant_select
    ON public.plagiarism_checks
    FOR SELECT
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS plagiarism_checks_tenant_insert ON public.plagiarism_checks;
CREATE POLICY plagiarism_checks_tenant_insert
    ON public.plagiarism_checks
    FOR INSERT
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS plagiarism_checks_tenant_update ON public.plagiarism_checks;
CREATE POLICY plagiarism_checks_tenant_update
    ON public.plagiarism_checks
    FOR UPDATE
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- ─── updated_at trigger ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_plagiarism_checks_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plagiarism_checks_touch_updated_at ON public.plagiarism_checks;
CREATE TRIGGER plagiarism_checks_touch_updated_at
    BEFORE UPDATE ON public.plagiarism_checks
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_plagiarism_checks_touch_updated_at();
