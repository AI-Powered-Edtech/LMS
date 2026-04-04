-- ============================================================
-- Migration: Course Governance
-- Phase D1 — Collaboration hardening + audit trail
--
-- Review fixes (2026-04-04):
--   C1: user_id now nullable (was NOT NULL + ON DELETE SET NULL contradiction)
--   C2: rpc_check_builder_access scoped to caller tenant_id
--   C3: trigger raises explicit exception on missing course
--   H3: GRANT EXECUTE + GRANT SELECT/INSERT added
--   M1: Read policy restricted to staff roles only
-- ============================================================

-- 1. RPC: rpc_check_builder_access
-- SECURITY NOTE: SECURITY DEFINER bypasses RLS on accessed tables.
-- Explicit tenant_id filtering is therefore mandatory.

CREATE OR REPLACE FUNCTION public.rpc_check_builder_access(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_tenant_id := public.get_my_tenant_id();
  IF v_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = p_course_id
      AND created_by = auth.uid()
      AND tenant_id = v_tenant_id

    UNION ALL

    SELECT 1
    FROM public.course_collaborators
    WHERE course_id = p_course_id
      AND user_id = auth.uid()
      AND tenant_id = v_tenant_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_check_builder_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_check_builder_access(UUID) TO authenticated;

COMMENT ON FUNCTION public.rpc_check_builder_access(UUID) IS
  'Server-authoritative check: returns TRUE if auth.uid() is course creator or listed collaborator, scoped to caller tenant. SECURITY DEFINER - explicit tenant_id filtering required.';

-- 2. Table: course_action_logs

CREATE TABLE IF NOT EXISTS public.course_action_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  -- nullable: ON DELETE SET NULL preserves audit history when a user is deleted
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT course_action_logs_action_type_check CHECK (
    action_type IN (
      'publish', 'unpublish', 'submit_review', 'approve',
      'restore_version', 'add_collaborator', 'remove_collaborator', 'archive'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_course_action_logs_course_created
  ON public.course_action_logs (course_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_course_action_logs_tenant
  ON public.course_action_logs (tenant_id, created_at DESC);

GRANT SELECT, INSERT ON TABLE public.course_action_logs TO authenticated;

-- 2a. Trigger: auto-set tenant_id

CREATE OR REPLACE FUNCTION public.auto_set_tenant_id_from_course()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM public.courses
    WHERE id = NEW.course_id;

    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION
        'course_action_logs: cannot resolve tenant_id for course_id=%. Course not found.',
        NEW.course_id
        USING ERRCODE = 'foreign_key_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_action_logs_tenant ON public.course_action_logs;
CREATE TRIGGER trg_course_action_logs_tenant
  BEFORE INSERT ON public.course_action_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id_from_course();

-- 2b. RLS

ALTER TABLE public.course_action_logs ENABLE ROW LEVEL SECURITY;

-- Read: staff only (teacher/admin/principal) — students must not see governance logs
CREATE POLICY "course_action_logs_read_staff"
  ON public.course_action_logs
  FOR SELECT
  USING (
    tenant_id = public.get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = public.get_my_tenant_id()
        AND ur.role IN ('teacher', 'admin', 'principal')
    )
  );

-- Insert: authenticated users only, user_id must match auth.uid()
CREATE POLICY "course_action_logs_insert_authenticated"
  ON public.course_action_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id = auth.uid() OR user_id IS NULL)
  );

-- No UPDATE or DELETE — audit logs are append-only

COMMENT ON TABLE public.course_action_logs IS
  'Append-only audit trail for course governance actions. user_id nullable to survive user account deletion.';
