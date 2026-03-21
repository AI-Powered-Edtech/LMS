-- ============================================================
-- SP-17: Learning Path Analysis
-- Computes ordered sequences of lessons students take through a course
-- Tables: learning_paths
-- RPCs: compute_learning_paths, get_learning_paths, get_student_path
-- pg_cron: weekly Sunday 3AM
-- ============================================================

CREATE TABLE IF NOT EXISTS public.learning_paths (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
    course_id           UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    path_hash           TEXT NOT NULL,
    path_steps          JSONB NOT NULL DEFAULT '[]',
    -- path_steps format: [{lesson_id, lesson_title, completion_pct, is_completed}]
    user_count          INT NOT NULL DEFAULT 0,
    avg_completion_rate NUMERIC(5,2) DEFAULT 0,
    avg_score           NUMERIC(5,2),
    is_optimal          BOOLEAN DEFAULT false,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, path_hash)
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_tenant_course
    ON public.learning_paths (tenant_id, course_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_optimal
    ON public.learning_paths (tenant_id, course_id) WHERE is_optimal = true;
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_count
    ON public.learning_paths (course_id, user_count DESC);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_paths_tenant_isolation"
    ON public.learning_paths
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- ----------------------------------------------------------------
-- compute_learning_paths(p_course_id)
-- Builds paths as ordered lesson sequences per student (by first_accessed_at)
-- Groups by MD5 hash, counts users per unique path
-- Marks highest-completion path as optimal (is_optimal = true)
-- p_course_id = NULL recomputes for all courses
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_learning_paths(p_course_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_course RECORD;
BEGIN
    FOR v_course IN
        SELECT DISTINCT cm.course_id, sls.tenant_id
        FROM public.student_lesson_signals sls
        JOIN public.lessons l ON l.id = sls.lesson_id
        JOIN public.course_modules cm ON cm.id = l.module_id
        WHERE (p_course_id IS NULL OR cm.course_id = p_course_id)
          AND sls.first_accessed_at IS NOT NULL
    LOOP
        -- Delete old paths for this course/tenant combo
        DELETE FROM public.learning_paths
        WHERE course_id = v_course.course_id
          AND tenant_id = v_course.tenant_id;

        WITH student_paths AS (
            SELECT
                sls.user_id,
                jsonb_agg(
                    jsonb_build_object(
                        'lesson_id',      sls.lesson_id,
                        'lesson_title',   l.title,
                        'completion_pct', sls.completion_pct,
                        'is_completed',   sls.is_completed
                    ) ORDER BY sls.first_accessed_at
                ) AS path_steps,
                MD5(
                    string_agg(sls.lesson_id::TEXT, ',' ORDER BY sls.first_accessed_at)
                ) AS path_hash,
                AVG(sls.completion_pct)    AS avg_completion,
                AVG(sls.best_quiz_score)   AS avg_score
            FROM public.student_lesson_signals sls
            JOIN public.lessons l ON l.id = sls.lesson_id
            JOIN public.course_modules cm ON cm.id = l.module_id
            WHERE cm.course_id = v_course.course_id
              AND sls.tenant_id = v_course.tenant_id
              AND sls.first_accessed_at IS NOT NULL
            GROUP BY sls.user_id
        ),
        path_groups AS (
            SELECT
                sp.path_hash,
                (array_agg(sp.path_steps ORDER BY sp.path_hash))[1] AS path_steps,
                COUNT(*)::INT                               AS user_count,
                ROUND(AVG(sp.avg_completion)::NUMERIC, 2)  AS avg_completion_rate,
                ROUND(AVG(sp.avg_score)::NUMERIC, 2)       AS avg_score
            FROM student_paths sp
            GROUP BY sp.path_hash
        ),
        ranked AS (
            SELECT *,
                ROW_NUMBER() OVER (ORDER BY avg_completion_rate DESC, user_count DESC) AS rn
            FROM path_groups
        )
        INSERT INTO public.learning_paths (
            tenant_id, course_id, path_hash, path_steps,
            user_count, avg_completion_rate, avg_score, is_optimal, computed_at
        )
        SELECT
            v_course.tenant_id,
            v_course.course_id,
            r.path_hash,
            r.path_steps,
            r.user_count,
            r.avg_completion_rate,
            r.avg_score,
            (r.rn = 1),
            NOW()
        FROM ranked r;
    END LOOP;
END;
$$;

-- ----------------------------------------------------------------
-- get_learning_paths — teacher-facing: returns paths for a course
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_learning_paths(
    p_course_id UUID,
    p_min_users INT DEFAULT 1
)
RETURNS TABLE (
    id                  UUID,
    path_hash           TEXT,
    path_steps          JSONB,
    user_count          INT,
    avg_completion_rate NUMERIC,
    avg_score           NUMERIC,
    is_optimal          BOOLEAN,
    computed_at         TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        lp.id, lp.path_hash, lp.path_steps, lp.user_count,
        lp.avg_completion_rate, lp.avg_score, lp.is_optimal, lp.computed_at
    FROM public.learning_paths lp
    WHERE lp.course_id = p_course_id
      AND lp.tenant_id = public.get_my_tenant_id()
      AND lp.user_count >= p_min_users
    ORDER BY lp.user_count DESC;
$$;

-- ----------------------------------------------------------------
-- get_student_path — individual student's lesson traversal order
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_student_path(
    p_user_id   UUID,
    p_course_id UUID
)
RETURNS TABLE (
    step_order        INT,
    lesson_id         UUID,
    lesson_title      TEXT,
    module_title      TEXT,
    first_accessed_at TIMESTAMPTZ,
    completion_pct    NUMERIC,
    is_completed      BOOLEAN,
    time_spent        INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        ROW_NUMBER() OVER (ORDER BY sls.first_accessed_at)::INT,
        sls.lesson_id,
        l.title,
        cm.title,
        sls.first_accessed_at,
        sls.completion_pct,
        sls.is_completed,
        sls.total_time_spent
    FROM public.student_lesson_signals sls
    JOIN public.lessons l ON l.id = sls.lesson_id
    JOIN public.course_modules cm ON cm.id = l.module_id
    WHERE cm.course_id = p_course_id
      AND sls.user_id = p_user_id
      AND sls.tenant_id = public.get_my_tenant_id()
      AND sls.first_accessed_at IS NOT NULL
    ORDER BY sls.first_accessed_at;
$$;

GRANT EXECUTE ON FUNCTION public.compute_learning_paths(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_learning_paths(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_path(UUID, UUID) TO authenticated;
GRANT ALL ON TABLE public.learning_paths TO authenticated;

-- pg_cron: weekly Sunday at 3 AM (paths are expensive to compute)
SELECT cron.schedule(
    'compute-learning-paths',
    '0 3 * * 0',
    $$SELECT public.compute_learning_paths()$$
);
