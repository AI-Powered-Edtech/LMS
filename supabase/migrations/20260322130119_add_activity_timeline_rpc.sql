-- RPC: get_activity_timeline
-- Returns activity counts grouped by date for the last N days.
-- Uses conditional aggregation server-side to avoid loading raw rows.
CREATE OR REPLACE FUNCTION get_activity_timeline(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 14
)
RETURNS TABLE (
  event_date DATE,
  lesson_completions BIGINT,
  quiz_attempts BIGINT,
  assignment_submissions BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    DATE_TRUNC('day', created_at)::DATE AS event_date,
    COUNT(*) FILTER (WHERE event_type = 'LESSON_COMPLETED')                          AS lesson_completions,
    COUNT(*) FILTER (WHERE event_type IN ('QUIZ_ATTEMPT', 'QUIZ_SUBMITTED'))         AS quiz_attempts,
    COUNT(*) FILTER (WHERE event_type = 'ASSIGNMENT_SUBMITTED')                      AS assignment_submissions
  FROM activity_events
  WHERE
    tenant_id = p_tenant_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND auth.uid() IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;

-- RLS: covered by SECURITY DEFINER + auth.uid() check above
