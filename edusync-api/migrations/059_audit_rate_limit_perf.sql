-- 059_audit_rate_limit_perf.sql
-- Fase 7 Units 49-53: audit log coverage + rate limit per tenant + perf budget
--
-- Existing schema: admin_audit_logs covers admin actions only. This migration
-- adds audit hooks for the broader app surface and per-tenant rate limit
-- counters.

-- 50 — Comprehensive audit log (anything mutating that's not user-content).
CREATE TABLE IF NOT EXISTS public.app_audit_logs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL,
    actor_id        UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role      TEXT,
    action          TEXT         NOT NULL,        -- 'rapor.sign', 'rombel.assign_student', 'invoice.mark_paid', ...
    entity_type     TEXT         NOT NULL,
    entity_id       UUID,
    diff            JSONB,                        -- before/after diff
    ip_address      TEXT,
    user_agent      TEXT,
    request_id      UUID,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_audit_logs_tenant_action
    ON public.app_audit_logs(tenant_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_audit_logs_entity
    ON public.app_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_app_audit_logs_actor
    ON public.app_audit_logs(actor_id, created_at DESC);

-- 51 — Rate limit per tenant (sliding window counter).
-- Inserted by middleware; cleaned up by cron every hour.
CREATE TABLE IF NOT EXISTS public.tenant_rate_limit_counters (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    bucket          TEXT         NOT NULL,        -- 'api_total', 'ai_calls', 'sms_sends', 'storage_bytes'
    window_start    TIMESTAMPTZ  NOT NULL,
    count           BIGINT       NOT NULL DEFAULT 0,

    UNIQUE (tenant_id, bucket, window_start)
);

CREATE INDEX IF NOT EXISTS idx_tenant_rate_limit_counters_window
    ON public.tenant_rate_limit_counters(tenant_id, bucket, window_start DESC);

-- Atomic increment helper.
CREATE OR REPLACE FUNCTION public.increment_rate_limit_counter(
    p_tenant_id UUID,
    p_bucket TEXT,
    p_amount BIGINT DEFAULT 1
) RETURNS BIGINT
LANGUAGE plpgsql AS $fn$
DECLARE
    new_count BIGINT;
    win_start TIMESTAMPTZ := date_trunc('hour', now());
BEGIN
    INSERT INTO public.tenant_rate_limit_counters (tenant_id, bucket, window_start, count)
    VALUES (p_tenant_id, p_bucket, win_start, p_amount)
    ON CONFLICT (tenant_id, bucket, window_start)
    DO UPDATE SET count = public.tenant_rate_limit_counters.count + EXCLUDED.count
    RETURNING count INTO new_count;
    RETURN new_count;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.increment_rate_limit_counter(UUID, TEXT, BIGINT) TO PUBLIC;

-- Cleanup older than 24h (called by cron).
CREATE OR REPLACE FUNCTION public.purge_rate_limit_counters()
RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
    deleted INT;
BEGIN
    DELETE FROM public.tenant_rate_limit_counters
     WHERE window_start < now() - interval '24 hours';
    GET DIAGNOSTICS deleted = ROW_COUNT;
    RETURN deleted;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.purge_rate_limit_counters() TO PUBLIC;

-- 52 — Performance budget snapshots (LCP, INP, CLS — captured by FE webVitals).
CREATE TABLE IF NOT EXISTS public.web_vitals_snapshots (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID,
    user_id         UUID,
    route           TEXT         NOT NULL,
    metric          TEXT         NOT NULL CHECK (metric IN ('LCP', 'INP', 'CLS', 'FCP', 'TTFB')),
    value           NUMERIC(10,3) NOT NULL,
    rating          TEXT         CHECK (rating IN ('good', 'needs-improvement', 'poor')),
    user_agent      TEXT,
    captured_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_web_vitals_route_metric
    ON public.web_vitals_snapshots(route, metric, captured_at DESC);
