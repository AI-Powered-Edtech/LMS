-- Migration: Quiz Pause/Resume Feature
-- Adds pause support to quiz_attempts_v2 (partitioned table)
-- Max 1 pause per attempt, max 5 minutes per pause

-- ============================================================
-- 1. Add pause columns to quiz_attempts_v2
-- ============================================================
-- NOTE: quiz_attempts_v2 is partitioned — ALTER TABLE on the
-- parent automatically propagates to all partitions.

ALTER TABLE public.quiz_attempts_v2
  ADD COLUMN IF NOT EXISTS pause_count          integer       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pause_remaining_seconds integer,
  ADD COLUMN IF NOT EXISTS paused_at            timestamptz,
  ADD COLUMN IF NOT EXISTS is_paused            boolean       NOT NULL DEFAULT false;

-- ============================================================
-- 2. RPC: pause_quiz_attempt
-- ============================================================
CREATE OR REPLACE FUNCTION public.pause_quiz_attempt(p_attempt_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_attempt     record;
  v_max_pauses  constant integer := 1;   -- max 1 pause per quiz
  v_max_secs    constant integer := 300; -- 5 minutes
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Fetch the attempt owned by this student that is currently in-progress
  SELECT id, pause_count, is_paused, status
    INTO v_attempt
    FROM public.quiz_attempts_v2
   WHERE id          = p_attempt_id
     AND student_id  = auth.uid()
     AND status      = 'in_progress'
     AND is_paused   = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt tidak ditemukan atau tidak bisa di-pause';
  END IF;

  -- Check pause budget
  IF v_attempt.pause_count >= v_max_pauses THEN
    RAISE EXCEPTION 'Batas pause sudah tercapai';
  END IF;

  -- Execute pause
  UPDATE public.quiz_attempts_v2
     SET is_paused               = true,
         paused_at               = now(),
         pause_count             = pause_count + 1,
         pause_remaining_seconds = v_max_secs
   WHERE id = p_attempt_id;

  RETURN json_build_object(
    'success',           true,
    'pause_remaining_seconds', v_max_secs,
    'pause_count',       v_attempt.pause_count + 1,
    'pauses_remaining',  v_max_pauses - (v_attempt.pause_count + 1)
  );
END;
$$;

-- ============================================================
-- 3. RPC: resume_quiz_attempt
-- ============================================================
CREATE OR REPLACE FUNCTION public.resume_quiz_attempt(p_attempt_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_attempt         record;
  v_elapsed_seconds integer;
  v_new_remaining   integer;
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Fetch the paused attempt owned by this student
  SELECT id, paused_at, pause_remaining_seconds
    INTO v_attempt
    FROM public.quiz_attempts_v2
   WHERE id         = p_attempt_id
     AND student_id = auth.uid()
     AND is_paused  = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt tidak dalam status pause';
  END IF;

  -- Compute how long pause lasted
  v_elapsed_seconds := EXTRACT(EPOCH FROM (now() - v_attempt.paused_at))::integer;
  v_new_remaining   := GREATEST(0, COALESCE(v_attempt.pause_remaining_seconds, 0) - v_elapsed_seconds);

  UPDATE public.quiz_attempts_v2
     SET is_paused               = false,
         paused_at               = NULL,
         pause_remaining_seconds = v_new_remaining
   WHERE id = p_attempt_id;

  RETURN json_build_object(
    'success',          true,
    'pause_used_seconds', v_elapsed_seconds
  );
END;
$$;

-- ============================================================
-- 4. Grant execution to authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION public.pause_quiz_attempt(uuid)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.resume_quiz_attempt(uuid) TO authenticated;
