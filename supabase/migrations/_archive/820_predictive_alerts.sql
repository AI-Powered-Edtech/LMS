-- ============================================================
-- SP-19: Predictive Analytics & Smart Alerts
-- Rule-based churn risk + completion likelihood per student per course
-- No prediction_models table — simple weighted scoring in SQL
-- Tables: student_predictions
-- RPCs: compute_predictions, get_at_risk_students,
--        get_student_prediction, get_prediction_summary
-- pg_cron: every 15 min at :05 offset
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_predictions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES public.tenants(id),
    user_id               UUID NOT NULL,
    course_id             UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

    -- Predictions (0.0 - 1.0 probability)
    churn_risk            NUMERIC(4,3) NOT NULL DEFAULT 0,
    churn_factors         JSONB NOT NULL DEFAULT '{}',
    -- churn_factors: {declining_sessions, inactive_days, high_struggle,
    --                  low_progress_long_enrolled, low_quiz_scores}
    completion_likelihood NUMERIC(4,3) NOT NULL DEFAULT 0,
    completion_factors    JSONB NOT NULL DEFAULT '{}',

    -- Feature snapshot at computation time
    days_since_active     INT,
    session_trend         TEXT CHECK (session_trend IN ('rising', 'stable', 'declining')),
    avg_engagement        NUMERIC,
    max_struggle          INT,
    avg_completion_pct    NUMERIC,
    avg_quiz_score        NUMERIC,
    enrollment_days       INT,

    computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_tenant_course
    ON public.student_predictions (tenant_id, course_id);
CREATE INDEX IF NOT EXISTS idx_predictions_churn_high
    ON public.student_predictions (tenant_id, course_id, churn_risk DESC)
    WHERE churn_risk >= 0.5;
CREATE INDEX IF NOT EXISTS idx_predictions_tenant_user
    ON public.student_predictions (tenant_id, user_id);

