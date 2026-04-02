-- =============================================================================
-- Migration 20260402000007: Parent & Principal Role Foundation
-- Wave 3 — Task 29.1 + 30.1
-- =============================================================================
-- Adds PARENT and PRINCIPAL roles to the app_role enum, creates supporting
-- tables (student_parent_links, principal_settings), RLS policies, indexes,
-- and RPC functions needed for Wave 4 & Wave 5 feature development.
-- =============================================================================

-- ============================================================
-- BAGIAN 1: PARENT ROLE
-- ============================================================

-- Tambah PARENT ke app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'PARENT';

-- Tabel link orang tua - anak
CREATE TABLE IF NOT EXISTS public.student_parent_links (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship text       NOT NULL DEFAULT 'wali'
                          CHECK (relationship IN ('ayah', 'ibu', 'wali', 'kakak')),
  is_primary  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, parent_id, tenant_id)
);

ALTER TABLE public.student_parent_links ENABLE ROW LEVEL SECURITY;

-- RLS: parent bisa lihat links yang melibatkan diri mereka sendiri
CREATE POLICY "parent_view_own_links" ON public.student_parent_links
  FOR SELECT USING (
    parent_id = auth.uid()
    OR has_role('ADMIN'::public.app_role)
  );

-- Admin bisa manage semua links dalam tenant mereka
CREATE POLICY "admin_manage_links" ON public.student_parent_links
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND has_role('ADMIN'::public.app_role)
  );

-- Auto-set tenant_id via existing trigger function
CREATE TRIGGER auto_set_tenant_id_parent_links
  BEFORE INSERT ON public.student_parent_links
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Index untuk performa query per parent dan per student
CREATE INDEX IF NOT EXISTS idx_parent_links_parent_id
  ON public.student_parent_links (parent_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_parent_links_student_id
  ON public.student_parent_links (student_id, tenant_id);

-- RPC: get_my_children() — digunakan oleh Parent dashboard
CREATE OR REPLACE FUNCTION public.get_my_children()
RETURNS TABLE (
  student_id    uuid,
  student_name  text,
  student_avatar text,
  class_name    text,
  relationship  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id                                        AS student_id,
    p.full_name                                 AS student_name,
    p.avatar_url                                AS student_avatar,
    COALESCE(c.name, 'Tidak ada kelas')         AS class_name,
    spl.relationship
  FROM public.student_parent_links spl
  JOIN public.profiles p ON p.id = spl.student_id
  LEFT JOIN public.enrollments e
    ON e.user_id = spl.student_id
    AND e.tenant_id = spl.tenant_id
  LEFT JOIN public.classrooms c ON c.id = e.classroom_id
  WHERE spl.parent_id = auth.uid()
    AND spl.tenant_id = public.get_my_tenant_id();
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_children() TO authenticated;

-- ============================================================
-- BAGIAN 2: PRINCIPAL ROLE
-- ============================================================

-- Tambah PRINCIPAL ke app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'PRINCIPAL';

-- Tabel settings untuk principal dashboard (satu record per tenant)
CREATE TABLE IF NOT EXISTS public.principal_settings (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  dashboard_widgets jsonb       NOT NULL DEFAULT '["adoption", "academic", "roi", "teachers"]',
  report_schedule   text        DEFAULT NULL
                                CHECK (report_schedule IN ('monthly', 'weekly')),
  report_email      text        DEFAULT NULL,
  baseline_date     date        DEFAULT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.principal_settings ENABLE ROW LEVEL SECURITY;

-- Principal dan Admin bisa manage settings tenant mereka sendiri
CREATE POLICY "principal_manage_settings" ON public.principal_settings
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND (
      has_role('PRINCIPAL'::public.app_role)
      OR has_role('ADMIN'::public.app_role)
    )
  );

-- Auto-set tenant_id
CREATE TRIGGER auto_set_tenant_id_principal_settings
  BEFORE INSERT ON public.principal_settings
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Auto-update updated_at
CREATE TRIGGER principal_settings_updated_at
  BEFORE UPDATE ON public.principal_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: get_executive_overview() — digunakan oleh Principal dashboard
CREATE OR REPLACE FUNCTION public.get_executive_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id        uuid;
  v_total_students   integer;
  v_active_students  integer;
  v_total_teachers   integer;
  v_active_teachers  integer;
  v_total_courses    integer;
  v_avg_quiz_score   numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_tenant_id := public.get_my_tenant_id();

  SELECT COUNT(*) INTO v_total_students
  FROM public.user_roles
  WHERE tenant_id = v_tenant_id AND role = 'STUDENT';

  SELECT COUNT(DISTINCT user_id) INTO v_active_students
  FROM public.activity_events
  WHERE tenant_id = v_tenant_id
    AND created_at > now() - interval '7 days';

  SELECT COUNT(*) INTO v_total_teachers
  FROM public.user_roles
  WHERE tenant_id = v_tenant_id AND role = 'TEACHER';

  SELECT COUNT(DISTINCT teacher_id) INTO v_active_teachers
  FROM public.classrooms
  WHERE tenant_id = v_tenant_id
    AND created_at > now() - interval '30 days';

  SELECT COUNT(*) INTO v_total_courses
  FROM public.courses
  WHERE tenant_id = v_tenant_id AND status = 'published';

  SELECT AVG(score) INTO v_avg_quiz_score
  FROM public.quiz_attempts
  WHERE tenant_id = v_tenant_id AND status = 'completed';

  RETURN json_build_object(
    'total_students',   v_total_students,
    'active_students',  v_active_students,
    'total_teachers',   v_total_teachers,
    'active_teachers',  v_active_teachers,
    'total_courses',    v_total_courses,
    'avg_quiz_score',   ROUND(COALESCE(v_avg_quiz_score, 0), 1),
    'adoption_rate',    CASE
                          WHEN v_total_students > 0
                          THEN ROUND((v_active_students::numeric / v_total_students * 100), 1)
                          ELSE 0
                        END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_executive_overview() TO authenticated;
