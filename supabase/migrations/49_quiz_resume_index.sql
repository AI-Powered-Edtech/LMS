-- Migration 49: Quiz Resume Optimization & Heartbeat Refinement
-- Description: Adds optimized covering index for resume queries and updates heartbeat RPC to return status.

-- 1. Optimized Covering Index for Resume Queries
-- This handles student lookup + status filter + order by started_at DESC in one efficient scan.
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_status_started
ON public.quiz_attempts(student_id, status, started_at DESC);

-- 2. Refined Heartbeat RPC
-- Returns TRUE if the heartbeat was successfully recorded (attempt is still IN_PROGRESS).
-- Returns FALSE if the attempt is no longer IN_PROGRESS (e.g., marked ABANDONED by system).
DROP FUNCTION IF EXISTS public.record_quiz_heartbeat(UUID);
CREATE OR REPLACE FUNCTION public.record_quiz_heartbeat(
    p_attempt_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_tenant_id UUID;
    v_updated BOOLEAN;
BEGIN
    -- 1. Get tenant context securely
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = v_user_id;

    -- 2. Perform secured heartbeat update
    UPDATE public.quiz_attempts
    SET last_heartbeat_at = now()
    WHERE id = p_attempt_id
      AND student_id = v_user_id
      AND tenant_id = v_tenant_id
      AND status = 'in_progress';
    
    -- Check if a row was actually affected
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    RETURN v_updated;
END;
$$;

-- Grant EXECUTION
GRANT EXECUTE ON FUNCTION public.record_quiz_heartbeat(UUID) TO authenticated;
