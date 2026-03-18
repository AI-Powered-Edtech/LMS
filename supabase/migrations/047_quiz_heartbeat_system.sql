-- ==========================================================================
-- Migration 47: Quiz Heartbeat System & Telemetry Refining
--
-- 1. Adds last_heartbeat_at to track real-time activity.
-- 2. Adds explicit telemetry counters for faster analytics.
-- 3. Implements heartbeat RPC.
-- 4. Updates cleanup logic to use heartbeat threshold.
-- ==========================================================================

-- 1. Add tracking columns
ALTER TABLE public.quiz_attempts 
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS focus_loss_count INTEGER DEFAULT 0;

-- 2. Add Composite Index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_cleanup_lookup 
ON public.quiz_attempts (status, last_heartbeat_at)
WHERE status = 'in_progress';

-- 2. Heartbeat RPC
CREATE OR REPLACE FUNCTION public.record_quiz_heartbeat(p_attempt_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.quiz_attempts
    SET last_heartbeat_at = now()
    WHERE id = p_attempt_id 
      AND student_id = auth.uid()
      AND status = 'in_progress';
END;
$$;

-- 3. Refined Cheating Signal with explicit counters
CREATE OR REPLACE FUNCTION public.record_cheating_signal(
    p_attempt_id UUID, 
    p_signal_type TEXT, 
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.quiz_attempts
    SET 
        last_heartbeat_at = now(),
        -- Update explicit counters based on signal type
        tab_switch_count = CASE WHEN p_signal_type = 'TAB_SWITCH' THEN tab_switch_count + 1 ELSE tab_switch_count END,
        focus_loss_count = CASE WHEN p_signal_type = 'FOCUS_LOSS' THEN focus_loss_count + 1 ELSE focus_loss_count END,
        -- Still keep the source history for full auditing
        cheating_signals = cheating_signals || jsonb_build_array(
            jsonb_build_object(
                'type', p_signal_type,
                'timestamp', now(),
                'metadata', p_metadata
            )
        )
    WHERE id = p_attempt_id 
      AND student_id = auth.uid()
      AND status = 'in_progress';
END;
$$;

-- 4. Re-implement Cleanup with Heartbeat Awareness
-- An attempt is ABANDONED if no heartbeat for > 15 minutes.
-- An attempt is EXPIRED if past time limit.
CREATE OR REPLACE FUNCTION public.cleanup_stale_quiz_attempts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count_expired INTEGER;
    v_count_abandoned INTEGER;
BEGIN
    -- A. Hard Expiration (Timer ran out)
    UPDATE public.quiz_attempts
    SET status = 'expired', finished_at = COALESCE(expires_at, now())
    WHERE status = 'in_progress'
      AND expires_at IS NOT NULL
      AND now() > expires_at + INTERVAL '5 minutes';
    
    GET DIAGNOSTICS v_count_expired = ROW_COUNT;

    -- B. Soft Inactivity (Abandoned - e.g. browser closed, no heartbeat)
    -- Using 15 minutes as the threshold for "Abandoned"
    UPDATE public.quiz_attempts
    SET status = 'abandoned', finished_at = now()
    WHERE status = 'in_progress'
      AND last_heartbeat_at < now() - INTERVAL '15 minutes';

    GET DIAGNOSTICS v_count_abandoned = ROW_COUNT;

    RETURN jsonb_build_object(
        'expired_count', v_count_expired,
        'abandoned_count', v_count_abandoned,
        'timestamp', now()
    );
END;
$$;
