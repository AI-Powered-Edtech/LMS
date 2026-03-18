-- ==========================================================================
-- Migration 39: Iron Shell Hardening (CTO Audit P0/P1)
--
-- 4-Layer Security Hardening:
--   Layer 1: Tenant Isolation (WITH CHECK on all writes)
--   Layer 2: Hierarchical Ownership (course → course_modules → lesson → resource)
--   Layer 3: Write Integrity (WITH CHECK everywhere)
--   Layer 4: Index-Backed RLS (composite indexes for every EXISTS subquery)
--
-- IMPORTANT: Remote schema uses:
--   public.course_modules (tenant_id, course_id) — content modules
--   public.modules (slug, name) — feature toggle system, NO tenant_id
--   public.lessons.module_id → references course_modules.id
--   public.assignments.class_id (no lesson_id, no is_published on remote)
--   public.lesson_resources.order_index (not position)
--
-- P1: N+1 Query Elimination (get_lesson_viewer_payload RPC)
-- ==========================================================================

BEGIN;

-- ==========================================================================
-- LAYER 1 & 3: WITH CHECK Hardening
-- Ensure write operations cannot mutate tenant_id or user_id to foreign values.
-- ==========================================================================

-- ── lesson_progress UPDATE: add WITH CHECK ──
DROP POLICY IF EXISTS "lesson_progress_update" ON public.lesson_progress;
CREATE POLICY "lesson_progress_update" ON public.lesson_progress
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

-- ── lesson_progress INSERT: reinforce ──
DROP POLICY IF EXISTS "lesson_progress_insert" ON public.lesson_progress;
CREATE POLICY "lesson_progress_insert" ON public.lesson_progress
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

-- ── assignment_submissions INSERT: reinforce ──
DROP POLICY IF EXISTS "assignment_submissions_insert" ON public.assignment_submissions;
CREATE POLICY "assignment_submissions_insert" ON public.assignment_submissions
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND student_id = (SELECT auth.uid())
  );


-- ==========================================================================
-- LAYER 2: Hierarchical Ownership Validation
-- Teachers can only modify content they own via the course hierarchy:
--   course (created_by) → course_modules → lesson → lesson_resource
-- ADMINs get a blanket override within their tenant.
-- ==========================================================================

-- ── COURSES: Owner or Admin can update ──
DROP POLICY IF EXISTS "courses_update" ON public.courses;
CREATE POLICY "courses_update" ON public.courses
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      created_by = (SELECT auth.uid())
      OR has_role('ADMIN'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
  );

-- ── COURSES: Owner or Admin can delete ──
DROP POLICY IF EXISTS "courses_delete" ON public.courses;
CREATE POLICY "courses_delete" ON public.courses
  FOR DELETE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      created_by = (SELECT auth.uid())
      OR has_role('ADMIN'::app_role)
    )
  );

-- ── COURSES: Teacher/Admin can insert (must set created_by to self) ──
DROP POLICY IF EXISTS "courses_insert_teacher" ON public.courses;
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
CREATE POLICY "courses_insert" ON public.courses
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND created_by = (SELECT auth.uid())
    AND (has_role('TEACHER'::app_role) OR has_role('ADMIN'::app_role))
  );

-- ── COURSE_MODULES: Hierarchical ownership via parent course ──
DROP POLICY IF EXISTS "course_modules_insert_teacher" ON public.course_modules;
DROP POLICY IF EXISTS "course_modules_update_teacher" ON public.course_modules;
DROP POLICY IF EXISTS "course_modules_delete_teacher" ON public.course_modules;

CREATE POLICY "course_modules_insert_owner" ON public.course_modules
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_modules.course_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  );

CREATE POLICY "course_modules_update_owner" ON public.course_modules
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_modules.course_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
  );

CREATE POLICY "course_modules_delete_owner" ON public.course_modules
  FOR DELETE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_modules.course_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  );

-- ── LESSONS: Hierarchical ownership via course_modules → course ──
DROP POLICY IF EXISTS "lessons_insert_teacher" ON public.lessons;
DROP POLICY IF EXISTS "lessons_update_teacher" ON public.lessons;
DROP POLICY IF EXISTS "lessons_delete_teacher" ON public.lessons;

CREATE POLICY "lessons_insert_owner" ON public.lessons
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.course_modules m
        JOIN public.courses c ON c.id = m.course_id
        WHERE m.id = lessons.module_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  );

CREATE POLICY "lessons_update_owner" ON public.lessons
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.course_modules m
        JOIN public.courses c ON c.id = m.course_id
        WHERE m.id = lessons.module_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
  );

CREATE POLICY "lessons_delete_owner" ON public.lessons
  FOR DELETE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.course_modules m
        JOIN public.courses c ON c.id = m.course_id
        WHERE m.id = lessons.module_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  );

-- ── LESSON_RESOURCES: Hierarchical ownership via lesson → course_modules → course ──
DROP POLICY IF EXISTS "lesson_resources_insert_teacher" ON public.lesson_resources;
DROP POLICY IF EXISTS "lesson_resources_update_teacher" ON public.lesson_resources;
DROP POLICY IF EXISTS "lesson_resources_delete_teacher" ON public.lesson_resources;

