-- ============================================================
-- Fix: Parent OTP Security
-- 1. Drop public_insert_otp permissive policy
-- 2. Add otp_hash column (ADD COLUMN IF NOT EXISTS)
-- 3. Enable pgcrypto extension
-- 4. Update request_parent_otp: gunakan kolom phone (bukan phone_number)
-- 5. Update verify_parent_otp: gunakan kolom phone (bukan phone_number)
-- 6. Schedule cleanup cron
-- ============================================================

-- Enable pgcrypto untuk hash OTP
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Drop overly permissive INSERT policy
DROP POLICY IF EXISTS "public_insert_otp" ON public.parent_otp_codes;
-- No INSERT policy = blocked by default for non-DEFINER functions

-- Step 2: Add hash column
ALTER TABLE public.parent_otp_codes
    ADD COLUMN IF NOT EXISTS otp_hash TEXT;

-- Step 3: Create index for hash lookup
-- FIXED: Kolom di tabel adalah phone (bukan phone_number)
CREATE INDEX IF NOT EXISTS idx_parent_otp_codes_hash
    ON public.parent_otp_codes (phone, otp_hash, used, expires_at);

-- Step 4: Update request_parent_otp untuk hash OTP
-- FIXED: phone_number → phone (sesuai schema aktual)
CREATE OR REPLACE FUNCTION public.request_parent_otp(
    p_phone    TEXT,
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_otp      TEXT;
    v_hash     TEXT;
    v_count    INTEGER;
BEGIN
    -- Rate limit: 3 per hour per phone
    SELECT COUNT(*) INTO v_count
    FROM public.parent_otp_codes
    WHERE phone = p_phone
      AND created_at   > NOW() - INTERVAL '1 hour'
      AND used         = false;

    IF v_count >= 3 THEN
        RAISE EXCEPTION 'Terlalu banyak permintaan OTP. Coba lagi 1 jam kemudian.'
            USING ERRCODE = 'P0004';
    END IF;

    -- Generate 6-digit OTP
    v_otp  := LPAD(FLOOR(random() * 1000000)::TEXT, 6, '0');
    -- Hash with SHA-256 (requires pgcrypto)
    v_hash := encode(digest(v_otp, 'sha256'), 'hex');

    -- Store hash only (Edge Function receives plaintext OTP to send via WhatsApp)
    -- FIXED: phone (bukan phone_number), otp_hash column
    INSERT INTO public.parent_otp_codes
        (phone, tenant_id, otp_code, otp_hash, expires_at, used)
    VALUES
        (p_phone, p_tenant_id, '[protected]', v_hash, NOW() + INTERVAL '10 minutes', false);

    -- NEVER expose OTP in DB-layer response
    RETURN json_build_object('success', true, 'expires_in', 600);
END;
$$;

-- Step 5: Update verify_parent_otp to compare hash
-- FIXED: phone_number → phone (sesuai schema aktual)
CREATE OR REPLACE FUNCTION public.verify_parent_otp(
    p_phone     TEXT,
    p_otp       TEXT,
    p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_hash   TEXT;
    v_record RECORD;
BEGIN
    -- Hash the provided OTP for comparison
    v_hash := encode(digest(p_otp, 'sha256'), 'hex');

    -- FIXED: phone (bukan phone_number)
    SELECT id INTO v_record
    FROM public.parent_otp_codes
    WHERE phone = p_phone
      AND tenant_id    = p_tenant_id
      AND otp_hash     = v_hash
      AND used         = false
      AND expires_at   > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'OTP tidak valid atau sudah kedaluwarsa.'
            USING ERRCODE = 'P0005';
    END IF;

    UPDATE public.parent_otp_codes SET used = true WHERE id = v_record.id;

    RETURN json_build_object('success', true);
END;
$$;

-- Step 6: Scheduled cleanup (pg_cron if available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'cleanup-expired-parent-otps',
            '0 */2 * * *',
            $$DELETE FROM public.parent_otp_codes
              WHERE expires_at < NOW() - INTERVAL '1 day'$$
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- pg_cron not available, skip
    NULL;
END;
$$;
