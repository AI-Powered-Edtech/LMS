-- 030_admin_stub_tables_and_rpcs.sql
-- Creates stub tables + RPC for admin-/teacher-facing features that the
-- frontend references (FeatureFlags admin page, Moderation, Plagiarism,
-- School Documents, Dashboards). Prior to this migration these endpoints
-- returned 403 "Akses ditolak" because the data_plane allowlist rejected
-- unknown tables/RPCs, and 500 when FE inserted rows, because the tables
-- did not exist in Postgres at all.
--
-- Tables are intentionally minimal — columns match what the FE service
-- layer expects (see src/features/**/api/*). Admin tooling can extend
-- schemas as features fill out.

---------------------------------------------------------------------------
-- feature_flags
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  tenant_ids UUID[] NOT NULL DEFAULT '{}',
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_flags_tenants_gin
  ON feature_flags USING gin (tenant_ids);

---------------------------------------------------------------------------
-- content_reports (moderation)
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  content_id TEXT NOT NULL,
  content_type TEXT NOT NULL,           -- post | comment | assignment | user
  reporter_id UUID,
  reporter_name TEXT,
  reason TEXT NOT NULL,                 -- ai_generated|inappropriate|spam|harassment|other
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  content_snippet TEXT,
  content_author TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS content_reports_tenant_created
  ON content_reports (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS content_reports_status
  ON content_reports (tenant_id, status);

---------------------------------------------------------------------------
-- plagiarism_checks
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plagiarism_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  submission_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'pending',   -- pending|completed|failed
  similarity_score NUMERIC(5,2),
  report_data JSONB,
  checked_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS plagiarism_checks_tenant_created
  ON plagiarism_checks (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS plagiarism_checks_submission
  ON plagiarism_checks (submission_id);

---------------------------------------------------------------------------
-- school_documents
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS school_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,       -- surat_masuk|surat_keluar|sk|pengumuman|rapor|umum
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'admin', -- admin|teacher|all
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_documents_tenant_created
  ON school_documents (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS school_documents_tenant_category
  ON school_documents (tenant_id, category);

---------------------------------------------------------------------------
-- dashboards + get_dashboards RPC
---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '[]'::JSONB,
  widgets JSONB NOT NULL DEFAULT '[]'::JSONB,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboards_owner
  ON dashboards (tenant_id, owner_id);
CREATE INDEX IF NOT EXISTS dashboards_shared
  ON dashboards (tenant_id, is_shared);

-- Stub RPC returning the caller's own + shared dashboards.
-- The data_plane routes RPCs as POST /api/v1/rpc/<name> with JSON args.
-- The existing handler binds session claims (tenant_id, user_id) into the
-- SQL via SET LOCAL before calling the function, so this RPC uses
-- current_setting() to scope the result.
CREATE OR REPLACE FUNCTION get_dashboards(p_include_shared BOOLEAN DEFAULT TRUE)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tenant UUID := NULLIF(current_setting('request.jwt.claim.tenant_id', TRUE), '')::UUID;
  v_user   UUID := NULLIF(current_setting('request.jwt.claim.sub', TRUE), '')::UUID;
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.updated_at DESC), '[]'::JSONB)
  INTO v_result
  FROM dashboards d
  WHERE (v_tenant IS NULL OR d.tenant_id = v_tenant)
    AND (
      d.owner_id = v_user
      OR (p_include_shared AND d.is_shared)
    );

  RETURN v_result;
END;
$$;
