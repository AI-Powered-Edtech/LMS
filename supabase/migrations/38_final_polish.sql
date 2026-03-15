-- Migration: 38_final_polish.sql
-- Description: Idempotent Schema alignment, RLS performance optimization, and refined indexing.

BEGIN;

-- ==========================================================================
-- 0. IDEMPOTENT SCHEMA ALIGNMENT (Multi-Tenant Constitution)
-- ==========================================================================

DO $$ 
DECLARE
    v_default_tenant_id uuid;
BEGIN
    -- Get default tenant for backfilling
    SELECT id INTO v_default_tenant_id FROM public.tenants WHERE slug = 'default-organization' OR id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
    
    -- 0.1 analytics_metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_metrics' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.analytics_metrics ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
        UPDATE public.analytics_metrics SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
        ALTER TABLE public.analytics_metrics ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- 0.2 analytics_rate_limits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'analytics_rate_limits' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.analytics_rate_limits ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
        UPDATE public.analytics_rate_limits SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
        ALTER TABLE public.analytics_rate_limits ALTER COLUMN tenant_id SET NOT NULL;
    END IF;

    -- 0.3 badges
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'badges' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
        UPDATE public.badges SET tenant_id = v_default_tenant_id WHERE tenant_id IS NULL;
        ALTER TABLE public.badges ALTER COLUMN tenant_id SET NOT NULL;
    END IF;
END $$;

-- ==========================================================================
-- 1. REFINED INDEXING (Targeted High-Impact Indexes)
-- ==========================================================================

-- Optimized indexing for frequently used filters and joins
CREATE INDEX IF NOT EXISTS idx_analytics_audit_tenant_id ON public.analytics_audit (tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_tenant_id ON public.analytics_metrics (tenant_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_tenant_id ON public.recommendations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_concept_mastery_tenant_id ON public.student_concept_mastery (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_tenant_id ON public.user_badges (tenant_id);

-- Frequently joined foreign keys (Fixed based on schema audit)
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON public.enrollments (class_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON public.course_enrollments (course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON public.quiz_attempts (student_id);

-- ==========================================================================
-- 2. RLS PERFORMANCE OPTIMIZATION (Scalar Subqueries)
-- ==========================================================================

-- --- TENANT-SCOPED TABLES ---

-- Profiles
DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = (SELECT auth.uid()));

-- Courses
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
CREATE POLICY "Users can view courses" ON public.courses FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

DROP POLICY IF EXISTS courses_delete ON public.courses;
CREATE POLICY "courses_delete" ON public.courses FOR DELETE USING (tenant_id = (SELECT public.get_my_tenant_id()) AND has_role('ADMIN'::app_role));

DROP POLICY IF EXISTS courses_update ON public.courses;
CREATE POLICY "courses_update" ON public.courses FOR UPDATE USING (tenant_id = (SELECT public.get_my_tenant_id()) AND (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role)));

-- Classes
DROP POLICY IF EXISTS classes_delete ON public.classes;
CREATE POLICY "classes_delete" ON public.classes FOR DELETE USING (tenant_id = (SELECT public.get_my_tenant_id()) AND has_role('ADMIN'::app_role));

-- Enrollments (Class-Student mapping)
DROP POLICY IF EXISTS enrollments_insert ON public.enrollments;
CREATE POLICY "enrollments_insert" ON public.enrollments FOR INSERT WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

-- Course Enrollments
DROP POLICY IF EXISTS course_enrollments_select ON public.course_enrollments;
CREATE POLICY "course_enrollments_select" ON public.course_enrollments FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- Assignment Submissions
DROP POLICY IF EXISTS assignment_submissions_insert ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_insert" ON public.assignment_submissions FOR INSERT WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()) AND (student_id = (SELECT auth.uid())));

-- Lesson Progress
DROP POLICY IF EXISTS lesson_progress_insert ON public.lesson_progress;
CREATE POLICY "lesson_progress_insert" ON public.lesson_progress FOR INSERT WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()) AND (user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS lesson_progress_update ON public.lesson_progress;
CREATE POLICY "lesson_progress_update" ON public.lesson_progress FOR UPDATE USING (tenant_id = (SELECT public.get_my_tenant_id()) AND (user_id = (SELECT auth.uid())));

-- Badges (Now Tenant-Scoped)
DROP POLICY IF EXISTS badges_select ON public.badges;
CREATE POLICY "badges_select" ON public.badges FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- Analytics Metrics (Now Tenant-Scoped)
DROP POLICY IF EXISTS "Admins can view analytics metrics" ON public.analytics_metrics;
CREATE POLICY "Admins can view analytics metrics" ON public.analytics_metrics FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND has_role('ADMIN'::app_role));

-- Analytics Rate Limits (Now Tenant-Scoped)
DROP POLICY IF EXISTS "Users can view own analytics rate limits" ON public.analytics_rate_limits;
CREATE POLICY "Users can view own analytics rate limits" ON public.analytics_rate_limits FOR SELECT USING (user_id = (SELECT auth.uid()) AND tenant_id = (SELECT public.get_my_tenant_id()));

-- Recommendations
DROP POLICY IF EXISTS recommendations_select ON public.recommendations;
CREATE POLICY "recommendations_select" ON public.recommendations FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()));

-- Student Concept Mastery
DROP POLICY IF EXISTS "Students read own mastery" ON public.student_concept_mastery;
CREATE POLICY "Students read own mastery" ON public.student_concept_mastery FOR SELECT USING (tenant_id = (SELECT public.get_my_tenant_id()) AND (student_id = (SELECT auth.uid())));

-- --- GLOBAL SYSTEM TABLES ---

-- Modules
DROP POLICY IF EXISTS modules_select ON public.modules;
CREATE POLICY "modules_select" ON public.modules FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Module Dependencies
DROP POLICY IF EXISTS module_dependencies_select ON public.module_dependencies;
CREATE POLICY "module_dependencies_select" ON public.module_dependencies FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- Analytics Circuit Breaker
DROP POLICY IF EXISTS "Admins can manage analytics circuit breaker" ON public.analytics_circuit_breaker;
CREATE POLICY "Admins can manage analytics circuit breaker" ON public.analytics_circuit_breaker FOR ALL USING (has_role('ADMIN'::app_role));

COMMIT;
