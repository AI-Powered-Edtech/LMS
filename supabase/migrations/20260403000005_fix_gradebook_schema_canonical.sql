-- ========================================================
-- Fix: Canonical gradebook schema using entity_type/entity_id
-- Strategy: 018 migration introduced entity_type+entity_id pattern.
-- This migration reconciles 002 (assignment_id/quiz_id) with 018
-- to ensure a consistent, flexible schema going forward.
-- ========================================================

-- 1. Ensure gradebook_entries exists with canonical schema (018 pattern)
CREATE TABLE IF NOT EXISTS public.gradebook_entries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id)   ON DELETE CASCADE,
  course_id   uuid        NOT NULL REFERENCES public.courses(id)   ON DELETE CASCADE,
  student_id  uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  entity_type text        NOT NULL CHECK (entity_type IN ('assignment', 'quiz', 'manual')),
  entity_id   uuid        NOT NULL,
  score       numeric     NOT NULL DEFAULT 0,
  max_score   numeric     NOT NULL DEFAULT 100,
  feedback    text,
  graded_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  graded_at   timestamptz DEFAULT NOW(),
  created_at  timestamptz DEFAULT NOW(),
  updated_at  timestamptz DEFAULT NOW(),
  UNIQUE (tenant_id, student_id, course_id, entity_type, entity_id)
);

-- Add CHECK constraint if table already exists from migration 018 (which didn't have it)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'gradebook_entries_entity_type_check'
          AND conrelid = 'public.gradebook_entries'::regclass
    ) THEN
        ALTER TABLE public.gradebook_entries
            ADD CONSTRAINT gradebook_entries_entity_type_check
            CHECK (entity_type IN ('assignment', 'quiz', 'manual'));
    END IF;
END;
$$;

-- Add UNIQUE constraint if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'gradebook_entries_tenant_student_course_entity_type_entity_id_key'
          AND conrelid = 'public.gradebook_entries'::regclass
    ) THEN
        ALTER TABLE public.gradebook_entries
            ADD CONSTRAINT gradebook_entries_tenant_student_course_entity_type_entity_id_key
            UNIQUE (tenant_id, student_id, course_id, entity_type, entity_id);
    END IF;
END;
$$;

-- 2. Enable RLS (safe if already enabled)
ALTER TABLE public.gradebook_entries ENABLE ROW LEVEL SECURITY;

-- 3. Ensure essential indexes exist
CREATE INDEX IF NOT EXISTS idx_ge_tenant_course    ON public.gradebook_entries(tenant_id, course_id);
CREATE INDEX IF NOT EXISTS idx_ge_tenant_student   ON public.gradebook_entries(tenant_id, student_id);
CREATE INDEX IF NOT EXISTS idx_ge_course_student   ON public.gradebook_entries(course_id, student_id);
CREATE INDEX IF NOT EXISTS idx_ge_entity           ON public.gradebook_entries(entity_type, entity_id);

-- 4. RLS Policies (drop old names if they exist, then recreate)
DROP POLICY IF EXISTS "teachers_manage_gradebook"      ON public.gradebook_entries;
DROP POLICY IF EXISTS "students_view_own_grades"       ON public.gradebook_entries;
DROP POLICY IF EXISTS "ge_teacher_manage"              ON public.gradebook_entries;
DROP POLICY IF EXISTS "ge_student_view_own"            ON public.gradebook_entries;
DROP POLICY IF EXISTS "ge_admin_access"                ON public.gradebook_entries;

-- Teachers: manage entries for courses they created
CREATE POLICY "ge_teacher_manage"
  ON public.gradebook_entries FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND course_id IN (
      SELECT id FROM public.courses
      WHERE tenant_id = get_my_tenant_id()
        AND created_by = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND course_id IN (
      SELECT id FROM public.courses
      WHERE tenant_id = get_my_tenant_id()
        AND created_by = auth.uid()
    )
  );

-- Students: read own grades only
CREATE POLICY "ge_student_view_own"
  ON public.gradebook_entries FOR SELECT
  USING (
    tenant_id = get_my_tenant_id()
    AND student_id = auth.uid()
  );

