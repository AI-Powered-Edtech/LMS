-- Phase 4 Hardening: Assignments & Submissions Refinement
-- Refinement based on Lead Architect Review to ensure production-grade security and functionality.

-- 1. Add columns to assignments
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Add attempt_number to assignment_submissions
ALTER TABLE assignment_submissions
ADD COLUMN IF NOT EXISTS attempt_number integer DEFAULT 1 CHECK (attempt_number > 0);

-- 3. Update Unique Constraint for Multiple Attempts
-- First, drop the old constraint if it exists (usually named based on columns)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'assignment_submissions_assignment_id_student_id_key') THEN
        ALTER TABLE assignment_submissions DROP CONSTRAINT assignment_submissions_assignment_id_student_id_key;
    END IF;
END $$;

-- Add new composite unique constraint
ALTER TABLE assignment_submissions
ADD CONSTRAINT unique_assignment_attempt
UNIQUE (assignment_id, student_id, attempt_number);

-- 4. Refine RLS Policies for assignments
DROP POLICY IF EXISTS "enrolled_students_read_assignments" ON assignments;
CREATE POLICY "enrolled_students_read_assignments" ON assignments
  FOR SELECT
  USING (
    assignments.is_published = true
    AND EXISTS (
      SELECT 1 FROM course_enrollments
      WHERE course_enrollments.course_id = assignments.course_id
      AND course_enrollments.user_id = auth.uid()
      AND course_enrollments.tenant_id = assignments.tenant_id
    )
  );

-- 5. Refine RLS Policies for assignment_submissions (Tenant Guard)
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
      AND a.tenant_id = assignment_submissions.tenant_id -- Explicit Tenant Guard
    )
  );

-- 6. Refine Trigger Guard for progress integration
-- We replace the existing trigger with a more guarded one
DROP TRIGGER IF EXISTS after_assignment_submission ON assignment_submissions;

CREATE TRIGGER after_assignment_submission
AFTER INSERT OR UPDATE ON assignment_submissions
FOR EACH ROW
WHEN (
  NEW.status = 'submitted'
  AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM 'submitted')
)
EXECUTE FUNCTION on_assignment_submitted();

-- 7. Comments for documentation
COMMENT ON COLUMN assignments.is_published IS 'Whether the assignment is visible to students.';
COMMENT ON COLUMN assignment_submissions.attempt_number IS 'The attempt count for this specific assignment by the student.';
