-- ==========================================================================
-- Migration: LTI 1.3 + SCORM Integration
--
-- Adds tables for:
--   1. LTI 1.3 Tool Provider (platform registrations, nonces, sessions)
--   2. SCORM 1.2/2004 Player (packages, runtime data)
--   3. Extends lesson_resources type CHECK for 'scorm'
--   4. RPC for atomic SCORM runtime upsert + lesson_progress sync
--
-- Safety: No overlap with Course Builder (Phase 1) tables or functions.
-- ==========================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. LTI PLATFORM REGISTRATIONS
-- Stores external LMS configs (Canvas, Moodle, etc.)
-- One registration per platform per tenant.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lti_platform_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  name            text NOT NULL,
  issuer          text NOT NULL,
  client_id       text NOT NULL,
  auth_endpoint   text NOT NULL,
  token_endpoint  text NOT NULL,
  jwks_url        text NOT NULL,
  deployment_id   text,
  is_active       boolean DEFAULT true NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, issuer, client_id)
);

ALTER TABLE public.lti_platform_registrations ENABLE ROW LEVEL SECURITY;

-- Admin-only full access
CREATE POLICY "lti_platforms_tenant_isolation"
  ON public.lti_platform_registrations
  FOR ALL
  USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- Auto-set tenant_id on insert
CREATE TRIGGER set_tenant_id_lti_platform_registrations
  BEFORE INSERT ON public.lti_platform_registrations
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ────────────────────────────────────────────────────────────────
-- 2. LTI NONCES
-- OIDC replay protection. Short-lived, cleaned up by expiry.
-- Written/read by Edge Functions via service-role client.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lti_nonces (
  nonce           text PRIMARY KEY,
  state           text NOT NULL,
  tenant_id       uuid NOT NULL,
  platform_id     uuid NOT NULL REFERENCES public.lti_platform_registrations(id) ON DELETE CASCADE,
  redirect_uri    text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  expires_at      timestamptz DEFAULT (now() + interval '10 minutes') NOT NULL
);

ALTER TABLE public.lti_nonces ENABLE ROW LEVEL SECURITY;

-- Service-role only — no user-facing access needed.
-- Edge Functions use service_role key which bypasses RLS,
-- but we add a restrictive policy so anon/authenticated see nothing.
CREATE POLICY "lti_nonces_deny_all"
  ON public.lti_nonces
  FOR ALL
  USING (false);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_lti_nonces_expires
  ON public.lti_nonces (expires_at);

-- ────────────────────────────────────────────────────────────────
-- 3. LTI SESSIONS
-- Tracks active LTI guest sessions mapped to Supabase users.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lti_sessions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL,
  platform_registration_id  uuid NOT NULL REFERENCES public.lti_platform_registrations(id) ON DELETE CASCADE,
  platform_sub              text NOT NULL,
  user_id                   uuid NOT NULL,
  lti_roles                 text[],
  context_id                text,
  resource_link_id          text,
  target_link_uri           text,
  created_at                timestamptz DEFAULT now() NOT NULL,
  expires_at                timestamptz DEFAULT (now() + interval '8 hours') NOT NULL
);

ALTER TABLE public.lti_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lti_sessions_tenant_isolation"
  ON public.lti_sessions
  FOR ALL
  USING (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE TRIGGER set_tenant_id_lti_sessions
  BEFORE INSERT ON public.lti_sessions
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Lookup by platform user
CREATE INDEX IF NOT EXISTS idx_lti_sessions_platform_sub
  ON public.lti_sessions (platform_registration_id, platform_sub);

-- Lookup by Supabase user
CREATE INDEX IF NOT EXISTS idx_lti_sessions_user
  ON public.lti_sessions (user_id);

-- ────────────────────────────────────────────────────────────────
-- 4. SCORM PACKAGES
-- Registry of uploaded SCORM content linked to lessons.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scorm_packages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  lesson_id       uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  title           text NOT NULL,
  scorm_version   text NOT NULL CHECK (scorm_version IN ('1.2', '2004')),
  storage_path    text NOT NULL,
  entry_point     text NOT NULL DEFAULT 'index.html',
  manifest_data   jsonb DEFAULT '{}'::jsonb NOT NULL,
  uploaded_by     uuid NOT NULL,
  created_at      timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.scorm_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scorm_packages_tenant_isolation"
  ON public.scorm_packages
  FOR SELECT
  USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- Teachers/admins can insert/update
CREATE POLICY "scorm_packages_teacher_write"
  ON public.scorm_packages
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE POLICY "scorm_packages_teacher_update"
  ON public.scorm_packages
  FOR UPDATE
  USING (tenant_id = (SELECT public.get_my_tenant_id()));

CREATE TRIGGER set_tenant_id_scorm_packages
  BEFORE INSERT ON public.scorm_packages
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Lookup by lesson
CREATE INDEX IF NOT EXISTS idx_scorm_packages_lesson
  ON public.scorm_packages (lesson_id);

-- Lookup by tenant
CREATE INDEX IF NOT EXISTS idx_scorm_packages_tenant
  ON public.scorm_packages (tenant_id);

-- ────────────────────────────────────────────────────────────────
-- 5. SCORM RUNTIME DATA
-- Per-user SCORM CMI state for suspend/resume and scoring.
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scorm_runtime_data (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  scorm_package_id  uuid NOT NULL REFERENCES public.scorm_packages(id) ON DELETE CASCADE,
  tenant_id         uuid NOT NULL,
  cmi_data          jsonb DEFAULT '{}'::jsonb NOT NULL,
  score_raw         numeric(5,2),
  score_max         numeric(5,2) DEFAULT 100,
  lesson_status     text DEFAULT 'not attempted' NOT NULL
                    CHECK (lesson_status IN (
                      'not attempted', 'incomplete', 'completed',
                      'passed', 'failed', 'browsed'
                    )),
  total_time        integer DEFAULT 0 NOT NULL,
  suspend_data      text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, scorm_package_id)
);

