-- =============================================================
-- Rate Limits Table — Phase 5 Security Enhancement
-- Per-user RPC call frequency tracking
-- =============================================================

-- Rate limits table is defined in 20260329000001_rate_limits_table.sql

-- auto_set_tenant_id trigger (moved to baseline or earlier)
-- CREATE OR REPLACE TRIGGER auto_set_tenant_id_rate_limits
--   BEFORE INSERT ON public.rate_limits
--   FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- RLS: deny all untuk anon dan authenticated (service_role only)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_anon_deny" ON public.rate_limits
  FOR ALL TO anon USING (false);

CREATE POLICY "rate_limits_authenticated_deny" ON public.rate_limits
  FOR ALL TO authenticated USING (false);

-- pg_cron purge job: hapus entries > 1 jam setiap 15 menit
SELECT cron.schedule(
  'purge-rate-limits',
  '*/15 * * * *',
  $$DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 hour'$$
);

-- Helper function: cek dan increment rate limit
-- Returns TRUE jika di bawah limit, FALSE jika melebihi
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user_id     UUID,
  p_endpoint    TEXT,
  p_max_calls   INTEGER DEFAULT 100,
  p_window_secs INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id  UUID;
  v_window     TIMESTAMPTZ;
  v_count      INTEGER;
BEGIN
  v_tenant_id := get_my_tenant_id();
  v_window    := date_trunc('minute', now());

  INSERT INTO public.rate_limits (tenant_id, user_id, action, window_start, attempts)
  VALUES (v_tenant_id, p_user_id, p_endpoint, v_window, 1)
  ON CONFLICT (key, action, window_start)
  DO UPDATE SET
    attempts = rate_limits.attempts + 1,
    updated_at = now()
  RETURNING attempts INTO v_count;

  RETURN v_count <= p_max_calls;
END;
$$;