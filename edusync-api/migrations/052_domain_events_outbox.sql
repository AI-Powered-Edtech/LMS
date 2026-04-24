-- 052_domain_events_outbox.sql
-- Fase 2 Unit 25 + 26: domain_events outbox + first event-driven migration
--
-- Pattern: transactional outbox. Producers INSERT into domain_events as part
-- of the same transaction that mutates the aggregate. A separate worker
-- (Rust binary edusync-events-worker, to be built next) polls unprocessed
-- events and dispatches to handlers.
--
-- The first event we route through the outbox is `assessment.attempt.submitted`
-- which fan-outs to: gradebook entry, XP award, parent notification.

CREATE TABLE IF NOT EXISTS public.domain_events (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL,
    event_type      TEXT         NOT NULL,                    -- 'assessment.attempt.submitted', ...
    aggregate_type  TEXT         NOT NULL,                    -- 'quiz_attempt', 'assignment_submission', ...
    aggregate_id    UUID         NOT NULL,
    payload         JSONB        NOT NULL,
    occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    -- Worker bookkeeping
    processed_at    TIMESTAMPTZ,
    process_attempts INTEGER     NOT NULL DEFAULT 0,
    last_error      TEXT,
    next_attempt_at TIMESTAMPTZ
);

-- Worker pulls work via this index: unprocessed, oldest-due-first.
CREATE INDEX IF NOT EXISTS idx_domain_events_pending
    ON public.domain_events (next_attempt_at NULLS FIRST, occurred_at)
    WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate
    ON public.domain_events (aggregate_type, aggregate_id);

CREATE INDEX IF NOT EXISTS idx_domain_events_tenant_type
    ON public.domain_events (tenant_id, event_type);

-- Helper: emit an event (for use inside transactions / triggers).
CREATE OR REPLACE FUNCTION public.emit_domain_event(
    p_tenant_id UUID,
    p_event_type TEXT,
    p_aggregate_type TEXT,
    p_aggregate_id UUID,
    p_payload JSONB
) RETURNS UUID
LANGUAGE plpgsql AS $fn$
DECLARE
    new_id UUID;
BEGIN
    INSERT INTO public.domain_events (
        tenant_id, event_type, aggregate_type, aggregate_id, payload
    ) VALUES (
        p_tenant_id, p_event_type, p_aggregate_type, p_aggregate_id, p_payload
    ) RETURNING id INTO new_id;
    -- Wake the worker via NOTIFY (worker LISTEN's on this channel).
    PERFORM pg_notify('domain_events_new', new_id::text);
    RETURN new_id;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.emit_domain_event(UUID, TEXT, TEXT, UUID, JSONB) TO PUBLIC;

-- ---------------------------------------------------------------------------
-- Unit 26: Wire `assessment.attempt.submitted` to the outbox.
-- A trigger on quiz_attempts_v2 emits the event when status transitions to
-- 'submitted'. The worker handles it idempotently downstream.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.emit_quiz_attempt_submitted()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'submitted')
       OR (TG_OP = 'UPDATE' AND NEW.status = 'submitted' AND COALESCE(OLD.status, '') <> 'submitted') THEN
        PERFORM public.emit_domain_event(
            NEW.tenant_id,
            'assessment.attempt.submitted',
            'quiz_attempt',
            NEW.id,
            jsonb_build_object(
                'attempt_id', NEW.id,
                'quiz_id', NEW.quiz_id,
                'student_id', NEW.student_id,
                'score', NEW.score,
                'submitted_at', COALESCE(NEW.submitted_at, now())
            )
        );
    END IF;
    RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_quiz_attempt_submitted ON public.quiz_attempts_v2;
CREATE TRIGGER trg_quiz_attempt_submitted
    AFTER INSERT OR UPDATE ON public.quiz_attempts_v2
    FOR EACH ROW EXECUTE FUNCTION public.emit_quiz_attempt_submitted();
