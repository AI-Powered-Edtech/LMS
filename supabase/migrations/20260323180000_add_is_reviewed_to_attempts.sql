-- Add is_reviewed column to quiz_attempts_v2 (partitioned table).
-- The column propagates automatically to all existing partitions.
-- Default FALSE so existing rows are marked as "not yet reviewed".

ALTER TABLE quiz_attempts_v2
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN quiz_attempts_v2.is_reviewed
  IS 'Whether a teacher has reviewed the cheating signals for this attempt';
