-- Phase 4: Assignment System
-- This migration adds the assignments and assignment_submissions tables, ensuring multi-tenant isolation and integration with the progress engine.

-- 1. Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  instructions text,
  max_points integer DEFAULT 100,
  due_date timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 2. Create assignment_submissions table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id),
  submission_text text,
  file_url text,
  score numeric,
  feedback text,
  status public.submission_status DEFAULT 'SUBMITTED'::public.submission_status,
  submitted_at timestamptz DEFAULT now(),
  graded_at timestamptz,
  UNIQUE(assignment_id, student_id)
);
-- 3. Ensure required columns exist (01_migration.sql may have created a simpler table)
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS instructions text;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_points integer DEFAULT 100;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 3b. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_assignments_lesson ON assignments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignments_tenant ON assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_tenant ON assignment_submissions(tenant_id);

-- 4. Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for assignments
-- Students can read assignments for courses they are enrolled in
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

-- Teachers can manage assignments in their courses
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

-- 6. RLS Policies for assignment_submissions
-- Students can manage their own submissions
DROP POLICY IF EXISTS "students_manage_own_submissions" ON assignment_submissions;
CREATE POLICY "students_manage_own_submissions" ON assignment_submissions
  FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Teachers can read and grade all submissions in their courses
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

-- 7. Function to mark lesson as completed on submission
CREATE OR REPLACE FUNCTION on_assignment_submitted()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark the lesson as completed for the student
  INSERT INTO lesson_progress (tenant_id, user_id, lesson_id, completed, progress_percent, last_position_seconds, updated_at)
  SELECT 
    NEW.tenant_id, 
    NEW.student_id, 
    a.lesson_id, 
    true, 
    100, 
    0, 
    now()
  FROM assignments a
  WHERE a.id = NEW.assignment_id
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET 
    completed = true, 
    progress_percent = 100,
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for progress integration
DROP TRIGGER IF EXISTS after_assignment_submission ON assignment_submissions;
CREATE TRIGGER after_assignment_submission
AFTER INSERT OR UPDATE ON assignment_submissions
FOR EACH ROW
WHEN (NEW.status = 'SUBMITTED'::public.submission_status)
EXECUTE FUNCTION on_assignment_submitted();