CREATE POLICY "lesson_resources_insert_owner" ON public.lesson_resources
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.course_modules m ON m.id = l.module_id
        JOIN public.courses c ON c.id = m.course_id
        WHERE l.id = lesson_resources.lesson_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  );

CREATE POLICY "lesson_resources_update_owner" ON public.lesson_resources
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.course_modules m ON m.id = l.module_id
        JOIN public.courses c ON c.id = m.course_id
        WHERE l.id = lesson_resources.lesson_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
  );

CREATE POLICY "lesson_resources_delete_owner" ON public.lesson_resources
  FOR DELETE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND (
      EXISTS (
        SELECT 1 FROM public.lessons l
        JOIN public.course_modules m ON m.id = l.module_id
        JOIN public.courses c ON c.id = m.course_id
        WHERE l.id = lesson_resources.lesson_id
        AND c.tenant_id = (SELECT public.get_my_tenant_id())
        AND c.created_by = (SELECT auth.uid())
      )
      OR has_role('ADMIN'::app_role)
    )
  );

-- ── DISCUSSIONS: Add WITH CHECK to update policies ──
DROP POLICY IF EXISTS "Authors can update their discussions" ON public.discussions;
DROP POLICY IF EXISTS "authors_update_discussions_v4" ON public.discussions;
CREATE POLICY "discussions_update_author" ON public.discussions
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND author_id = (SELECT auth.uid())
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND author_id = (SELECT auth.uid())
  );

-- Teachers can pin discussions — with WITH CHECK
DROP POLICY IF EXISTS "Teachers can pin discussions" ON public.discussions;
CREATE POLICY "discussions_pin_teacher" ON public.discussions
  FOR UPDATE
  USING (
    tenant_id = (SELECT public.get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = discussions.course_id
      AND c.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    tenant_id = (SELECT public.get_my_tenant_id())
  );


-- ==========================================================================
-- LAYER 4: Index-Backed RLS
-- Every EXISTS subquery in an RLS policy MUST have a composite index.
-- ==========================================================================

-- Ownership chain indexes
CREATE INDEX IF NOT EXISTS idx_courses_tenant_created_by
  ON public.courses (tenant_id, created_by);

CREATE INDEX IF NOT EXISTS idx_course_modules_tenant_course_id
  ON public.course_modules (tenant_id, course_id);

CREATE INDEX IF NOT EXISTS idx_lessons_tenant_module_id
  ON public.lessons (tenant_id, module_id);

CREATE INDEX IF NOT EXISTS idx_lesson_resources_tenant_lesson_id
  ON public.lesson_resources (tenant_id, lesson_id);

-- Discussion ownership index
CREATE INDEX IF NOT EXISTS idx_discussions_tenant_course_author
  ON public.discussions (tenant_id, course_id, author_id);

-- Enrollment lookup index (used by assignment RLS)
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_user_tenant
  ON public.course_enrollments (course_id, user_id, tenant_id);


-- ==========================================================================
-- P1: N+1 Query Elimination — get_lesson_viewer_payload()
-- Single RPC that returns everything the Lesson Viewer needs.
-- Uses course_modules (not modules) and order_index (not position).
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.get_lesson_viewer_payload(
  p_lesson_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id uuid;
  v_user_id uuid;
  v_result jsonb;
BEGIN
  v_tenant_id := (SELECT public.get_my_tenant_id());
  v_user_id := (SELECT auth.uid());

  IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT jsonb_build_object(
    'lesson', row_to_json(l.*),
    'module', row_to_json(m.*),
    'course', jsonb_build_object(
      'id', c.id,
      'title', c.title,
      'description', c.description,
      'created_by', c.created_by
    ),
    'resources', COALESCE((
      SELECT jsonb_agg(row_to_json(lr.*) ORDER BY lr.order_index)
      FROM public.lesson_resources lr
      WHERE lr.lesson_id = l.id
      AND lr.tenant_id = v_tenant_id
    ), '[]'::jsonb),
    'progress', (
      SELECT row_to_json(lp.*)
      FROM public.lesson_progress lp
      WHERE lp.lesson_id = l.id
      AND lp.user_id = v_user_id
      AND lp.tenant_id = v_tenant_id
      LIMIT 1
    ),
    'quiz', (
      SELECT row_to_json(q.*)
      FROM public.quizzes q
      WHERE q.lesson_id = l.id
      AND q.tenant_id = v_tenant_id
      LIMIT 1
    ),
    'sibling_lessons', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sl.id,
        'title', sl.title,
        'order', sl."order",
        'type', sl.type
      ) ORDER BY sl."order")
      FROM public.lessons sl
      WHERE sl.module_id = l.module_id
      AND sl.tenant_id = v_tenant_id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  JOIN public.courses c ON c.id = m.course_id
  WHERE l.id = p_lesson_id
  AND l.tenant_id = v_tenant_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'LESSON_NOT_FOUND';
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_lesson_viewer_payload IS
'Single RPC: lesson + module + course + resources + progress + quiz + siblings.
Eliminates N+1 query explosion. Enforces tenant isolation at DB level.';

COMMIT;

NOTIFY pgrst, 'reload schema';
