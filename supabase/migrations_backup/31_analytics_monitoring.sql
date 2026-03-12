-- ==========================================================================
-- Migration 31: Analytics Monitoring Metrics
--
-- Implements an RPC to record analytics-related metrics for external monitoring
-- (e.g., Prometheus ingestion).
-- ==========================================================================

-- 1. Create a table to store metrics if we want persistent logs, 
-- though often these are ephemeral or exported immediately.
-- For this implementation, we'll use a table to act as a buffer/log.
CREATE TABLE IF NOT EXISTS public.analytics_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name text NOT NULL,
    metric_value float8 NOT NULL,
    labels jsonb DEFAULT '{}'::jsonb,
    timestamp timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Only admins can view metrics
CREATE POLICY "Admins can view analytics metrics"
ON public.analytics_metrics FOR SELECT
USING (
    (auth.jwt() ->> 'role') = 'admin'
);

-- 4. Create the RPC to record metrics
CREATE OR REPLACE FUNCTION public.record_analytics_metric(
    p_metric_name text,
    p_value float8,
    p_labels jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.analytics_metrics (metric_name, metric_value, labels)
    VALUES (p_metric_name, p_value, p_labels);
END;
$$;

-- 3. Update get_teacher_analytics to record a metric of usage
-- (Already doing audit logging, but metrics are better for dashboards)
-- We'll add this to the function in a later step if needed, 
-- or users can call it explicitly.

COMMENT ON TABLE public.analytics_metrics IS 'Persistent storage for analytics metrics.';
COMMENT ON FUNCTION public.record_analytics_metric IS 'Records a numerical metric with optional labels for monitoring.';
