-- 89_rls_analytics_gamification_fix.sql
-- Fix critical RLS gaps identified in security review:
-- 1. course_stats and leaderboards still use insecure JWT claims pattern
-- 2. user_badges and user_points have NO RLS policies

-- ============================================================
-- FIX 1: Update course_stats to use get_my_tenant_id()
-- ============================================================

DROP POLICY IF EXISTS "Users can view course stats for their tenant" ON public.course_stats;
CREATE POLICY "Users can view course stats for their tenant" ON public.course_stats
    FOR SELECT USING (tenant_id = get_my_tenant_id());

-- ============================================================
-- FIX 2: Update leaderboards to use get_my_tenant_id()
-- ============================================================

DROP POLICY IF EXISTS "Users can view leaderboards for their tenant" ON public.leaderboards;
CREATE POLICY "Users can view leaderboards for their tenant" ON public.leaderboards
    FOR SELECT USING (tenant_id = get_my_tenant_id());

-- ============================================================
-- FIX 3: Enable RLS on user_badges (was completely unprotected)
-- ============================================================

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only view badges within their tenant
DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;
CREATE POLICY "user_badges_select" ON public.user_badges
    FOR SELECT USING (tenant_id = get_my_tenant_id());

-- INSERT: Only users within the tenant can create badges (admin/teacher)
DROP POLICY IF EXISTS "user_badges_insert" ON public.user_badges;
CREATE POLICY "user_badges_insert" ON public.user_badges
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

-- ============================================================
-- FIX 4: Enable RLS on user_points (was completely unprotected)
-- ============================================================

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can only view points within their tenant
DROP POLICY IF EXISTS "user_points_select" ON public.user_points;
CREATE POLICY "user_points_select" ON public.user_points
    FOR SELECT USING (tenant_id = get_my_tenant_id());

-- INSERT/UPDATE: Only users within the tenant can modify points (admin/teacher)
DROP POLICY IF EXISTS "user_points_insert" ON public.user_points;
CREATE POLICY "user_points_insert" ON public.user_points
    FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

DROP POLICY IF EXISTS "user_points_update" ON public.user_points;
CREATE POLICY "user_points_update" ON public.user_points
    FOR UPDATE USING (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')))
    WITH CHECK (tenant_id = get_my_tenant_id() AND (has_role('ADMIN') OR has_role('TEACHER')));

-- ============================================================
-- FIX 5: Ensure activity_events uses consistent pattern
-- (Already uses get_my_tenant_id(), but let's verify)
-- ============================================================

DROP POLICY IF EXISTS "Users can view tenant activity events" ON public.activity_events;
CREATE POLICY "Users can view tenant activity events" ON public.activity_events
    FOR SELECT USING (tenant_id = get_my_tenant_id());