-- Admins: full access within tenant
CREATE POLICY "ge_admin_access"
  ON public.gradebook_entries FOR ALL
  USING (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = get_my_tenant_id()
        AND UPPER(ur.role::text) = 'ADMIN'
    )
  )
  WITH CHECK (
    tenant_id = get_my_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id = get_my_tenant_id()
        AND UPPER(ur.role::text) = 'ADMIN'
    )
  );

-- 5. Compatibility view for legacy code that references assignment_id / quiz_id columns
CREATE OR REPLACE VIEW public.gradebook_entries_legacy AS
SELECT
  id,
  tenant_id,
  course_id,
  student_id,
  entity_type,
  entity_id,
  CASE WHEN entity_type = 'assignment' THEN entity_id ELSE NULL END AS assignment_id,
  CASE WHEN entity_type = 'quiz'       THEN entity_id ELSE NULL END AS quiz_id,
  score,
  max_score,
  CASE WHEN max_score > 0 THEN ROUND((score / max_score * 100)::numeric, 2)::float ELSE 0 END AS percentage,
  feedback AS notes,
  NULL::text AS grade_letter,
  graded_by,
  graded_at,
  created_at,
  updated_at
FROM public.gradebook_entries;

-- 6. Fix compute_grade_letter: add auth guard
CREATE OR REPLACE FUNCTION compute_grade_letter(
  p_percentage FLOAT,
  p_course_id  UUID,
  p_tenant_id  UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scale     JSONB;
  v_letter    TEXT    := 'F';
  v_threshold FLOAT;
  v_key       TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authentication required';
  END IF;

  SELECT grading_scale INTO v_scale
  FROM gradebook_settings
  WHERE course_id = p_course_id
    AND tenant_id = p_tenant_id;

  IF v_scale IS NULL THEN
    v_scale := '{"A":90,"B":80,"C":70,"D":60,"F":0}'::JSONB;
  END IF;

  FOR v_key, v_threshold IN
    SELECT key, (value #>> '{}')::FLOAT
    FROM jsonb_each(v_scale)
    ORDER BY (value #>> '{}')::FLOAT DESC
  LOOP
    IF p_percentage >= v_threshold THEN
      v_letter := v_key;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_letter;
END;
$$;

-- 7. Fix sync_gradebook_entries: use quiz_attempts_v2 (partitioned) instead of quiz_attempts
-- FIXED: quiz_attempts_v2 uses submitted_at (not completed_at)
CREATE OR REPLACE FUNCTION sync_gradebook_entries(
  p_course_id UUID,
  p_tenant_id UUID
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  -- Verifikasi caller adalah guru kursus ini atau admin tenant
  IF NOT EXISTS (
    SELECT 1 FROM courses
    WHERE id = p_course_id
      AND tenant_id = p_tenant_id
      AND created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya guru atau admin yang dapat sinkronisasi gradebook';
  END IF;

  -- FIXED: Use quiz_attempts_v2 (partitioned table) with submitted_at
  INSERT INTO gradebook_entries (
    tenant_id,
    student_id,
    course_id,
    entity_type,
    entity_id,
    score,
    max_score,
    graded_at,
    updated_at
  )
  SELECT
    p_tenant_id,
    qa.student_id,
    p_course_id,
    'quiz',
    qa.quiz_id,
    qa.score,
    COALESCE(q.total_points, 100),
    qa.submitted_at,
    now()
  FROM quiz_attempts_v2 qa
  JOIN quizzes q ON q.id = qa.quiz_id
  WHERE q.course_id   = p_course_id
    AND qa.tenant_id  = p_tenant_id
    AND qa.submitted_at IS NOT NULL
  ON CONFLICT (tenant_id, student_id, course_id, entity_type, entity_id)
  DO UPDATE SET
    score     = EXCLUDED.score,
    max_score = EXCLUDED.max_score,
    graded_at = EXCLUDED.graded_at,
    updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
