-- Sprint 3.1: Composite indexes on admin_audit_logs
-- ============================================================
-- Table confirmed as public.admin_audit_logs (baseline line 6166).
-- Columns verified: tenant_id UUID, action TEXT, created_at TIMESTAMPTZ.
--
-- Existing single-column indexes (from 000_baseline.sql):
--   idx_admin_audit_logs_tenant_id   ON (tenant_id)
--   idx_admin_audit_logs_created_at  ON (created_at DESC)
--   idx_admin_audit_logs_action      ON (action)
--
-- The get_audit_logs RPC always filters by tenant_id and orders
-- by created_at DESC, so the two separate indexes above force a
-- bitmap-AND or sequential scan.  A composite index on
-- (tenant_id, created_at DESC) enables an index-only scan for
-- that query pattern.
--
-- A second composite index on (tenant_id, action, created_at DESC)
-- covers the filtered variant: WHERE tenant_id = ? AND action = ?
-- ORDER BY created_at DESC, which is common in the admin audit
-- export and filter UI.
-- ============================================================

-- Index 1: Primary composite — tenant + time ordering
-- Covers: SELECT … FROM admin_audit_logs WHERE tenant_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_tenant_created_at
  ON public.admin_audit_logs (tenant_id, created_at DESC);

-- Index 2: Filtered composite — tenant + action type + time ordering
-- Covers: SELECT … FROM admin_audit_logs WHERE tenant_id = ? AND action = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_tenant_action_created_at
  ON public.admin_audit_logs (tenant_id, action, created_at DESC);