ALTER TABLE public.student_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "predictions_tenant_isolation"
    ON public.student_predictions
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- ----------------------------------------------------------------
-- compute_predictions()
-- Aggregates from student_lesson_signals per course via lessons->course_modules
-- Uses MIN(first_accessed_at) as enrollment date proxy
-- Churn risk formula (spec):
--   +0.30 declining sessions (recent < prior * 0.7)
--   +0.20 days_since_active > 5
--   +0.20 max_struggle >= 5 (threshold_high default)
--   +0.15 avg_completion < 20% AND enrolled > 14 days
--   +0.15 avg_quiz_score < 40
-- Completion likelihood: progress(50%) + engagement(30%) + quiz(20%)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_predictions()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    WITH student_course_metrics AS (
        SELECT
            sls.tenant_id,
            sls.user_id,
            cm.course_id,
            AVG(sls.engagement_score)     AS avg_engagement,
            MAX(sls.struggle_score)       AS max_struggle,
            AVG(sls.completion_pct)       AS avg_completion_pct,
            AVG(sls.best_quiz_score)      AS avg_quiz_score,
            MAX(sls.last_accessed_at)     AS last_accessed,
            MIN(sls.first_accessed_at)    AS first_accessed,
            -- Sessions: last 7d vs prior 7d (14d window)
            SUM(CASE
                WHEN sls.last_accessed_at >= NOW() - INTERVAL '7 days'
                THEN sls.session_count ELSE 0
            END) AS recent_sessions,
            SUM(CASE
                WHEN sls.last_accessed_at >= NOW() - INTERVAL '14 days'
                 AND sls.last_accessed_at <  NOW() - INTERVAL '7 days'
                THEN sls.session_count ELSE 0
            END) AS prior_sessions
        FROM public.student_lesson_signals sls
        JOIN public.lessons l ON l.id = sls.lesson_id
        JOIN public.course_modules cm ON cm.id = l.module_id
        WHERE sls.first_accessed_at IS NOT NULL
        GROUP BY sls.tenant_id, sls.user_id, cm.course_id
    ),
    enriched AS (
        SELECT
            m.*,
            EXTRACT(EPOCH FROM (NOW() - m.last_accessed)) / 86400.0  AS days_since,
            EXTRACT(EPOCH FROM (NOW() - m.first_accessed)) / 86400.0 AS enroll_days,
            CASE
                WHEN m.prior_sessions > 0 AND m.recent_sessions < m.prior_sessions * 0.7 THEN 'declining'
                WHEN m.prior_sessions > 0 AND m.recent_sessions > m.prior_sessions * 1.3 THEN 'rising'
                ELSE 'stable'
            END AS trend
        FROM student_course_metrics m
    )
    INSERT INTO public.student_predictions (
        tenant_id, user_id, course_id,
        churn_risk, churn_factors,
        completion_likelihood, completion_factors,
        days_since_active, session_trend, avg_engagement,
        max_struggle, avg_completion_pct, avg_quiz_score,
        enrollment_days, computed_at
    )
    SELECT
        e.tenant_id,
        e.user_id,
        e.course_id,
        -- Churn risk: weighted sum, clamped [0, 1]
        LEAST(1.0, GREATEST(0.0,
            CASE WHEN e.trend = 'declining'                                      THEN 0.30 ELSE 0 END
          + CASE WHEN COALESCE(e.days_since, 999) > 5                            THEN 0.20 ELSE 0 END
          + CASE WHEN COALESCE(e.max_struggle, 0) >= 5                           THEN 0.20 ELSE 0 END
          + CASE WHEN COALESCE(e.avg_completion_pct, 0) < 20
                  AND COALESCE(e.enroll_days, 0) > 14                            THEN 0.15 ELSE 0 END
          + CASE WHEN COALESCE(e.avg_quiz_score, 100) < 40                       THEN 0.15 ELSE 0 END
        ))::NUMERIC(4,3),
        jsonb_build_object(
            'declining_sessions',         e.trend = 'declining',
            'inactive_days',              COALESCE(e.days_since, 999) > 5,
            'high_struggle',              COALESCE(e.max_struggle, 0) >= 5,
            'low_progress_long_enrolled', COALESCE(e.avg_completion_pct, 0) < 20
                                           AND COALESCE(e.enroll_days, 0) > 14,
            'low_quiz_scores',            COALESCE(e.avg_quiz_score, 100) < 40
        ),
        -- Completion likelihood: progress(50%) + engagement(30%) + quiz(20%)
        LEAST(1.0, GREATEST(0.0,
            (COALESCE(e.avg_completion_pct, 0) / 100.0) * 0.5
          + (COALESCE(e.avg_engagement, 0)    / 100.0) * 0.3
          + (COALESCE(e.avg_quiz_score, 0)    / 100.0) * 0.2
        ))::NUMERIC(4,3),
        jsonb_build_object(
            'progress_weight',    0.5,
            'engagement_weight',  0.3,
            'quiz_weight',        0.2
        ),
        COALESCE(e.days_since, 0)::INT,
        e.trend,
        e.avg_engagement,
        COALESCE(e.max_struggle, 0)::INT,
        e.avg_completion_pct,
        e.avg_quiz_score,
        COALESCE(e.enroll_days, 0)::INT,
        NOW()
    FROM enriched e
    ON CONFLICT (user_id, course_id) DO UPDATE SET
        churn_risk            = EXCLUDED.churn_risk,
        churn_factors         = EXCLUDED.churn_factors,
        completion_likelihood = EXCLUDED.completion_likelihood,
        completion_factors    = EXCLUDED.completion_factors,
        days_since_active     = EXCLUDED.days_since_active,
        session_trend         = EXCLUDED.session_trend,
        avg_engagement        = EXCLUDED.avg_engagement,
        max_struggle          = EXCLUDED.max_struggle,
        avg_completion_pct    = EXCLUDED.avg_completion_pct,
        avg_quiz_score        = EXCLUDED.avg_quiz_score,
        enrollment_days       = EXCLUDED.enrollment_days,
        computed_at           = NOW();
END;
$$;

