-- ==========================================================================
-- Migration 24: Multi-Tenant Hardening (The "Iron Shell" Migration)
-- 
-- Objectives:
-- 1. Fix Schema Drift: Restore modules.tenant_id with data backfill.
-- 2. Index Refactoring: Rebuild core indexes to be "Tenant-First".
-- 3. RLS Hardening: Ensure ALL write/read operations enforce (tenant_id, user_id).
-- 4. Functional Security: Set search_path on all SECURITY DEFINER functions.
-- =-------------------------------------------------------------------------
-- ORDER OF EXECUTION:
-- Phase A: Schema Repair & Data Backfill (Modules)
-- Phase B: Missing tenant_id columns (Announcements, Discussions, etc)
-- Phase C: Tenant-First Index Rebuild
-- Phase D: RLS Policy Hardening
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- PHASE A: Repair modules.tenant_id & Backfill
-- ==========================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'modules' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE public.modules ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
    END IF;
END $$;

-- Backfill modules.tenant_id from parents (courses)
UPDATE public.modules m
SET tenant_id = c.tenant_id
FROM public.courses c
WHERE m.course_id = c.id
AND m.tenant_id IS NULL;

-- Enforce NOT NULL
ALTER TABLE public.modules ALTER COLUMN tenant_id SET NOT NULL;

-- Create initial tenant index for backfill performance
CREATE INDEX IF NOT EXISTS idx_modules_tenant ON public.modules (tenant_id);

-- ==========================================================================
-- PHASE B: Rebuild Indexes (Tenant-First Strategy)
-- ==========================================================================

-- 1. Drop inefficient single-column indexes
DROP INDEX IF EXISTS idx_lesson_progress_user_lesson;
DROP INDEX IF EXISTS idx_modules_course;
DROP INDEX IF EXISTS idx_lessons_module;
DROP INDEX IF EXISTS idx_discussions_tenant;
DROP INDEX IF EXISTS idx_discussions_course;

-- 2. Create optimized composite indexes with IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_lesson_progress_tenant_user_lesson ON public.lesson_progress (tenant_id, user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_modules_tenant_course ON public.modules (tenant_id, course_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_tenant_module ON public.lessons (tenant_id, module_id, position);
CREATE INDEX IF NOT EXISTS idx_discussions_tenant_course ON public.discussions (tenant_id, course_id, created_at DESC);

-- ==========================================================================
-- PHASE C: RLS Policy Hardening
-- ==========================================================================

-- Ensure RLS is enabled
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 1. Hardening Assignments (SELECT + INSERT)
DROP POLICY IF EXISTS "enrolled_students_read_assignments" ON assignments;
DROP POLICY IF EXISTS "enrolled_students_read_assignments_v3" ON assignments;
CREATE POLICY "enrolled_students_read_assignments_v4" ON assignments
  FOR SELECT
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND is_published = true
    AND EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.course_id = assignments.course_id
      AND e.user_id = auth.uid()
      AND e.tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );

-- 2. Hardening Discussions (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "authors_update_discussions_v3" ON discussions;
CREATE POLICY "authors_update_discussions_v4" ON discussions
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND author_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
  );

DROP POLICY IF EXISTS "authors_insert_discussions" ON discussions;
CREATE POLICY "authors_insert_discussions_v1" ON discussions
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND author_id = auth.uid()
  );

DROP POLICY IF EXISTS "authors_delete_discussions_v3" ON discussions;
CREATE POLICY "authors_delete_discussions_v4" ON discussions
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    AND (
      author_id = auth.uid() 
      OR (auth.jwt() ->> 'role' = 'ADMIN')
    )
  );

-- ==========================================================================
-- PHASE D: Security Definer Hardening (search_path = public, pg_temp)
-- ==========================================================================

ALTER FUNCTION public.submit_quiz_attempt(uuid, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_teacher_analytics(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_lesson_progress_monotonic(uuid, uuid, float, text) SET search_path = public, pg_temp;

COMMIT;

NOTIFY pgrst, 'reload schema';

