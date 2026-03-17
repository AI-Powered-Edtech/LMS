-- ==========================================================================
-- Migration 27: Course Analytics Materialized View
--
-- Creates a materialized view for high-level course analytics to improve
-- read performance for administrative overviews and dashboards.
-- ==========================================================================

-- 1. Create the materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS public.course_analytics_mv AS
SELECT 
    c.id as course_id,
    c.title as course_title,
    c.tenant_id,
    COUNT(DISTINCT e.user_id) as enrolled_count,
    COALESCE(AVG(cp.percentage), 0) as avg_progress,
    COALESCE(SUM(cp.completed_lessons), 0) as total_completed_lessons,
    now() as last_refreshed_at
FROM public.courses c
LEFT JOIN public.course_enrollments e ON e.course_id = c.id AND e.status = 'ACTIVE'
LEFT JOIN public.course_progress cp ON cp.course_id = c.id AND cp.user_id = e.user_id
GROUP BY c.id, c.title, c.tenant_id;

-- 2. Add unique index to support CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_analytics_mv_course_id ON public.course_analytics_mv(course_id);
CREATE INDEX IF NOT EXISTS idx_course_analytics_mv_tenant ON public.course_analytics_mv(tenant_id);

-- 3. Utility function to refresh the view
CREATE OR REPLACE FUNCTION public.refresh_course_analytics_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.course_analytics_mv;
END;
$$;

-- 4. Enable RLS-like security via Policy on the underlying tables is not directly possible 
-- but we can restrict access via permissions and use the tenant_id column in queries.
-- Materialized views don't support RLS in Postgres <= 14. 
-- We ensure the tenant_id is always present for filtering.

GRANT SELECT ON public.course_analytics_mv TO authenticated, service_role;

COMMENT ON MATERIALIZED VIEW public.course_analytics_mv IS 
'High-level course analytics pre-computed for performance. Refreshed periodically via refresh_course_analytics_mv().';