-- ----------------------------------------------------------------
-- get_at_risk_students — teacher-facing sorted by churn_risk DESC
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_at_risk_students(
    p_course_id UUID,
    p_min_risk  NUMERIC DEFAULT 0.3,
    p_limit     INT DEFAULT 50
)
RETURNS TABLE (
    user_id               UUID,
    student_name          TEXT,
    churn_risk            NUMERIC,
    completion_likelihood NUMERIC,
    churn_factors         JSONB,
    days_since_active     INT,
    session_trend         TEXT,
    avg_completion_pct    NUMERIC,
    avg_quiz_score        NUMERIC,
    computed_at           TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        sp.user_id,
        COALESCE(p.full_name, p.email, sp.user_id::TEXT),
        sp.churn_risk,
        sp.completion_likelihood,
        sp.churn_factors,
        sp.days_since_active,
        sp.session_trend,
        sp.avg_completion_pct,
        sp.avg_quiz_score,
        sp.computed_at
    FROM public.student_predictions sp
    LEFT JOIN public.profiles p ON p.id = sp.user_id
    WHERE sp.course_id = p_course_id
      AND sp.tenant_id = public.get_my_tenant_id()
      AND sp.churn_risk >= p_min_risk
    ORDER BY sp.churn_risk DESC
    LIMIT p_limit;
$$;

-- ----------------------------------------------------------------
-- get_student_prediction — full detail for a single student
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_prediction(
    p_user_id   UUID,
    p_course_id UUID
)
RETURNS TABLE (
    churn_risk            NUMERIC,
    completion_likelihood NUMERIC,
    churn_factors         JSONB,
    completion_factors    JSONB,
    days_since_active     INT,
    session_trend         TEXT,
    avg_engagement        NUMERIC,
    max_struggle          INT,
    avg_completion_pct    NUMERIC,
    avg_quiz_score        NUMERIC,
    enrollment_days       INT,
    computed_at           TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        sp.churn_risk, sp.completion_likelihood,
        sp.churn_factors, sp.completion_factors,
        sp.days_since_active, sp.session_trend,
        sp.avg_engagement, sp.max_struggle,
        sp.avg_completion_pct, sp.avg_quiz_score,
        sp.enrollment_days, sp.computed_at
    FROM public.student_predictions sp
    WHERE sp.user_id = p_user_id
      AND sp.course_id = p_course_id
      AND sp.tenant_id = public.get_my_tenant_id();
$$;

-- ----------------------------------------------------------------
-- get_prediction_summary — course-level aggregate for dashboard cards
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_prediction_summary(p_course_id UUID)
RETURNS TABLE (
    total_students            INT,
    high_risk_count           INT,
    medium_risk_count         INT,
    low_risk_count            INT,
    avg_churn_risk            NUMERIC,
    avg_completion_likelihood NUMERIC,
    declining_sessions_count  INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        COUNT(*)::INT,
        COUNT(*) FILTER (WHERE sp.churn_risk >= 0.7)::INT,
        COUNT(*) FILTER (WHERE sp.churn_risk >= 0.4 AND sp.churn_risk < 0.7)::INT,
        COUNT(*) FILTER (WHERE sp.churn_risk < 0.4)::INT,
        ROUND(AVG(sp.churn_risk)::NUMERIC, 3),
        ROUND(AVG(sp.completion_likelihood)::NUMERIC, 3),
        COUNT(*) FILTER (WHERE sp.session_trend = 'declining')::INT
    FROM public.student_predictions sp
    WHERE sp.course_id = p_course_id
      AND sp.tenant_id = public.get_my_tenant_id();
$$;

GRANT EXECUTE ON FUNCTION public.compute_predictions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_at_risk_students(UUID, NUMERIC, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_prediction(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_prediction_summary(UUID) TO authenticated;
GRANT ALL ON TABLE public.student_predictions TO authenticated;

-- pg_cron: every 15 minutes at :05 offset
-- Runs after :00 (signals), :01 (lesson agg), :02 (course agg), :03 (struggle), :04 (funnels)
SELECT cron.schedule(
    'compute-predictions',
    '5-59/15 * * * *',
    $$SELECT public.compute_predictions()$$
);
