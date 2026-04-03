-- Atomic AI tutor rate limit check + increment
-- FIXED: Menggunakan pg_advisory_xact_lock untuk atomic operations
-- Masalah sebelumnya: FOR UPDATE SKIP LOCKED pada COUNT(*) tidak valid di PostgreSQL
-- ========================================================

CREATE OR REPLACE FUNCTION public.check_ai_tutor_rate_limit(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now        TIMESTAMPTZ := NOW();
    v_window_min TIMESTAMPTZ := v_now - INTERVAL '1 minute';
    v_window_day TIMESTAMPTZ := v_now - INTERVAL '1 day';
    v_count_min  INTEGER;
    v_count_day  INTEGER;
    v_limit_min  CONSTANT INTEGER := 20;
    v_limit_day  CONSTANT INTEGER := 200;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- FIXED: Gunakan advisory lock berdasarkan user_id untuk mencegah race condition
    -- Advisory lock bersifat transaction-level, otomatis release saat COMMIT/ROLLBACK
    PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

    -- Sekarang count aman — tidak ada race condition karena lock
    SELECT COUNT(*) INTO v_count_min
    FROM public.ai_tutor_rate_log
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND created_at >= v_window_min;

    IF v_count_min >= v_limit_min THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'minute_limit',
            'retry_after', 60,
            'count_min', v_count_min,
            'limit_min', v_limit_min
        );
    END IF;

    -- Count requests in last day
    SELECT COUNT(*) INTO v_count_day
    FROM public.ai_tutor_rate_log
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND created_at >= v_window_day;

    IF v_count_day >= v_limit_day THEN
        RETURN json_build_object(
            'allowed', false,
            'reason', 'day_limit',
            'retry_after', 86400,
            'count_day', v_count_day,
            'limit_day', v_limit_day
        );
    END IF;

    -- Insert log entry (aman karena masih dalam advisory lock)
    INSERT INTO public.ai_tutor_rate_log (user_id, tenant_id, created_at)
    VALUES (p_user_id, p_tenant_id, v_now);

    -- Cleanup old entries (non-blocking, best-effort)
    DELETE FROM public.ai_tutor_rate_log
    WHERE user_id = p_user_id
      AND created_at < v_now - INTERVAL '2 days';

    RETURN json_build_object(
        'allowed', true,
        'count_min', v_count_min + 1,
        'count_day', v_count_day + 1
    );
END;
$$;

-- Rate log table (simple append, no complex state)
CREATE TABLE IF NOT EXISTS public.ai_tutor_rate_log (
    id         BIGSERIAL PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id  UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_rate_log_user_time
    ON public.ai_tutor_rate_log (user_id, tenant_id, created_at);

ALTER TABLE public.ai_tutor_rate_log ENABLE ROW LEVEL SECURITY;

-- Only the DEFINER function can write; users cannot access directly
DROP POLICY IF EXISTS "no_direct_access" ON public.ai_tutor_rate_log;
CREATE POLICY "no_direct_access" ON public.ai_tutor_rate_log
    FOR ALL USING (false);

GRANT EXECUTE ON FUNCTION public.check_ai_tutor_rate_limit(UUID, UUID) TO authenticated;
