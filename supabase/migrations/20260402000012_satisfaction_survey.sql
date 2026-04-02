-- ==========================================================================
-- Migration: Satisfaction Survey System
-- Task 30.5 — Survey kepuasan untuk guru, siswa, dan orang tua
-- ==========================================================================

CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  title text NOT NULL,
  target_audience text NOT NULL CHECK (target_audience IN ('teachers', 'students', 'parents', 'all')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  questions jsonb NOT NULL DEFAULT '[]',
  start_date date,
  end_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES satisfaction_surveys(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  respondent_id uuid REFERENCES auth.users(id),
  answers jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Principal/Admin kelola survey (semua operasi)
CREATE POLICY "principal_manage_surveys" ON satisfaction_surveys
  FOR ALL USING (
    tenant_id = get_my_tenant_id() AND
    (has_role(auth.uid(), get_my_tenant_id(), 'PRINCIPAL') OR
     has_role(auth.uid(), get_my_tenant_id(), 'ADMIN'))
  );

-- Semua authenticated bisa melihat active surveys
CREATE POLICY "view_active_surveys" ON satisfaction_surveys
  FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND status = 'active'
  );

-- Submit response untuk authenticated users
CREATE POLICY "submit_survey_response" ON survey_responses
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id() AND
    auth.uid() IS NOT NULL
  );

-- Principal/Admin lihat semua responses
CREATE POLICY "principal_view_responses" ON survey_responses
  FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND
    (has_role(auth.uid(), get_my_tenant_id(), 'PRINCIPAL') OR
     has_role(auth.uid(), get_my_tenant_id(), 'ADMIN'))
  );

CREATE TRIGGER auto_set_tenant_id_surveys
  BEFORE INSERT ON satisfaction_surveys
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER auto_set_tenant_id_survey_responses
  BEFORE INSERT ON survey_responses
  FOR EACH ROW EXECUTE FUNCTION auto_set_tenant_id();
