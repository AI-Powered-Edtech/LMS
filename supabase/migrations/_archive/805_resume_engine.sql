-- ============================================================================
-- Migration 805: Resume Engine
-- ============================================================================
-- SP-11: Block-anchored resume fields on lesson_progress.
--
-- Design: store block anchor (not pixel position) for stable resume across:
--   - different viewports (mobile vs desktop)
--   - lazy-mount DOM reordering
--   - teacher edits to lesson content
--   - image/video height changes
--
-- Fallback chain: last_block_id (stable) → last_block_index (positional) → top
-- Video resume: last_video_position (seconds)
-- ============================================================================

SET search_path = public;

-- Add resume fields to lesson_progress
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'last_block_id'
  ) THEN
    ALTER TABLE lesson_progress ADD COLUMN last_block_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'last_block_index'
  ) THEN
    ALTER TABLE lesson_progress ADD COLUMN last_block_index integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'last_block_offset'
  ) THEN
    -- Pixel offset from top of the block (relative, not absolute page position)
    ALTER TABLE lesson_progress ADD COLUMN last_block_offset integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lesson_progress' AND column_name = 'last_video_position'
  ) THEN
    -- Video resume position in seconds
    ALTER TABLE lesson_progress ADD COLUMN last_video_position integer;
  END IF;
END $$;

-- ============================================================================
-- Update RPC: update_lesson_progress_monotonic to accept resume fields
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_lesson_progress_monotonic(
  p_user_id uuid,
  p_lesson_id uuid,
  p_tenant_id uuid,
  p_status text,
  p_progress_percentage integer,
  p_last_position integer DEFAULT NULL,
  p_last_block_id uuid DEFAULT NULL,
  p_last_block_index integer DEFAULT NULL,
  p_last_block_offset integer DEFAULT NULL,
  p_last_video_position integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO lesson_progress (
    user_id, lesson_id, tenant_id, status, progress_percentage,
    last_position, last_block_id, last_block_index, last_block_offset, last_video_position,
    completed, completed_at
  )
  VALUES (
    p_user_id, p_lesson_id, p_tenant_id, p_status, p_progress_percentage,
    p_last_position, p_last_block_id, p_last_block_index, p_last_block_offset, p_last_video_position,
    p_status = 'completed',
    CASE WHEN p_status = 'completed' THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, lesson_id)
  DO UPDATE SET
    -- Status: only monotonically increase (never go backwards)
    status = CASE
      WHEN lesson_progress.status = 'completed' THEN 'completed'
      WHEN EXCLUDED.status = 'completed' THEN 'completed'
      ELSE EXCLUDED.status
    END,
    -- Progress: monotonically increase
    progress_percentage = GREATEST(
      lesson_progress.progress_percentage,
      EXCLUDED.progress_percentage
    ),
    -- Position fields: always use latest value (not monotonic)
    last_position = COALESCE(EXCLUDED.last_position, lesson_progress.last_position),
    last_block_id = COALESCE(EXCLUDED.last_block_id, lesson_progress.last_block_id),
    last_block_index = COALESCE(EXCLUDED.last_block_index, lesson_progress.last_block_index),
    last_block_offset = COALESCE(EXCLUDED.last_block_offset, lesson_progress.last_block_offset),
    last_video_position = COALESCE(EXCLUDED.last_video_position, lesson_progress.last_video_position),
    -- Completion: once completed, always completed
    completed = lesson_progress.completed OR (EXCLUDED.status = 'completed'),
    completed_at = CASE
      WHEN lesson_progress.completed THEN lesson_progress.completed_at
      WHEN EXCLUDED.status = 'completed' THEN now()
      ELSE NULL
    END;
END $$;
