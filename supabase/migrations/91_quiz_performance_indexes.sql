-- Migration 91: Quiz Engine — 100k-Scale Performance Indexes
-- ============================================================
-- Optimized for high concurrent load (100k simultaneous submissions).
-- NOTE: Cannot use CONCURRENTLY on partitioned tables in migrations.
-- ============================================================

-- ── HOT PATH 1: Find active attempt for a student
-- Used by: v1_start_quiz_attempt (resume check), getActiveAttempt()
CREATE INDEX IF NOT EXISTS idx_v2_student_active_status
    ON public.quiz_attempts_v2 (student_id, quiz_id, status)
    WHERE status = 'in_progress';

-- ── HOT PATH 2: Gradebook — all attempts for an assignment
-- Used by: v1_get_assignment_results(), QuizGradebook page
CREATE INDEX IF NOT EXISTS idx_v2_assignment_submitted
    ON public.quiz_attempts_v2 (assignment_id, submitted_at DESC NULLS LAST)
    WHERE status IN ('submitted', 'graded');

-- ── HOT PATH 3: Analytics — quiz-level stats
-- Used by: quiz_stats aggregation, get_quiz_results
CREATE INDEX IF NOT EXISTS idx_v2_quiz_status_score
    ON public.quiz_attempts_v2 (quiz_id, status, score)
    WHERE status IN ('submitted', 'graded');

-- ── HOT PATH 4: Tenant isolation scan (required for RLS enforcement)
-- Already exists from migration 84 as idx_quiz_attempts_v2_tenant
-- but ensure it exists on the parent table
CREATE INDEX IF NOT EXISTS idx_v2_tenant_student
    ON public.quiz_attempts_v2 (tenant_id, student_id);

-- ── HOT PATH 5: Expiry cleanup job
-- Used by: cleanup_stale_quiz_attempts()
CREATE INDEX IF NOT EXISTS idx_v2_expires_in_progress
    ON public.quiz_attempts_v2 (expires_at)
    WHERE status = 'in_progress';

-- ── HOT PATH 6: Heartbeat staleness check
-- Used by: cleanup_stale_quiz_attempts() abandoned detection
CREATE INDEX IF NOT EXISTS idx_v2_heartbeat_in_progress
    ON public.quiz_attempts_v2 (last_heartbeat_at)
    WHERE status = 'in_progress';

-- ── quiz_attempt_questions_v2: lookup answers for an attempt
CREATE INDEX IF NOT EXISTS idx_v2_aq_attempt_question
    ON public.quiz_attempt_questions_v2 (attempt_id, question_id);

-- ── quiz_attempt_questions_v2: tenant isolation for RLS
CREATE INDEX IF NOT EXISTS idx_v2_aq_tenant
    ON public.quiz_attempt_questions_v2 (tenant_id);

-- ── quiz_attempt_answers: lookup selected options per attempt + question
-- NOTE: quiz_attempt_answers table does not exist in current schema
-- (answers are stored in quiz_attempt_questions_v2.student_answers JSONB)
-- Commented out until table is created
-- CREATE INDEX IF NOT EXISTS idx_answers_attempt_question
--     ON public.quiz_attempt_answers (attempt_id, question_id);

-- -- quiz_attempt_answers: tenant isolation
-- CREATE INDEX IF NOT EXISTS idx_answers_tenant
--     ON public.quiz_attempt_answers (tenant_id);

-- ============================================================
-- PARTITION AUTO-PROVISIONING FUNCTION
-- Create next quarter partition if it doesn't exist
-- Schedule via pg_cron or call from Edge Function monthly
-- ============================================================

CREATE OR REPLACE FUNCTION public.ensure_quiz_attempt_partition(
    p_year  INTEGER,
    p_month INTEGER  -- start month of the quarter (1, 4, 7, 10)
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_partition_name TEXT;
    v_from_date      DATE;
    v_to_date        DATE;
    v_quarter_months INTEGER[] := ARRAY[1, 4, 7, 10];
    v_next_month     INTEGER;
    v_next_year      INTEGER;
BEGIN
    -- Validate quarter start month
    IF NOT (p_month = ANY(v_quarter_months)) THEN
        RAISE EXCEPTION 'p_month must be a quarter-start month: 1, 4, 7, or 10';
    END IF;

    v_from_date := make_date(p_year, p_month, 1);
    v_partition_name := format(
        'quiz_attempts_v2_%s_%s',
        to_char(v_from_date, 'YYYY'),
        to_char(v_from_date, 'MM')
    );

    -- Compute to_date (+3 months)
    v_to_date := v_from_date + INTERVAL '3 months';

    -- Create if not exists
    BEGIN
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.quiz_attempts_v2
             FOR VALUES FROM (%L) TO (%L)',
            v_partition_name,
            v_from_date,
            v_to_date
        );

        EXECUTE format(
            'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
            v_partition_name
        );

        RETURN format('Partition %I created (%s → %s)', v_partition_name, v_from_date, v_to_date);
    EXCEPTION WHEN duplicate_table THEN
        RETURN format('Partition %I already exists', v_partition_name);
    END;
END;
$$;

COMMENT ON FUNCTION public.ensure_quiz_attempt_partition IS
  'Auto-provision quarterly partitions for quiz_attempts_v2.
   Call monthly via pg_cron: SELECT ensure_quiz_attempt_partition(EXTRACT(YEAR FROM NOW()), ...)';

-- Pre-provision next 2 quarters automatically
SELECT public.ensure_quiz_attempt_partition(2026, 7);
SELECT public.ensure_quiz_attempt_partition(2026, 10);
