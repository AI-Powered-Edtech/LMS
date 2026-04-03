-- =============================================================================
-- Migration 20260403000017: Fix Missing Tables and RPCs
-- Date: 2026-04-03
-- Purpose: Create tables and functions that were defined in earlier migration
--          files but were not applied to the current database instance.
--          All operations use IF NOT EXISTS / OR REPLACE guards so this
--          migration is safe to run on databases that already have some of
--          these objects.
--
-- Objects created / ensured:
--   Tables    : teacher_onboarding_progress, onboarding_progress,
--               ppdb_periods, ppdb_registrations, app_metrics, rate_limits
--   Functions : update_teacher_onboarding_updated_at,
--               check_and_increment_rate_limit_v2,
--               get_audit_logs (NEW — no prior migration),
--               get_tenant_activity_counts
--   Policies  : re-created with DROP IF EXISTS guards
--   Indexes   : all with IF NOT EXISTS
--   Triggers  : all with DROP IF EXISTS guards
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. teacher_onboarding_progress
--    Originally: supabase/migrations/20260402100000_teacher_onboarding.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.teacher_onboarding_progress (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  tenant_id               uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  current_step            integer     NOT NULL DEFAULT 1,
  completed_steps         integer[]   NOT NULL DEFAULT '{}',
  is_completed            boolean     NOT NULL DEFAULT false,
  dismissed               boolean     NOT NULL DEFAULT false,
  created_class_id        uuid,
  created_class_join_code text,
  created_course_id       text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

ALTER TABLE public.teacher_onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_onboarding_own" ON public.teacher_onboarding_progress;
CREATE POLICY "teacher_onboarding_own"
  ON public.teacher_onboarding_progress
  FOR ALL
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_teacher_onboarding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS teacher_onboarding_updated_at ON public.teacher_onboarding_progress;
CREATE TRIGGER teacher_onboarding_updated_at
  BEFORE UPDATE ON public.teacher_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_teacher_onboarding_updated_at();

DROP TRIGGER IF EXISTS auto_set_tenant_id_teacher_onboarding ON public.teacher_onboarding_progress;
CREATE TRIGGER auto_set_tenant_id_teacher_onboarding
  BEFORE INSERT ON public.teacher_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE INDEX IF NOT EXISTS idx_teacher_onboarding_user
  ON public.teacher_onboarding_progress (user_id);

CREATE INDEX IF NOT EXISTS idx_teacher_onboarding_tenant
  ON public.teacher_onboarding_progress (tenant_id);

GRANT ALL ON TABLE public.teacher_onboarding_progress TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. onboarding_progress
--    Originally: supabase/migrations/004_tenant_onboarding.sql
--    Schema: one row per user; steps_completed JSONB (NOT row-per-step model)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL,
  user_id         uuid        NOT NULL UNIQUE,
  steps_completed jsonb       NOT NULL DEFAULT '{}',
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_onboarding" ON public.onboarding_progress;
CREATE POLICY "users_manage_own_onboarding"
  ON public.onboarding_progress
  FOR ALL
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "admins_view_onboarding_progress" ON public.onboarding_progress;
CREATE POLICY "admins_view_onboarding_progress"
  ON public.onboarding_progress
  FOR SELECT
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'ADMIN'
    )
  );

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant_user
  ON public.onboarding_progress (tenant_id, user_id);

GRANT ALL ON TABLE public.onboarding_progress TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ppdb_periods + ppdb_registrations
--    Originally: supabase/migrations/20260402300000_ppdb.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ppdb_periods (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid        NOT NULL REFERENCES public.tenants(id),
  academic_year text        NOT NULL,
  name          text        NOT NULL,
  start_date    date        NOT NULL,
  end_date      date        NOT NULL,
  quota         integer     NOT NULL DEFAULT 100,
  status        text        NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'open', 'closed', 'announced')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ppdb_registrations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid        NOT NULL REFERENCES public.tenants(id),
  period_id           uuid        NOT NULL REFERENCES public.ppdb_periods(id),
  registration_number text        UNIQUE NOT NULL,
  student_name        text        NOT NULL,
  birth_date          date        NOT NULL,
  gender              text        NOT NULL CHECK (gender IN ('L', 'P')),
  previous_school     text,
  parent_name         text        NOT NULL,
  parent_phone        text        NOT NULL,
  parent_email        text,
  address             text,
  documents           jsonb       DEFAULT '{}',
  status              text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'waitlisted')),
  notes               text,
  reviewed_by         uuid        REFERENCES auth.users(id),
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ppdb_periods       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppdb_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_ppdb_periods" ON public.ppdb_periods;
CREATE POLICY "admin_manage_ppdb_periods" ON public.ppdb_periods
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND has_role('ADMIN'::app_role)
  );

