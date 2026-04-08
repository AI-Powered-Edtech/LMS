-- Gradebook entries: migrate from assignment_id/quiz_id to entity_type/entity_id pattern
-- Also: rename notes→feedback, add title column

BEGIN;

-- Add new columns
ALTER TABLE public.gradebook_entries
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT;

-- Migrate existing data from old schema to new schema
UPDATE public.gradebook_entries
SET
  entity_type = CASE
    WHEN quiz_id IS NOT NULL THEN 'quiz'
    WHEN assignment_id IS NOT NULL THEN 'assignment'
    ELSE 'manual'
  END,
  entity_id = COALESCE(quiz_id, assignment_id),
  feedback = notes
WHERE entity_type IS NULL AND (quiz_id IS NOT NULL OR assignment_id IS NOT NULL);

-- Drop old unique constraint if it exists
ALTER TABLE public.gradebook_entries
  DROP CONSTRAINT IF EXISTS gradebook_entries_tenant_id_student_id_course_id_assignment_id_quiz_id_key;

-- Add new unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gradebook_entries_tenant_student_course_entity_key'
  ) THEN
    ALTER TABLE public.gradebook_entries
      ADD CONSTRAINT gradebook_entries_tenant_student_course_entity_key
      UNIQUE (tenant_id, student_id, course_id, entity_type, entity_id);
  END IF;
END $$;

COMMIT;
