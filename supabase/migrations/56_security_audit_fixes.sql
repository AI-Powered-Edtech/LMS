-- ==========================================================================
-- Migration 56: Security Audit Fixes (RLS Hardening)
--
-- 1. Fixes critical RLS bypass on leaderboards table.
-- 2. Configures RLS for user_badges table.
-- ==========================================================================

-- 1. Fix Leaderboard RLS Bypass
-- Removing the "Service role bypass" which used USING(true)
DROP POLICY IF EXISTS "Service role bypass" ON public.leaderboards;

-- Ensure RLS is enabled
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- 2. Configure user_badges RLS
-- Enable RLS if not already enabled
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own badges
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
USING (
    auth.uid() = user_id 
    AND tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::uuid
);

-- Policy: Security Definer functions (like award_badge_if_qualified) 
-- can still insert, but we don't allow direct client inserts/updates.