ALTER TABLE public.scorm_runtime_data ENABLE ROW LEVEL SECURITY;

-- Students see only their own rows
CREATE POLICY "scorm_runtime_own_data_select"
  ON public.scorm_runtime_data
  FOR SELECT
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND user_id = auth.uid()
  );

CREATE POLICY "scorm_runtime_own_data_insert"
  ON public.scorm_runtime_data
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND user_id = auth.uid()
  );

CREATE POLICY "scorm_runtime_own_data_update"
  ON public.scorm_runtime_data
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND user_id = auth.uid()
  );

-- Teachers can read student data for analytics
CREATE POLICY "scorm_runtime_teacher_read"
  ON public.scorm_runtime_data
  FOR SELECT
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.tenant_id = (SELECT public.get_my_tenant_id())
        AND user_roles.role IN ('teacher', 'admin')
    )
  );

CREATE TRIGGER set_tenant_id_scorm_runtime_data
  BEFORE INSERT ON public.scorm_runtime_data
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Lookup by user + package
CREATE INDEX IF NOT EXISTS idx_scorm_runtime_user_package
  ON public.scorm_runtime_data (user_id, scorm_package_id);

-- Lookup by tenant
CREATE INDEX IF NOT EXISTS idx_scorm_runtime_tenant
  ON public.scorm_runtime_data (tenant_id);

