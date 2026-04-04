-- ==========================================================================
-- Migration: 20260405000010_principal_dashboard_mv.sql
-- Sprint 2.6: Principal Dashboard materialized view
--
-- Replaces expensive real-time aggregations in get_executive_overview() with
-- a 15-minute cached materialized view, dramatically reducing query latency
-- on the Principal dashboard.
--
-- Objects created:
--   1. MATERIALIZED VIEW  public.mv_principal_overview
--   2. UNIQUE INDEX       public.idx_mv_principal_overview_tenant_id
--   3. FUNCTION           public.refresh_principal_overview_mv()
--   4. FUNCTION           public.get_principal_overview_cached(UUID)
--   5. pg_cron schedule   refresh-principal-mv  (every 15 minutes)
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1. Materialized view: mv_principal_overview
--
--    Caches all six metric groups returned by get_executive_overview():
--      • total_students      — total enrolled students in tenant
--      • active_students_7d  — distinct users active in last 7 days at refresh time
--      • total_teachers      — total teachers registered in tenant
--      • active_teachers_30d — distinct teachers with classrooms in last 30 days
--      • total_courses       — published courses count
--      • avg_quiz_score      — mean score across submitted/graded quiz_attempts
--      • adoption_rate       — active_students_7d / total_students * 100
--      • refreshed_at        — timestamp of last materialized view refresh
--
--    NOTE: RLS cannot be applied to materialized views. Access is enforced
--    exclusively through the SECURITY DEFINER RPC get_principal_overview_cached()
--    which checks auth.uid() and role before querying the view.
-- --------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_principal_overview AS
SELECT
  t.id                                                            AS tenant_id,

  -- ── Student counts ────────────────────────────────────────────
  COUNT(DISTINCT ur_s.user_id)                                    AS total_students,

  COUNT(DISTINCT ae.user_id)                                      AS active_students_7d,

  -- ── Teacher counts ────────────────────────────────────────────
  COUNT(DISTINCT ur_t.user_id)                                    AS total_teachers,

  COUNT(DISTINCT cl.teacher_id)                                   AS active_teachers_30d,

  -- ── Course counts ─────────────────────────────────────────────
  COUNT(DISTINCT CASE WHEN c.status = 'published' THEN c.id END)  AS total_courses,

  -- ── Quiz score average ────────────────────────────────────────
  -- quiz_attempts is a view over quiz_attempts_v2 (partitioned)
  -- Status values after backfill migration are lowercase.
  COALESCE(
    ROUND(
      (
        SELECT AVG(qa.score)
        FROM public.quiz_attempts_v2 qa
        WHERE qa.tenant_id = t.id
          AND (qa.status)::text IN ('submitted', 'graded')
      )::numeric,
      1
    ),
    0
  )                                                               AS avg_quiz_score,

  -- ── Adoption rate (derived) ───────────────────────────────────
  -- Computed at refresh time; mirrors the formula in get_executive_overview()
  CASE
    WHEN COUNT(DISTINCT ur_s.user_id) > 0
    THEN ROUND(
      (COUNT(DISTINCT ae.user_id)::numeric
        / COUNT(DISTINCT ur_s.user_id)::numeric) * 100,
      1
    )
    ELSE 0::numeric
  END                                                             AS adoption_rate,

  NOW()                                                           AS refreshed_at

FROM public.tenants t

-- student role rows for this tenant (role stored as UPPERCASE in user_roles)
LEFT JOIN public.user_roles ur_s
  ON ur_s.tenant_id = t.id
  AND UPPER(ur_s.role::text) = 'STUDENT'

-- activity_events in the last 7 days at refresh time
LEFT JOIN public.activity_events ae
  ON ae.tenant_id = t.id
  AND ae.created_at > NOW() - INTERVAL '7 days'

-- teacher role rows for this tenant
LEFT JOIN public.user_roles ur_t
  ON ur_t.tenant_id = t.id
  AND UPPER(ur_t.role::text) = 'TEACHER'

-- classrooms created in the last 30 days (teacher activity proxy)
LEFT JOIN public.classrooms cl
  ON cl.tenant_id = t.id
  AND cl.created_at > NOW() - INTERVAL '30 days'

-- courses (for published count)
LEFT JOIN public.courses c
  ON c.tenant_id = t.id

GROUP BY t.id
WITH DATA;

-- --------------------------------------------------------------------------
-- 2. Unique index — required for REFRESH MATERIALIZED VIEW CONCURRENTLY
-- --------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_principal_overview_tenant_id
  ON public.mv_principal_overview (tenant_id);

-- --------------------------------------------------------------------------
-- 3. Refresh function
--    SECURITY DEFINER prevents direct MV access from untrusted callers.
--    Only service_role (cron, edge functions) may execute this.
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_principal_overview_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_principal_overview;
END;
$$;

-- Only service_role may trigger a refresh (cron, trusted Edge Functions)
GRANT EXECUTE ON FUNCTION public.refresh_principal_overview_mv() TO service_role;
REVOKE EXECUTE ON FUNCTION public.refresh_principal_overview_mv() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_principal_overview_mv() FROM anon;

-- --------------------------------------------------------------------------
-- 4. RPC: get_principal_overview_cached
--    Reads from mv_principal_overview for the calling user's tenant.
--    Access control:
--      • auth.uid() must not be NULL (authenticated)
--      • Caller must hold PRINCIPAL or ADMIN role (matches get_executive_overview)
--      • p_tenant_id must match the caller's own tenant (prevents cross-tenant reads)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_principal_overview_cached(p_tenant_id UUID)
RETURNS TABLE (
  tenant_id       UUID,
  total_students  BIGINT,
  active_students BIGINT,
  total_teachers  BIGINT,
  active_teachers BIGINT,
  total_courses   BIGINT,
  avg_quiz_score  NUMERIC,
  adoption_rate   NUMERIC,
  refreshed_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  -- Role guard: only PRINCIPAL or ADMIN (mirrors get_executive_overview security)
  IF NOT public.has_role('PRINCIPAL'::public.app_role)
     AND NOT public.has_role('ADMIN'::public.app_role)
  THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran PRINCIPAL atau ADMIN';
  END IF;

  -- Tenant isolation: caller may only query their own tenant
  IF p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  RETURN QUERY
  SELECT
    m.tenant_id,
    m.total_students,
    m.active_students_7d   AS active_students,
    m.total_teachers,
    m.active_teachers_30d  AS active_teachers,
    m.total_courses,
    m.avg_quiz_score,
    m.adoption_rate,
    m.refreshed_at
  FROM public.mv_principal_overview m
  WHERE m.tenant_id = p_tenant_id;
END;
$$;

-- authenticated users may call the RPC; internal guards handle role checks
GRANT EXECUTE ON FUNCTION public.get_principal_overview_cached(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_principal_overview_cached(UUID) FROM anon;

-- --------------------------------------------------------------------------
-- 5. pg_cron: refresh every 15 minutes
--    Guarded by an existence check so the migration is safe on projects
--    without pg_cron (e.g., local dev with stock PostgreSQL).
--    Uses cron.unschedule() first to avoid duplicate schedules on re-runs.
-- --------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any previous schedule to keep re-runs idempotent
    BEGIN
      PERFORM cron.unschedule('refresh-principal-mv');
    EXCEPTION WHEN OTHERS THEN
      -- Job did not exist yet — that is fine
      NULL;
    END;

    PERFORM cron.schedule(
      'refresh-principal-mv',
      '*/15 * * * *',
      'SELECT public.refresh_principal_overview_mv()'
    );
  END IF;
END;
$$;
