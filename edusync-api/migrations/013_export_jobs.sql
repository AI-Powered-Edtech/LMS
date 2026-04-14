-- Migration: 013_export_jobs.sql
-- Purpose: Tabel untuk melacak status export laporan (PDF/Excel)

CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    format TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    download_url TEXT,
    s3_key TEXT,
    error_message TEXT,
    query_params JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT valid_format CHECK (format IN ('pdf', 'excel', 'csv'))
);

-- Index untuk query by user
CREATE INDEX idx_export_jobs_user_id ON export_jobs(user_id);

-- Index untuk query pending jobs
CREATE INDEX idx_export_jobs_status ON export_jobs(status) WHERE status = 'pending';

-- Index untuk sorting
CREATE INDEX idx_export_jobs_created_at ON export_jobs(created_at DESC);

-- Trigger untuk auto-update updated_at
CREATE OR REPLACE FUNCTION update_export_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_export_jobs_updated_at
    BEFORE UPDATE ON export_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_export_jobs_updated_at();

-- Comments
COMMENT ON TABLE export_jobs IS 'Job queue untuk export laporan (PDF/Excel/CSV)';
COMMENT ON COLUMN export_jobs.report_type IS 'Tipe laporan: grades, attendance, progress';
COMMENT ON COLUMN export_jobs.format IS 'Format export: pdf, excel, csv';
COMMENT ON COLUMN export_jobs.s3_key IS 'Lokasi file hasil export di S3';
COMMENT ON COLUMN export_jobs.download_url IS 'URL untuk download file export (signed URL)';
