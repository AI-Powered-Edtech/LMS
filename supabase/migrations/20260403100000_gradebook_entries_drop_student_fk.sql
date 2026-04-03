-- Migration: Drop FK constraint on gradebook_entries.student_id
-- REASON: addGradebookItem() uses a sentinel UUID (00000000-0000-0000-0000-000000000001)
-- to represent column-definition rows (no student data). The FK to profiles.id prevents
-- this pattern. RLS policies still enforce tenant isolation and student access control.
-- TODO (Phase 31): Migrate column definitions to a dedicated `gradebook_columns` table
-- and re-add the FK constraint for real student rows.

ALTER TABLE public.gradebook_entries
  DROP CONSTRAINT IF EXISTS gradebook_entries_student_id_fkey;

-- Add a descriptive comment to the table
COMMENT ON COLUMN public.gradebook_entries.student_id IS
  'Student UUID. May contain sentinel 00000000-0000-0000-0000-000000000001 for column-definition rows (no student data). FK removed in Phase 30; to be restored in Phase 31 with gradebook_columns table.';
