-- 071_ai_rate_limit.sql
-- Workstream G3: per-user + per-tenant daily quotas for AI endpoints.
--
-- Counters are kept on a (tenant_id, user_id, date) row that increments
-- atomically via UPSERT. Reset = boundary cross of `date_utc`. Operators
-- can override per-tenant ceilings via `ai_quota_overrides`.

CREATE TABLE IF NOT EXISTS public.ai_usage_counters (
    tenant_id    UUID         NOT NULL,
    user_id      UUID         NOT NULL,
    date_utc     DATE         NOT NULL,
    requests     INTEGER      NOT NULL DEFAULT 0,
    tokens       BIGINT       NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id, date_utc)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_counters_tenant_day
    ON public.ai_usage_counters (tenant_id, date_utc);

CREATE TABLE IF NOT EXISTS public.ai_quota_overrides (
    tenant_id    UUID         PRIMARY KEY,
    daily_user_requests   INTEGER,
    daily_user_tokens     BIGINT,
    daily_tenant_requests INTEGER,
    daily_tenant_tokens   BIGINT,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Try to charge (requests + tokens) against the user's & tenant's daily
-- quota. Returns the new (user_requests, user_tokens, tenant_requests,
-- tenant_tokens) tuple if accepted, or NULL if the request would exceed any
-- quota (caller returns 429 with Retry-After = midnight UTC).
CREATE OR REPLACE FUNCTION public.charge_ai_usage(
    p_tenant_id UUID,
    p_user_id UUID,
    p_requests INTEGER,
    p_tokens BIGINT,
    p_default_user_requests INTEGER,
    p_default_user_tokens BIGINT,
    p_default_tenant_requests INTEGER,
    p_default_tenant_tokens BIGINT
) RETURNS TABLE(user_requests INTEGER, user_tokens BIGINT,
                tenant_requests INTEGER, tenant_tokens BIGINT)
LANGUAGE plpgsql AS $fn$
DECLARE
    today DATE := (now() AT TIME ZONE 'UTC')::date;
    o public.ai_quota_overrides%ROWTYPE;
    user_req_cap INTEGER;
    user_tok_cap BIGINT;
    tenant_req_cap INTEGER;
    tenant_tok_cap BIGINT;
    new_user_req INTEGER;
    new_user_tok BIGINT;
    new_tenant_req INTEGER;
    new_tenant_tok BIGINT;
BEGIN
    SELECT * INTO o FROM public.ai_quota_overrides WHERE tenant_id = p_tenant_id;
    user_req_cap   := COALESCE(o.daily_user_requests,   p_default_user_requests);
    user_tok_cap   := COALESCE(o.daily_user_tokens,     p_default_user_tokens);
    tenant_req_cap := COALESCE(o.daily_tenant_requests, p_default_tenant_requests);
    tenant_tok_cap := COALESCE(o.daily_tenant_tokens,   p_default_tenant_tokens);

    INSERT INTO public.ai_usage_counters (tenant_id, user_id, date_utc, requests, tokens)
    VALUES (p_tenant_id, p_user_id, today, p_requests, p_tokens)
    ON CONFLICT (tenant_id, user_id, date_utc) DO UPDATE
        SET requests   = public.ai_usage_counters.requests + EXCLUDED.requests,
            tokens     = public.ai_usage_counters.tokens   + EXCLUDED.tokens,
            updated_at = now()
    RETURNING requests, tokens INTO new_user_req, new_user_tok;

    SELECT COALESCE(SUM(requests),0)::int, COALESCE(SUM(tokens),0)::bigint
      INTO new_tenant_req, new_tenant_tok
      FROM public.ai_usage_counters
     WHERE tenant_id = p_tenant_id AND date_utc = today;

    IF new_user_req   > user_req_cap
    OR new_user_tok   > user_tok_cap
    OR new_tenant_req > tenant_req_cap
    OR new_tenant_tok > tenant_tok_cap THEN
        -- Roll back the charge so the caller's 429 doesn't permanently
        -- consume quota the user never got value for.
        UPDATE public.ai_usage_counters
           SET requests = requests - p_requests,
               tokens   = tokens   - p_tokens
         WHERE tenant_id = p_tenant_id AND user_id = p_user_id AND date_utc = today;
        RETURN; -- NULL row → caller treats as over-quota
    END IF;

    user_requests   := new_user_req;
    user_tokens     := new_user_tok;
    tenant_requests := new_tenant_req;
    tenant_tokens   := new_tenant_tok;
    RETURN NEXT;
END
$fn$;
