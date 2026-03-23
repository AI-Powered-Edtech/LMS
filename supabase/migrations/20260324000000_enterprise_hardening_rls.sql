-- Enterprise Hardening: Strict RLS for high-risk tables
-- Ensures cross-tenant leakage is physically impossible at the DB level

-- 1. Hardening for 'grades'
ALTER TABLE IF EXISTS public.grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_grades" ON public.grades;
CREATE POLICY "tenant_isolation_grades"
  ON public.grades
  FOR ALL
  USING (tenant_id = (SELECT public.get_my_tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));

-- 2. Hardening for 'student_lesson_signals'
ALTER TABLE IF EXISTS public.student_lesson_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_signals" ON public.student_lesson_signals;
CREATE POLICY "tenant_isolation_signals"
  ON public.student_lesson_signals
  FOR ALL
  USING (tenant_id = (SELECT public.get_my_tenant_id()))
  WITH CHECK (tenant_id = (SELECT public.get_my_tenant_id()));
