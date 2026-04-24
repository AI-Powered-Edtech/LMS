-- =============================================================================
-- Migration 018 : Backend schema fixes found during full audit
-- =============================================================================
-- Bugs addressed:
--   A) public.progress_events table missing       (progress_processor cron)
--   B) public.student_lesson_signals table missing (progress_processor upsert)
--   C) public.quiz_submission_queue missing columns
--      (retry_count, updated_at, next_retry_at)   (quiz_grader cron)
--   D) v1_checkout_submission_queue() returns jsonb but Rust expects SETOF
--   E) Missing RPC stubs:
--        v1_mark_dead_letter, v1_schedule_retry_submission,
--        detect_new_struggles, refresh_analytics_snapshots
-- =============================================================================

-- ── A) progress_events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.progress_events (
    id                   BIGSERIAL     PRIMARY KEY,
    event_id             UUID          NOT NULL UNIQUE,
    event_version        INTEGER       NOT NULL DEFAULT 1,
    tenant_id            UUID          NOT NULL,
    user_id              UUID          NOT NULL,
    course_id            UUID,
    lesson_id            UUID          NOT NULL,
    event_type           TEXT          NOT NULL,
    position             DOUBLE PRECISION,
    client_timestamp_ms  BIGINT        NOT NULL,
    session_id           TEXT,
    device_type          TEXT,
    processed            BOOLEAN       NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_events_unprocessed
    ON public.progress_events (client_timestamp_ms)
    WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_progress_events_tenant_user
    ON public.progress_events (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_progress_events_lesson
    ON public.progress_events (lesson_id);

-- ── B) student_lesson_signals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_lesson_signals (
    tenant_id            UUID             NOT NULL,
    user_id              UUID             NOT NULL,
    lesson_id            UUID             NOT NULL,
    total_time_spent     DOUBLE PRECISION NOT NULL DEFAULT 0,
    last_accessed_at     TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    latest_quiz_score    DOUBLE PRECISION,
    updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_sls_tenant
    ON public.student_lesson_signals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sls_last_accessed
    ON public.student_lesson_signals (last_accessed_at DESC);

-- ── C) quiz_submission_queue : missing columns ───────────────────────────────
ALTER TABLE public.quiz_submission_queue
    ADD COLUMN IF NOT EXISTS retry_count   INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS last_error    TEXT;

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.tg_qsq_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qsq_touch_updated_at ON public.quiz_submission_queue;
CREATE TRIGGER trg_qsq_touch_updated_at
    BEFORE UPDATE ON public.quiz_submission_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.tg_qsq_touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_qsq_status_retry
    ON public.quiz_submission_queue (status, next_retry_at);

-- ── D) Rewrite v1_checkout_submission_queue() ────────────────────────────────
-- Rust calls: SELECT ticket_id, attempt_id, tenant_id, retry_count
--             FROM public.v1_checkout_submission_queue()
-- So the function MUST return a table, not jsonb.
DROP FUNCTION IF EXISTS public.v1_checkout_submission_queue();
CREATE OR REPLACE FUNCTION public.v1_checkout_submission_queue()
RETURNS TABLE (
    ticket_id    UUID,
    attempt_id   UUID,
    tenant_id    UUID,
    retry_count  INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.quiz_submission_queue q
       SET status = 'PROCESSING'
     WHERE q.id = (
         SELECT qi.id FROM public.quiz_submission_queue qi
          WHERE qi.status = 'PENDING'
            AND (qi.next_retry_at IS NULL OR qi.next_retry_at <= NOW())
          ORDER BY qi.submitted_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
     )
    RETURNING q.id, q.attempt_id, q.tenant_id, q.retry_count;
END;
$$;

-- ── E) Missing RPC stubs used by grading worker ──────────────────────────────
CREATE OR REPLACE FUNCTION public.v1_mark_dead_letter(p_ticket_id UUID, p_error TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    UPDATE public.quiz_submission_queue
       SET status     = 'FAILED',
           last_error = p_error
     WHERE id = p_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.v1_schedule_retry_submission(
    p_ticket_id    UUID,
    p_retry_count  INTEGER,
    p_error        TEXT,
    p_backoff_secs INTEGER
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
    UPDATE public.quiz_submission_queue
       SET status        = 'PENDING',
           retry_count   = p_retry_count,
           last_error    = p_error,
           next_retry_at = NOW() + (p_backoff_secs || ' seconds')::interval
     WHERE id = p_ticket_id;
END;
$$;

-- No-op stubs (best-effort triggers from worker; safe to leave empty for now)
CREATE OR REPLACE FUNCTION public.detect_new_struggles()
RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END; $$;

CREATE OR REPLACE FUNCTION public.refresh_analytics_snapshots()
RETURNS void LANGUAGE plpgsql AS $$ BEGIN NULL; END; $$;

-- =============================================================================
