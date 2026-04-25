-- 070_event_handler_idempotency.sql
-- Workstream D1: per-(event_id, handler_name) idempotency ledger.
--
-- The outbox guarantees at-least-once delivery. Some handlers (XP award,
-- parent notification, gradebook sync) need exactly-once *side effects*. We
-- gate each side effect on inserting a row here first; the UNIQUE constraint
-- on (event_id, handler_name) makes replays a no-op.

CREATE TABLE IF NOT EXISTS public.event_handler_log (
    event_id      UUID         NOT NULL REFERENCES public.domain_events(id) ON DELETE CASCADE,
    handler_name  TEXT         NOT NULL,
    succeeded_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, handler_name)
);

CREATE INDEX IF NOT EXISTS idx_event_handler_log_handler
    ON public.event_handler_log (handler_name, succeeded_at DESC);

-- Helper: try to claim (event_id, handler_name); returns TRUE if this is the
-- first claim (caller should run the side effect) or FALSE if already done
-- (caller should skip).
CREATE OR REPLACE FUNCTION public.claim_event_handler(
    p_event_id UUID,
    p_handler_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $fn$
BEGIN
    INSERT INTO public.event_handler_log (event_id, handler_name)
    VALUES (p_event_id, p_handler_name)
    ON CONFLICT (event_id, handler_name) DO NOTHING;
    RETURN FOUND;
END
$fn$;
