-- ==========================================================================
-- Migration: Before-After Analytics
-- Task 30.4 — Tabel baseline metrics untuk perbandingan sebelum vs sesudah LMS
-- ==========================================================================

CREATE TABLE IF NOT EXISTS school_baseline_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  baseline_date date NOT NULL,
  avg_grade_before numeric(5,2),          -- rata-rata nilai sebelum LMS
  attendance_rate_before numeric(5,2),    -- % kehadiran sebelum LMS
  paper_cost_monthly_rp integer,          -- biaya kertas/bulan sebelum LMS (Rp)
  teacher_grading_hours_weekly numeric(5,2), -- jam guru koreksi/minggu sebelum LMS
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE school_baseline_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "principal_admin_manage_baseline" ON school_baseline_metrics
  FOR ALL USING (
    tenant_id = get_my_tenant_id() AND
    (has_role(auth.uid(), get_my_tenant_id(), 'PRINCIPAL') OR
     has_role(auth.uid(), get_my_tenant_id(), 'ADMIN'))
  );

CREATE TRIGGER auto_set_tenant_id_baseline
  BEFORE INSERT ON school_baseline_metrics
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
