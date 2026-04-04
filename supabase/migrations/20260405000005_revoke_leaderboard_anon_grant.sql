-- ============================================================
-- Sprint 1.4: Revoke leaderboard recompute functions from anon
-- Baseline (000_baseline.sql lines 12919-12927) incorrectly
-- granted EXECUTE to anon for both functions.
--
-- Exact signatures from baseline:
--   recompute_leaderboard(p_tenant_id uuid)
--   recompute_weekly_leaderboard(p_tenant_id uuid, p_class_id uuid,
--                                p_week_start timestamptz)
-- ============================================================

-- ============================================================
-- 1. recompute_leaderboard — remove anon & public grants
-- ============================================================
REVOKE ALL ON FUNCTION public.recompute_leaderboard(uuid)
  FROM anon;

REVOKE ALL ON FUNCTION public.recompute_leaderboard(uuid)
  FROM public;

-- Ensure authenticated role retains EXECUTE
GRANT EXECUTE ON FUNCTION public.recompute_leaderboard(uuid)
  TO authenticated;

-- ============================================================
-- 2. recompute_weekly_leaderboard — remove anon & public grants
--    Wrapped in DO block in case the function is removed in a
--    future migration (defensive, idempotent).
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM   pg_proc    p
    JOIN   pg_namespace n ON n.oid = p.pronamespace
    WHERE  n.nspname   = 'public'
      AND  p.proname   = 'recompute_weekly_leaderboard'
      AND  oidvectortypes(p.proargtypes) =
           'uuid, uuid, timestamp with time zone'
  ) THEN
    REVOKE ALL ON FUNCTION public.recompute_weekly_leaderboard(
      uuid,
      uuid,
      timestamp with time zone
    ) FROM anon;

    REVOKE ALL ON FUNCTION public.recompute_weekly_leaderboard(
      uuid,
      uuid,
      timestamp with time zone
    ) FROM public;

    GRANT EXECUTE ON FUNCTION public.recompute_weekly_leaderboard(
      uuid,
      uuid,
      timestamp with time zone
    ) TO authenticated;
  END IF;
END;
$$;
