-- 049_nilai_per_cp.sql
-- Fase 2 Unit 22: Nilai per CP — aggregation view
--
-- Compute, per (student × curriculum_item), the weighted average across all
-- assessment artifacts (assignments + quizzes) tagged to that CP. The view is
-- materialized for performance; refresh hook is left to the operator until
-- Fase 2 Unit 25 event bus drives it via outbox.

CREATE MATERIALIZED VIEW IF NOT EXISTS public.nilai_per_cp_mv AS
WITH assignment_grades AS (
    SELECT
        s.student_id,
        ac.curriculum_item_id,
        s.tenant_id,
        s.score::numeric * ac.weight AS weighted_score,
        ac.weight
    FROM public.assignment_submissions s
    JOIN public.assignment_curriculum_items ac
        ON ac.assignment_id = s.assignment_id
    WHERE s.score IS NOT NULL
),
quiz_grades AS (
    SELECT
        a.student_id,
        qc.curriculum_item_id,
        a.tenant_id,
        a.score::numeric * qc.weight AS weighted_score,
        qc.weight
    FROM public.quiz_attempts_v2 a
    JOIN public.quiz_curriculum_items qc
        ON qc.quiz_id = a.quiz_id
    WHERE a.score IS NOT NULL
),
combined AS (
    SELECT * FROM assignment_grades
    UNION ALL
    SELECT * FROM quiz_grades
)
SELECT
    student_id,
    curriculum_item_id,
    tenant_id,
    SUM(weighted_score) / NULLIF(SUM(weight), 0) AS avg_score,
    COUNT(*)                                     AS sample_count
FROM combined
GROUP BY student_id, curriculum_item_id, tenant_id;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_nilai_per_cp_mv
    ON public.nilai_per_cp_mv (student_id, curriculum_item_id);

CREATE INDEX IF NOT EXISTS idx_nilai_per_cp_mv_tenant
    ON public.nilai_per_cp_mv (tenant_id);

CREATE OR REPLACE FUNCTION public.refresh_nilai_per_cp()
RETURNS void LANGUAGE sql AS $fn$
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.nilai_per_cp_mv;
$fn$;

GRANT EXECUTE ON FUNCTION public.refresh_nilai_per_cp() TO PUBLIC;
