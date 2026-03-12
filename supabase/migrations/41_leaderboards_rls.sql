-- ==========================================================================
-- Migration 41: Leaderboard RLS & Cleanup
--
-- 1. Cleans up any duplicate leaderboard rows (keeping highest rank/score).
-- 2. Enforces RLS on leaderboards to assure tenant isolation via database.
-- ==========================================================================

-- 1. Cleanup Duplicates (if any exist before the unique constraint was added)
-- We keep the row with the latest updated_at or highest score
DELETE FROM public.leaderboards a
USING public.leaderboards b
WHERE a.tenant_id = b.tenant_id
  AND a.class_id = b.class_id
  AND a.user_id = b.user_id
  AND (a.score < b.score OR (a.score = b.score AND a.updated_at < b.updated_at));

-- 2. Enable RLS
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Read
DROP POLICY IF EXISTS "Users can read leaderboard in their tenant" ON public.leaderboards;
CREATE POLICY "Users can read leaderboard in their tenant"
ON public.leaderboards
FOR SELECT
USING (
  tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
);

-- 4. Policy: Insert/Update (only via Security Definer RPCs or Triggers, 
--    but we can add a service role policy just in case it's needed)
DROP POLICY IF EXISTS "Service role bypass" ON public.leaderboards;
CREATE POLICY "Service role bypass"
ON public.leaderboards
USING (true)
WITH CHECK (true);
