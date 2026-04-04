-- ============================================================
-- Migration: Course Governance
-- Phase D1 — Collaboration hardening + audit trail
--
-- Changes:
--   1. RPC: rpc_check_builder_access — server-authoritative channel guard
--   2. Table: course_action_logs — audit trail for sensitive course actions
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. RPC: rpc_check_builder_access
-- Returns TRUE if the calling user is authorized to edit the
-- given course (creator OR listed collaborator).
-- Used by useBuilderChannel to prevent unauthorized broadcasts.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_check_builder_access(p_course_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = p_course_id
      AND created_by = auth.uid()

    UNION ALL

    SELECT 1
    FROM public.course_collaborators
    WHERE course_id = p_course_id
      AND user_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.rpc_check_builder_access(UUID) IS
  'Server-authoritative check: returns TRUE if auth.uid() is the course creator or a listed collaborator. Used by the real-time builder channel to guard broadcast access.';

-- ─────────────────────────────────────────────────────────────
-- 2. Table: course_action_logs
-- Append-only audit trail for governance-sensitive course actions.
-- Tenant-scoped + RLS.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.course_action_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  course_id   UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)     ON DELETE SET NULL,
  action_type TEXT        NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT course_action_logs_action_type_check CHECK (
    action_type IN (
      'publish',
      'unpublish',
      'submit_review',
      'approve',
      'restore_version',
      'add_collaborator',
      'remove_collaborator',
      'archive'
    )
  )
);

-- Index for efficient per-course feed queries (latest-first)
CREATE INDEX IF NOT EXISTS idx_course_action_logs_course_created
  ON public.course_action_logs (course_id, created_at DESC);

-- Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_course_action_logs_tenant
  ON public.course_action_logs (tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 2a. Trigger: auto-set tenant_id from courses.tenant_id
-- ─────────────────────────────────────────────────────────────

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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_action_logs_tenant ON public.course_action_logs;
CREATE TRIGGER trg_course_action_logs_tenant
  BEFORE INSERT ON public.course_action_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tenant_id_from_course();

-- ─────────────────────────────────────────────────────────────
-- 2b. RLS on course_action_logs
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.course_action_logs ENABLE ROW LEVEL SECURITY;

-- Read: any member of the tenant can see logs for their tenant's courses
CREATE POLICY "course_action_logs_read_own_tenant"
  ON public.course_action_logs
  FOR SELECT
  USING (tenant_id = public.get_my_tenant_id());

-- Insert: any authenticated user can append logs (write-only audit)
-- (The service/RPC layer controls what gets logged — no anonymous writes)
CREATE POLICY "course_action_logs_insert_authenticated"
  ON public.course_action_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND tenant_id = public.get_my_tenant_id()
    AND user_id = auth.uid()
  );

-- No UPDATE or DELETE — audit logs are append-only

COMMENT ON TABLE public.course_action_logs IS
  'Append-only audit trail for sensitive course governance actions: publish, approve, restore, collaborator changes, etc.';
