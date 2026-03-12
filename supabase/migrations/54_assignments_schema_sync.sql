-- Migration: 54_assignments_schema_sync.sql
-- Goal: Synchronize permissions and schema for assignments and assignment_submissions with the codebase.
-- This follows the CTO validation to separate schema changes from data seeding.

-- 1. Update assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS instructions text,
ADD COLUMN IF NOT EXISTS max_points integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 1;

ALTER TABLE assignments ALTER COLUMN class_id DROP NOT NULL;

-- 1.1 Data Migration for assignments
UPDATE assignments 
SET instructions = description 
WHERE instructions IS NULL AND description IS NOT NULL;

-- 2. Update assignment_submissions table
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS submission_text text,
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS score numeric,
ADD COLUMN IF NOT EXISTS feedback text,
ADD COLUMN IF NOT EXISTS graded_at timestamptz;

-- 2.1 Data Migration for assignment_submissions
UPDATE assignment_submissions
SET submission_text = content
WHERE submission_text IS NULL AND content IS NOT NULL;

-- 3. Update quizzes table
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES course_modules(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS instructions text,
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS passing_score integer DEFAULT 60;

ALTER TABLE quizzes ALTER COLUMN class_id DROP NOT NULL;

-- 4. Resolve function overloads and fix implementation
DROP FUNCTION IF EXISTS public.add_user_points(uuid, integer);

CREATE OR REPLACE FUNCTION public.add_user_points(
    p_user_id uuid,
    p_points integer,
    p_class_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id uuid;
    v_total_points integer;
BEGIN
    -- Get user's tenant
    v_tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    IF v_tenant_id IS NULL THEN
        SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = p_user_id;
    END IF;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Tenant ID not found';
    END IF;

    -- 1. Insert into history log
    INSERT INTO public.user_points (user_id, tenant_id, points, class_id, created_at, updated_at)
    VALUES (p_user_id, v_tenant_id, p_points, p_class_id, now(), now());

    -- 2. Update global leaderboard (Summary table)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leaderboards') THEN
        INSERT INTO public.leaderboards (tenant_id, user_id, points, updated_at)
        VALUES (v_tenant_id, p_user_id, p_points, now())
        ON CONFLICT (tenant_id, user_id)
        DO UPDATE SET 
            points = public.leaderboards.points + EXCLUDED.points,
            updated_at = now();
    END IF;

    -- 3. Recompute Level on profiles (Summing history)
    SELECT COALESCE(SUM(points), 0) INTO v_total_points FROM public.user_points WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
    
    UPDATE public.profiles
    SET 
        level = public.compute_level(v_total_points),
        updated_at = now()
    WHERE id = p_user_id;

END;
$$;

-- 5. Ensure RLS Policies are synchronized (as per migration 12)
-- Assignments policies
DROP POLICY IF EXISTS "enrolled_students_read_assignments" ON assignments;
CREATE POLICY "enrolled_students_read_assignments" ON assignments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = assignments.course_id
      AND course_enrollments.user_id = auth.uid()
      AND course_enrollments.tenant_id = assignments.tenant_id
    )
  );

DROP POLICY IF EXISTS "teachers_manage_assignments" ON assignments;
CREATE POLICY "teachers_manage_assignments" ON assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = assignments.course_id
      AND course_enrollments.user_id = auth.uid()
      AND course_enrollments.role IN ('teacher', 'admin')
      AND course_enrollments.tenant_id = assignments.tenant_id
    )
  );

-- Submissions policies
DROP POLICY IF EXISTS "students_manage_own_submissions" ON assignment_submissions;
CREATE POLICY "students_manage_own_submissions" ON assignment_submissions
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "teachers_grade_submissions" ON assignment_submissions;
CREATE POLICY "teachers_grade_submissions" ON assignment_submissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN course_enrollments e ON a.course_id = e.course_id
      WHERE a.id = assignment_submissions.assignment_id
      AND e.user_id = auth.uid()
      AND e.role IN ('teacher', 'admin')
      AND e.tenant_id = assignment_submissions.tenant_id
    )
  );
