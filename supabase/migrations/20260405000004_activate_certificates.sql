-- ============================================================
-- Sprint 1.2: Activate certificates table and RPCs
-- Previously only defined in _archive/821_achievements.sql
--
-- Certificate interface (src/features/gamification/types/index.ts):
--   id, course_id, course_title, certificate_number, issued_at,
--   template_config
--
-- issueCertificate in gamificationService.ts calls:
--   issue_certificate(p_user_id, p_course_id)  — no p_template_config
-- ============================================================

-- ============================================================
-- 1. Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id            UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id          UUID        NOT NULL REFERENCES public.courses(id)  ON DELETE CASCADE,
  certificate_number TEXT        NOT NULL UNIQUE,
  issued_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  template_config    JSONB       NOT NULL DEFAULT '{}',
  UNIQUE (user_id, course_id)
);

-- ============================================================
-- 2. RLS
-- ============================================================
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped read for the owning student (mirrors sqa_rls_audit guard;
-- the audit migration checks IF NOT EXISTS so no name collision occurs).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'certificates'
      AND policyname = 'certificates_tenant_isolation'
  ) THEN
    CREATE POLICY "certificates_tenant_isolation"
      ON public.certificates
      FOR ALL
      USING (tenant_id = (SELECT public.get_my_tenant_id()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'certificates'
      AND policyname = 'students_view_own_certificates'
  ) THEN
    CREATE POLICY "students_view_own_certificates"
      ON public.certificates
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- ============================================================
-- 3. Tenant-isolation trigger
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname   = 'certificates_auto_set_tenant'
      AND tgrelid  = 'public.certificates'::regclass
  ) THEN
    CREATE TRIGGER certificates_auto_set_tenant
      BEFORE INSERT ON public.certificates
      FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();
  END IF;
END
$$;

-- ============================================================
-- 4. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_certificates_user_id
  ON public.certificates (user_id);

CREATE INDEX IF NOT EXISTS idx_certificates_tenant_id
  ON public.certificates (tenant_id);

CREATE INDEX IF NOT EXISTS idx_certificates_course_id
  ON public.certificates (course_id);

-- Composite index matching the most common query pattern
CREATE INDEX IF NOT EXISTS idx_certificates_tenant_user
  ON public.certificates (tenant_id, user_id);

-- ============================================================
-- 5. RPC: issue_certificate
--    Signature matches gamificationService.ts:
--      supabase.rpc('issue_certificate', { p_user_id, p_course_id })
--    Returns TABLE(id, certificate_number, issued_at) as in archive.
-- ============================================================
CREATE OR REPLACE FUNCTION public.issue_certificate(
  p_user_id   UUID,
  p_course_id UUID
)
RETURNS TABLE (
  id                 UUID,
  certificate_number TEXT,
  issued_at          TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant       UUID := get_my_tenant_id();
  v_cert_number  TEXT;
  v_tenant_short TEXT;
  v_id           UUID;
  v_issued       TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  -- Only teachers/admins may issue certificates
  IF NOT (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)) THEN
    RAISE EXCEPTION 'Hanya guru atau admin yang dapat menerbitkan sertifikat';
  END IF;

  -- Build tenant-prefixed certificate number
  SELECT LEFT(REPLACE(t.name, ' ', ''), 4)
    INTO v_tenant_short
    FROM public.tenants t
   WHERE t.id = v_tenant;

  v_cert_number := 'CERT-'
    || UPPER(COALESCE(v_tenant_short, 'EDUS'))
    || '-' || TO_CHAR(now(), 'YYYYMMDD')
    || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 6));

  INSERT INTO public.certificates (tenant_id, user_id, course_id, certificate_number)
  VALUES (v_tenant, p_user_id, p_course_id, v_cert_number)
  RETURNING
    certificates.id,
    certificates.certificate_number,
    certificates.issued_at
  INTO v_id, v_cert_number, v_issued;

  RETURN QUERY SELECT v_id, v_cert_number, v_issued;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_certificate(UUID, UUID) TO authenticated;

-- ============================================================
-- 6. RPC: get_student_certificates
--    Return columns exactly match Certificate interface:
--      id, course_id, course_title, certificate_number,
--      issued_at, template_config
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_student_certificates(p_user_id UUID)
RETURNS TABLE (
  id                 UUID,
  course_id          UUID,
  course_title       TEXT,
  certificate_number TEXT,
  issued_at          TIMESTAMPTZ,
  template_config    JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cert.id,
    cert.course_id,
    co.title           AS course_title,
    cert.certificate_number,
    cert.issued_at,
    cert.template_config
  FROM public.certificates cert
  JOIN public.courses co ON co.id = cert.course_id
  WHERE cert.user_id  = p_user_id
    AND cert.tenant_id = get_my_tenant_id()
  ORDER BY cert.issued_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_certificates(UUID) TO authenticated;