-- ────────────────────────────────────────────────────────────────
-- 6. EXTEND lesson_resources TYPE CHECK
-- Add 'scorm' as a valid block type.
-- ────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Only alter if the constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lesson_resources_type_check'
      AND table_name = 'lesson_resources'
  ) THEN
    ALTER TABLE public.lesson_resources DROP CONSTRAINT lesson_resources_type_check;
    ALTER TABLE public.lesson_resources ADD CONSTRAINT lesson_resources_type_check
      CHECK (type IN ('text','video','image','file','quiz','assignment','link','document','pdf','scorm'));
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 7. RPC: upsert_scorm_runtime
-- Atomic SCORM state save + lesson_progress sync.
-- Called by ScormPlayer on Commit/Terminate.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_scorm_runtime(
  p_user_id           uuid,
  p_scorm_package_id  uuid,
  p_tenant_id         uuid,
  p_cmi_data          jsonb,
  p_score_raw         numeric DEFAULT NULL,
  p_score_max         numeric DEFAULT 100,
  p_lesson_status     text DEFAULT 'incomplete',
  p_total_time        integer DEFAULT 0,
  p_suspend_data      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lesson_id       uuid;
  v_progress_status text;
  v_progress_pct    integer;
  v_is_terminal     boolean;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user matches
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;

  -- 1. Upsert SCORM runtime data
  INSERT INTO public.scorm_runtime_data (
    user_id, scorm_package_id, tenant_id,
    cmi_data, score_raw, score_max,
    lesson_status, total_time, suspend_data,
    updated_at
  ) VALUES (
    p_user_id, p_scorm_package_id, p_tenant_id,
    p_cmi_data, p_score_raw, p_score_max,
    p_lesson_status, p_total_time, p_suspend_data,
    now()
  )
  ON CONFLICT (user_id, scorm_package_id) DO UPDATE SET
    cmi_data       = EXCLUDED.cmi_data,
    score_raw      = COALESCE(EXCLUDED.score_raw, scorm_runtime_data.score_raw),
    score_max      = COALESCE(EXCLUDED.score_max, scorm_runtime_data.score_max),
    lesson_status  = CASE
      -- Terminal states are sticky: completed/passed cannot revert
      WHEN scorm_runtime_data.lesson_status IN ('completed', 'passed') THEN scorm_runtime_data.lesson_status
      ELSE EXCLUDED.lesson_status
    END,
    total_time     = GREATEST(scorm_runtime_data.total_time, EXCLUDED.total_time),
    suspend_data   = COALESCE(EXCLUDED.suspend_data, scorm_runtime_data.suspend_data),
    updated_at     = now();

  -- 2. Find linked lesson
  SELECT sp.lesson_id INTO v_lesson_id
  FROM public.scorm_packages sp
  WHERE sp.id = p_scorm_package_id
    AND sp.tenant_id = p_tenant_id;

  -- 3. If linked to a lesson, sync to lesson_progress
  IF v_lesson_id IS NOT NULL THEN
    -- Map SCORM status to lesson progress status
    v_is_terminal := p_lesson_status IN ('completed', 'passed');

    IF v_is_terminal THEN
      v_progress_status := 'completed';
      v_progress_pct := 100;
    ELSIF p_lesson_status = 'failed' THEN
      v_progress_status := 'in_progress';
      -- Estimate progress from score if available
      v_progress_pct := CASE
        WHEN p_score_raw IS NOT NULL AND p_score_max > 0
          THEN LEAST(GREATEST((p_score_raw / p_score_max * 100)::integer, 10), 99)
        ELSE 50
      END;
    ELSIF p_lesson_status = 'incomplete' THEN
      v_progress_status := 'in_progress';
      v_progress_pct := 50;
    ELSE
      v_progress_status := 'started';
      v_progress_pct := 10;
    END IF;

    -- Reuse existing monotonic progress RPC
    PERFORM public.update_lesson_progress_monotonic(
      p_user_id      := p_user_id,
      p_lesson_id    := v_lesson_id,
      p_tenant_id    := p_tenant_id,
      p_status       := v_progress_status,
      p_progress_percentage := v_progress_pct,
      p_last_position := NULL
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'lesson_id', v_lesson_id,
    'synced_progress', v_lesson_id IS NOT NULL
  );
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.upsert_scorm_runtime TO authenticated;

-- ────────────────────────────────────────────────────────────────
-- 8. CLEANUP: expired LTI nonces (called by pg_cron or manually)
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_lti_nonces()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.lti_nonces
  WHERE expires_at < now();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ────────────────────────────────────────────────────────────────
-- 9. STORAGE BUCKET: scorm-packages
-- Public read so iframe can load SCORM content.
-- Write restricted to teachers/admins via RLS policy.
-- ────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('scorm-packages', 'scorm-packages', false)
ON CONFLICT (id) DO NOTHING;

-- Teachers/admins can upload SCORM files
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'scorm-packages') THEN
    DROP POLICY IF EXISTS "scorm_packages_teacher_upload" ON storage.objects;
    CREATE POLICY "scorm_packages_teacher_upload"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'scorm-packages'
      AND (
        public.has_role('TEACHER'::public.app_role)
        OR public.has_role('ADMIN'::public.app_role)
      )
    );

    DROP POLICY IF EXISTS "scorm_packages_teacher_update" ON storage.objects;
    CREATE POLICY "scorm_packages_teacher_update"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'scorm-packages'
      AND (
        public.has_role('TEACHER'::public.app_role)
        OR public.has_role('ADMIN'::public.app_role)
      )
    )
    WITH CHECK (
      bucket_id = 'scorm-packages'
      AND (
        public.has_role('TEACHER'::public.app_role)
        OR public.has_role('ADMIN'::public.app_role)
      )
    );

    DROP POLICY IF EXISTS "scorm_packages_teacher_delete" ON storage.objects;
    CREATE POLICY "scorm_packages_teacher_delete"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'scorm-packages'
      AND (
        public.has_role('TEACHER'::public.app_role)
        OR public.has_role('ADMIN'::public.app_role)
      )
    );

    -- Authenticated read only (tenant content should not be publicly accessible)
    DROP POLICY IF EXISTS "scorm_packages_public_read" ON storage.objects;
    DROP POLICY IF EXISTS "scorm_packages_authenticated_read" ON storage.objects;
    CREATE POLICY "scorm_packages_authenticated_read"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = 'scorm-packages'
      AND auth.role() = 'authenticated'
    );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────
-- 10. GRANTS
-- ────────────────────────────────────────────────────────────────
GRANT ALL ON TABLE public.lti_platform_registrations TO authenticated;
GRANT ALL ON TABLE public.lti_nonces TO service_role;
GRANT ALL ON TABLE public.lti_sessions TO authenticated;
GRANT ALL ON TABLE public.lti_sessions TO service_role;
GRANT ALL ON TABLE public.scorm_packages TO authenticated;
GRANT ALL ON TABLE public.scorm_runtime_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_lti_nonces TO service_role;
