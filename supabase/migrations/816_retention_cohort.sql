-- SP-15: Retention & Cohort Analysis
-- Migration: 816_retention_cohort.sql

-- ============================================================
-- 1. retention_cohorts table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.retention_cohorts (
    course_id       UUID        NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    tenant_id       UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    cohort_week     DATE        NOT NULL,  -- ISO week Monday
    period_offset   INT         NOT NULL,  -- weeks since cohort_week, 0-7
    cohort_size     INT         NOT NULL DEFAULT 0,
    retained_count  INT         NOT NULL DEFAULT 0,
    retention_rate  NUMERIC     GENERATED ALWAYS AS (
        CASE WHEN cohort_size > 0 THEN ROUND((retained_count::NUMERIC / cohort_size) * 100, 1)
             ELSE NULL
        END
    ) STORED,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (course_id, cohort_week, period_offset)
);

CREATE INDEX IF NOT EXISTS idx_retention_cohorts_tenant_course
    ON public.retention_cohorts (tenant_id, course_id, cohort_week);

-- RLS
ALTER TABLE public.retention_cohorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY retention_cohorts_tenant_isolation
    ON public.retention_cohorts
    FOR SELECT
    USING (tenant_id = public.get_my_tenant_id());

-- ============================================================
-- 2. compute_retention_cohorts() — background job function
-- ============================================================
CREATE OR REPLACE FUNCTION public.compute_retention_cohorts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- first_access: earliest week each user accessed any lesson within a course
    WITH first_access AS (
        SELECT
            c.id                                                        AS course_id,
            le.tenant_id,
            le.user_id,
            DATE_TRUNC('week', MIN(le.server_timestamp))::DATE          AS cohort_week
        FROM public.learning_events le
        JOIN public.lessons       l   ON l.id   = le.lesson_id
        JOIN public.course_modules cm ON cm.id  = l.module_id
        JOIN public.courses        c  ON c.id   = cm.course_id
        WHERE le.server_timestamp IS NOT NULL
        GROUP BY c.id, le.tenant_id, le.user_id
    ),

    -- cohort_sizes: number of distinct users per (course, tenant, cohort_week)
    cohort_sizes AS (
        SELECT
            course_id,
            tenant_id,
            cohort_week,
            COUNT(DISTINCT user_id) AS cohort_size
        FROM first_access
        GROUP BY course_id, tenant_id, cohort_week
    ),

    -- week_activity: distinct (course_id, user_id, week) tuples from learning_events
    week_activity AS (
        SELECT DISTINCT
            c.id                                                AS course_id,
            le.tenant_id,
            le.user_id,
            DATE_TRUNC('week', le.server_timestamp)::DATE       AS active_week
        FROM public.learning_events le
        JOIN public.lessons       l   ON l.id   = le.lesson_id
        JOIN public.course_modules cm ON cm.id  = l.module_id
        JOIN public.courses        c  ON c.id   = cm.course_id
        WHERE le.server_timestamp IS NOT NULL
    ),

    -- retention: join first_access × week_activity, compute period offset in weeks
    retention AS (
        SELECT
            fa.course_id,
            fa.tenant_id,
            fa.cohort_week,
            ((EXTRACT(EPOCH FROM wa.active_week::TIMESTAMPTZ - fa.cohort_week::TIMESTAMPTZ)) / 604800)::INT AS period_offset,
            fa.user_id
        FROM first_access fa
        JOIN week_activity wa
            ON  wa.course_id  = fa.course_id
            AND wa.tenant_id  = fa.tenant_id
            AND wa.user_id    = fa.user_id
            AND wa.active_week >= fa.cohort_week
    ),

    -- aggregate: count retained users per (course, tenant, cohort_week, period_offset)
    aggregated AS (
        SELECT
            r.course_id,
            r.tenant_id,
            r.cohort_week,
            r.period_offset,
            cs.cohort_size,
            COUNT(DISTINCT r.user_id) AS retained_count
        FROM retention r
        JOIN cohort_sizes cs
            ON  cs.course_id   = r.course_id
            AND cs.tenant_id   = r.tenant_id
            AND cs.cohort_week = r.cohort_week
        WHERE r.period_offset BETWEEN 0 AND 7
        GROUP BY r.course_id, r.tenant_id, r.cohort_week, r.period_offset, cs.cohort_size
    )

    INSERT INTO public.retention_cohorts
        (course_id, tenant_id, cohort_week, period_offset, cohort_size, retained_count, computed_at)
    SELECT
        course_id,
        tenant_id,
        cohort_week,
        period_offset,
        cohort_size,
        retained_count,
        NOW()
    FROM aggregated
    ON CONFLICT (course_id, cohort_week, period_offset)
    DO UPDATE SET
        tenant_id      = EXCLUDED.tenant_id,
        cohort_size    = EXCLUDED.cohort_size,
        retained_count = EXCLUDED.retained_count,
        computed_at    = EXCLUDED.computed_at;
END;
$$;

-- ============================================================
-- 3. get_retention_matrix() — teacher-facing RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_retention_matrix(
    p_course_id  UUID,
    p_weeks_back INT DEFAULT 8
)
RETURNS TABLE (
    cohort_week     DATE,
    period_offset   INT,
    cohort_size     INT,
    retained_count  INT,
    retention_rate  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rc.cohort_week,
        rc.period_offset,
        rc.cohort_size,
        rc.retained_count,
        rc.retention_rate
    FROM public.retention_cohorts rc
    WHERE rc.course_id   = p_course_id
      AND rc.tenant_id   = public.get_my_tenant_id()
      AND rc.cohort_week >= CURRENT_DATE - (p_weeks_back * 7)
    ORDER BY rc.cohort_week DESC, rc.period_offset ASC;
END;
$$;

-- ============================================================
-- 4. Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_retention_matrix(UUID, INT) TO authenticated;

-- ============================================================
-- 5. pg_cron schedule — every 15 min at :14, :29, :44, :59
-- ============================================================
SELECT cron.schedule(
    'compute-retention',
    '14-59/15 * * * *',
    $$SELECT public.compute_retention_cohorts()$$
);
