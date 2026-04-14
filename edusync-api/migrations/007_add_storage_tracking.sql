-- Migration 007: Storage file migration tracking
-- Tracks migration status of files from Supabase Storage to S3

CREATE TABLE IF NOT EXISTS storage_file_migrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket          TEXT NOT NULL,
    object_path     TEXT NOT NULL,
    supabase_url    TEXT,
    s3_key          TEXT,
    checksum_sha256 TEXT,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'migrating', 'completed', 'failed', 'skipped')),
    file_size_bytes BIGINT,
    content_type    TEXT,
    tenant_id       UUID,
    error_message   TEXT,
    attempts        INTEGER NOT NULL DEFAULT 0,
    last_attempted_at TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bucket, object_path)
);

CREATE INDEX IF NOT EXISTS idx_storage_migrations_status
    ON storage_file_migrations(status);
CREATE INDEX IF NOT EXISTS idx_storage_migrations_tenant
    ON storage_file_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storage_migrations_bucket_path
    ON storage_file_migrations(bucket, object_path);

-- No RLS needed — this table is only accessed by service_role during migration
-- Storage objects themselves are already isolated by tenant_id in the path

COMMENT ON TABLE storage_file_migrations IS
    'Tracks migration of files from Supabase Storage to S3-compatible storage (R2/MinIO).
     Used during Phase 5 dual-write period and background migration.';
