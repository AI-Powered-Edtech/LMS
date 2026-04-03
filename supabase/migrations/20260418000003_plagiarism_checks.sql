-- Migration: Phase 33C — Plagiarism Detection
-- Creates plagiarism_checks table with full RLS and tenant isolation

CREATE TABLE IF NOT EXISTS public.plagiarism_checks (
    id               uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    submission_id    uuid NOT NULL REFERENCES public.assignment_submissions(id) ON DELETE CASCADE,
    provider         text DEFAULT 'internal' CHECK (provider IN ('internal','copyleaks')),
    status           text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','error')),
    similarity_score numeric(5,2),
    report_data      jsonb DEFAULT '{}',
    checked_by       uuid REFERENCES auth.users(id),
    tenant_id        uuid NOT NULL,
    created_at       timestamptz DEFAULT now() NOT NULL,
    updated_at       timestamptz DEFAULT now() NOT NULL,
    UNIQUE (submission_id)
);

ALTER TABLE public.plagiarism_checks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pc_submission_id ON public.plagiarism_checks(submission_id);
CREATE INDEX IF NOT EXISTS idx_pc_tenant_id     ON public.plagiarism_checks(tenant_id);

CREATE POLICY "pc_tenant_isolation" ON public.plagiarism_checks
    FOR ALL USING (tenant_id = (SELECT public.get_my_tenant_id()))
    WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

GRANT ALL ON TABLE public.plagiarism_checks TO authenticated;

CREATE TRIGGER set_tenant_id_pc
    BEFORE INSERT ON public.plagiarism_checks
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();
