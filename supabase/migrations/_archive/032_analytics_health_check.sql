-- ==========================================================================
-- Migration 32: Analytics Health Check
--
-- Implements a health check RPC for the analytics system to monitor
-- stale data, missing stats, and general engine health.
-- ==========================================================================

-- 1. Create the health check RPC
CREATE OR REPLACE FUNCTION public.analytics_health_check()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_stats_count integer;
    v_last_refresh timestamptz;
    v_stale_count integer;
    v_error_count integer;
    v_is_healthy boolean := true;
BEGIN
    -- count total stats
    SELECT COUNT(*) INTO v_stats_count FROM public.course_stats;
    
    -- last refresh time
    SELECT MAX(last_calculated_at) INTO v_last_refresh FROM public.course_stats;
    
    -- count stale records (older than 1 hour)
    SELECT COUNT(*) INTO v_stale_count 
    FROM public.course_stats 
    WHERE last_calculated_at < now() - interval '1 hour';
    
    -- count records with errors
    SELECT COUNT(*) INTO v_error_count 
    FROM public.course_stats 
    WHERE last_refresh_error IS NOT NULL;

    -- Health logic
    IF v_stats_count = 0 OR v_stale_count > (v_stats_count * 0.2) THEN
        v_is_healthy := false;
    END IF;

    RETURN jsonb_build_object(
        'status', CASE WHEN v_is_healthy THEN 'healthy' ELSE 'unhealthy' END,
        'stats_count', v_stats_count,
        'last_refresh', v_last_refresh,
        'stale_count', v_stale_count,
        'error_count', v_error_count,
        'timestamp', now()
    );
END;
$$;

COMMENT ON FUNCTION public.analytics_health_check IS 'Returns health status and diagnostic metrics for the analytics engine.';
