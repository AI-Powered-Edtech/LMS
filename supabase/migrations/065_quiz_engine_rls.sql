-- ============================================================
-- Migration 65: Core Quiz Engine RLS — Phase 1
-- RLS for quiz_stats and question_stats tables
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Enable RLS on quiz_stats
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.quiz_stats ENABLE ROW LEVEL SECURITY;

-- Teachers/Admins can read stats within their tenant
DROP POLICY IF EXISTS quiz_stats_select_teacher ON public.quiz_stats;
CREATE POLICY quiz_stats_select_teacher ON public.quiz_stats
    FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = quiz_stats.tenant_id
              AND ur.role IN ('ADMIN', 'TEACHER')
        )
    );

-- Stats are only written by triggers (SECURITY DEFINER), not directly by users
DROP POLICY IF EXISTS quiz_stats_insert ON public.quiz_stats;
DROP POLICY IF EXISTS quiz_stats_update ON public.quiz_stats;

-- ────────────────────────────────────────────────────────────
-- 2. Enable RLS on question_stats
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.question_stats ENABLE ROW LEVEL SECURITY;

-- Teachers/Admins can read stats within their tenant
DROP POLICY IF EXISTS question_stats_select_teacher ON public.question_stats;
CREATE POLICY question_stats_select_teacher ON public.question_stats
    FOR SELECT
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = question_stats.tenant_id
              AND ur.role IN ('ADMIN', 'TEACHER')
        )
    );

-- Stats are only written by triggers (SECURITY DEFINER), not directly by users
DROP POLICY IF EXISTS question_stats_insert ON public.question_stats;
DROP POLICY IF EXISTS question_stats_update ON public.question_stats;