DROP POLICY IF EXISTS "admin_manage_registrations" ON public.ppdb_registrations;
CREATE POLICY "admin_manage_registrations" ON public.ppdb_registrations
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND has_role('ADMIN'::app_role)
  );

DROP TRIGGER IF EXISTS auto_set_tenant_id_ppdb_periods ON public.ppdb_periods;
CREATE TRIGGER auto_set_tenant_id_ppdb_periods
  BEFORE INSERT ON public.ppdb_periods
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

DROP TRIGGER IF EXISTS auto_set_tenant_id_ppdb_registrations ON public.ppdb_registrations;
CREATE TRIGGER auto_set_tenant_id_ppdb_registrations
  BEFORE INSERT ON public.ppdb_registrations
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE INDEX IF NOT EXISTS idx_ppdb_periods_tenant
  ON public.ppdb_periods (tenant_id);

CREATE INDEX IF NOT EXISTS idx_ppdb_reg_period
  ON public.ppdb_registrations (period_id, status);

CREATE INDEX IF NOT EXISTS idx_ppdb_reg_tenant
  ON public.ppdb_registrations (tenant_id);

GRANT ALL ON TABLE public.ppdb_periods       TO authenticated;
GRANT ALL ON TABLE public.ppdb_registrations TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. app_metrics
--    Originally: supabase/migrations/006_metrics.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.app_metrics (
  id           bigserial   PRIMARY KEY,
  tenant_id    uuid,                         -- NULL = global / infra-level metric
  metric_name  text        NOT NULL,
  metric_value float       NOT NULL,
  metadata     jsonb       NOT NULL DEFAULT '{}',
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_metrics" ON public.app_metrics;
CREATE POLICY "admins_read_metrics"
  ON public.app_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'ADMIN'
    )
  );

DROP POLICY IF EXISTS "admins_insert_metrics" ON public.app_metrics;
CREATE POLICY "admins_insert_metrics"
  ON public.app_metrics FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'ADMIN'
    )
  );

CREATE INDEX IF NOT EXISTS idx_app_metrics_tenant_name_time
  ON public.app_metrics (tenant_id, metric_name, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_metrics_name_time
  ON public.app_metrics (metric_name, recorded_at DESC);

GRANT ALL ON TABLE public.app_metrics TO authenticated;
GRANT ALL ON TABLE public.app_metrics TO service_role;
GRANT USAGE ON SEQUENCE public.app_metrics_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.app_metrics_id_seq TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. rate_limits + check_and_increment_rate_limit_v2
--    Originally: 20260329000001_rate_limits_table.sql
--                + 20260402000005_atomic_rate_limit_fn.sql
--    Required by: supabase/functions/check-rate-limit/index.ts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           uuid        DEFAULT gen_random_uuid() NOT NULL,
  key          text        NOT NULL,
  action       text        NOT NULL,
  attempts     integer     DEFAULT 1  NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  created_at   timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT rate_limits_pkey          PRIMARY KEY (id),
  CONSTRAINT rate_limits_key_action_unique UNIQUE (key, action)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No direct user access — only via service role inside the Edge Function

ALTER TABLE public.rate_limits
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit_v2(
  p_key         text,
  p_action      text,
  p_max_attempts integer DEFAULT 5,
  p_window_ms   bigint  DEFAULT 60000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_bucket      timestamptz;
  v_epoch_ms    bigint;
  v_attempts    integer;
  v_remaining   integer;
  v_retry_ms    bigint;
  v_existing    record;
BEGIN
  v_epoch_ms := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_bucket   := to_timestamp((v_epoch_ms / p_window_ms * p_window_ms)::double precision / 1000);

  SELECT id, attempts, window_start
    INTO v_existing
    FROM public.rate_limits
   WHERE key    = p_key
     AND action = p_action
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (key, action, attempts, window_start, updated_at)
    VALUES (p_key, p_action, 1, v_bucket, clock_timestamp())
    ON CONFLICT (key, action) DO UPDATE
      SET attempts     = CASE
                           WHEN rate_limits.window_start >= v_bucket THEN rate_limits.attempts + 1
                           ELSE 1
                         END,
          window_start = CASE
                           WHEN rate_limits.window_start >= v_bucket THEN rate_limits.window_start
                           ELSE v_bucket
                         END,
          updated_at   = clock_timestamp()
    RETURNING attempts INTO v_attempts;
  ELSE
    IF v_existing.window_start >= v_bucket THEN
      UPDATE public.rate_limits
         SET attempts   = attempts + 1,
             updated_at = clock_timestamp()
       WHERE id = v_existing.id
      RETURNING attempts INTO v_attempts;
    ELSE
      UPDATE public.rate_limits
         SET attempts     = 1,
             window_start = v_bucket,
             updated_at   = clock_timestamp()
       WHERE id = v_existing.id
      RETURNING attempts INTO v_attempts;
    END IF;
  END IF;

  IF v_attempts > p_max_attempts THEN
    v_retry_ms := p_window_ms;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'retry_after_ms', v_retry_ms);
  ELSIF v_attempts = p_max_attempts THEN
    v_remaining := 0;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'retry_after_ms', 0);
  ELSE
    v_remaining := p_max_attempts - v_attempts;
    RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'retry_after_ms', 0);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(text, text, integer, bigint)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(text, text, integer, bigint)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(text, text, integer, bigint)
  FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_rate_limit_v2(text, text, integer, bigint)
  FROM anon;

