-- ==========================================================================
-- PPDB (Penerimaan Peserta Didik Baru) Online
-- ==========================================================================
-- Tabel: ppdb_periods, ppdb_registrations
-- RLS: Admin-only CRUD dengan tenant isolation
-- ==========================================================================

-- ── Periode PPDB ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ppdb_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  academic_year text NOT NULL,        -- '2026/2027'
  name text NOT NULL,                 -- 'Gelombang 1', 'Gelombang 2'
  start_date date NOT NULL,
  end_date date NOT NULL,
  quota integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'closed', 'announced')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Pendaftar PPDB ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ppdb_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  period_id uuid NOT NULL REFERENCES ppdb_periods(id),
  registration_number text UNIQUE NOT NULL,   -- auto-generated: PPDB-2026-0001
  student_name text NOT NULL,
  birth_date date NOT NULL,
  gender text NOT NULL CHECK (gender IN ('L', 'P')),
  previous_school text,
  parent_name text NOT NULL,
  parent_phone text NOT NULL,
  parent_email text,
  address text,
  documents jsonb DEFAULT '{}',               -- { ijazah: url, akte: url, ... }
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'waitlisted')),
  notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE ppdb_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppdb_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_ppdb_periods" ON ppdb_periods
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND has_role('ADMIN'::app_role)
  );

CREATE POLICY "admin_manage_registrations" ON ppdb_registrations
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND has_role('ADMIN'::app_role)
  );

-- ── Triggers ──────────────────────────────────────────────────────────────

CREATE TRIGGER auto_set_tenant_id_ppdb_periods
  BEFORE INSERT ON ppdb_periods
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER auto_set_tenant_id_ppdb_registrations
  BEFORE INSERT ON ppdb_registrations
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

-- ── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX idx_ppdb_periods_tenant ON ppdb_periods(tenant_id);
CREATE INDEX idx_ppdb_reg_period ON ppdb_registrations(period_id, status);
CREATE INDEX idx_ppdb_reg_tenant ON ppdb_registrations(tenant_id);
