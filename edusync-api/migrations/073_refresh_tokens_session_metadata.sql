-- 073_refresh_tokens_session_metadata.sql
-- Bring refresh_tokens schema in line with edusync-auth/src/session.rs.
-- Code has been writing ip_address / user_agent / last_used_at since session
-- tracking landed; baseline.sql snapshot pre-dates those columns. Additive,
-- nullable, idempotent.

ALTER TABLE public.refresh_tokens
    ADD COLUMN IF NOT EXISTS ip_address   TEXT,
    ADD COLUMN IF NOT EXISTS user_agent   TEXT,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session
    ON public.refresh_tokens(session_id) WHERE session_id IS NOT NULL;