COMMENT ON FUNCTION public.check_and_increment_rate_limit_v2(text, text, integer, bigint) IS
  'Atomically increments the rate-limit counter for (key, action) using a fixed-width '
  'time bucket. Uses SELECT FOR UPDATE to prevent TOCTOU races. Returns JSON with '
  '{allowed, remaining, retry_after_ms}. Called exclusively by the check-rate-limit '
  'Edge Function via the service role.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. get_tenant_activity_counts RPC
--    Originally: supabase/migrations/012_performance_optimizations.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_tenant_activity_counts(
  p_tenant_id uuid,
  p_days      integer DEFAULT 30
)
RETURNS TABLE (
  event_type text,
  count      bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Security: verify caller belongs to requested tenant
  IF p_tenant_id != get_my_tenant_id() THEN
    RAISE EXCEPTION 'Unauthorized: tenant mismatch';
  END IF;

  RETURN QUERY
  SELECT
    ae.event_type,
    COUNT(*) AS count
  FROM activity_events ae
  WHERE ae.tenant_id = p_tenant_id
    AND ae.created_at >= (NOW() - (p_days || ' days')::interval)
  GROUP BY ae.event_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_activity_counts(uuid, integer) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. get_audit_logs RPC  (NEW — no prior migration exists for this function)
--    Reads from: public.admin_audit_logs  (created in 000_baseline.sql)
--    Joins    : public.profiles (actor name), auth.users (actor email)
--    Caller   : administrationService.getAuditLogs() via supabase.rpc()
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_action text    DEFAULT NULL,
  p_cursor text    DEFAULT NULL,
  p_limit  integer DEFAULT 50
)
RETURNS TABLE (
  log_id      uuid,
  actor_id    uuid,
  actor_name  text,
  actor_email text,
  action      text,
  target_type text,
  target_id   uuid,
  target_name text,
  details     jsonb,
  created_at  timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  IF NOT has_role('ADMIN'::app_role) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengakses audit log';
  END IF;

  v_tenant_id := get_my_tenant_id();

  RETURN QUERY
  SELECT
    al.id                                                                 AS log_id,
    al.admin_user_id                                                      AS actor_id,
    COALESCE(
      NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''),
      au.email,
      'Unknown'
    )                                                                     AS actor_name,
    COALESCE(au.email, '')                                                AS actor_email,
    al.action                                                             AS action,
    COALESCE(al.target_entity_type, '')                                   AS target_type,
    al.target_entity_id                                                   AS target_id,
    COALESCE(
      al.metadata ->> 'target_name',
      al.metadata ->> 'name',
      ''
    )                                                                     AS target_name,
    COALESCE(al.metadata, '{}')                                           AS details,
    al.created_at                                                         AS created_at,
    COUNT(*) OVER ()                                                      AS total_count
  FROM admin_audit_logs al
  LEFT JOIN profiles    p  ON p.id  = al.admin_user_id
  LEFT JOIN auth.users  au ON au.id = al.admin_user_id
  WHERE al.tenant_id = v_tenant_id
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_cursor IS NULL OR al.created_at < p_cursor::timestamptz)
  ORDER BY al.created_at DESC
  LIMIT LEAST(p_limit, 100);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_audit_logs(text, text, integer) TO authenticated;

COMMENT ON FUNCTION public.get_audit_logs(text, text, integer) IS
  'Cursor-based paginated audit log query for admin dashboard. '
  'p_action: optional filter (NULL = semua aksi). '
  'p_cursor: ISO-8601 timestamptz for keyset pagination (records before this time). '
  'p_limit: max rows per page (capped at 100). '
  'total_count: window count of all matching rows before LIMIT is applied. '
  'Restricted to ADMIN role via has_role() check.';
