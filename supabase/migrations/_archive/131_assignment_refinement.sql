-- Phase 4 Refinement: Production Hardening for Assignments
-- Refinement based on Lead Architect Review

-- 1. Add updated_at and max_attempts to assignments
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS max_attempts integer DEFAULT 1 CHECK (max_attempts >= 1);

-- 2. Add composite index for Gradebook performance
CREATE INDEX idx_assignment_submissions_assignment_status 
ON assignment_submissions(assignment_id, status);

-- 3. Add trigger for updated_at if it doesn't exist for assignments
-- (Assuming handle_updated_at function exists from previous migrations)
CREATE TRIGGER set_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- 4. Update existing submissions to follow new status index if needed
-- (No data changes needed, just the index created above)

COMMENT ON COLUMN assignments.max_attempts IS 'Maximum number of times a student can submit this assignment.';
