-- =============================================================
-- EduSync LMS — Bulk User Import: Job Tracking Table
-- =============================================================
-- Tabel untuk melacak status bulk import jobs oleh admin.
-- Setiap job merekam jumlah baris berhasil/gagal dan detail error.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.bulk_import_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by uuid NOT NULL REFERENCES auth.users(id),
    status text NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
    total_rows integer NOT NULL DEFAULT 0,
    success_rows integer NOT NULL DEFAULT 0,
    failed_rows integer NOT NULL DEFAULT 0,
    error_details jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz
);

ALTER TABLE public.bulk_import_jobs ENABLE ROW LEVEL SECURITY;

-- Admin dapat mengelola import jobs milik tenant mereka sendiri
CREATE POLICY "admin_manage_import_jobs"
    ON public.bulk_import_jobs
    FOR ALL
    USING (
        tenant_id = public.get_my_tenant_id() AND
        public.has_role(auth.uid(), public.get_my_tenant_id(), 'ADMIN')
    )
    WITH CHECK (
        tenant_id = public.get_my_tenant_id() AND
        public.has_role(auth.uid(), public.get_my_tenant_id(), 'ADMIN')
    );

-- Auto-set tenant_id saat INSERT
CREATE TRIGGER auto_set_tenant_id_bulk_import
    BEFORE INSERT ON public.bulk_import_jobs
    FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_tenant
    ON public.bulk_import_jobs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_created_by
    ON public.bulk_import_jobs (created_by);

CREATE INDEX IF NOT EXISTS idx_bulk_import_jobs_status
    ON public.bulk_import_jobs (tenant_id, status);

GRANT ALL ON TABLE public.bulk_import_jobs TO authenticated;
