-- =============================================================================
-- Migration 20260402000008: Parent OTP Registration
-- Wave 4 — Task 29.2
-- =============================================================================
-- Membuat tabel parent_otp_codes untuk menyimpan OTP sementara saat orang tua
-- mendaftar via nomor HP. OTP expire setelah 10 menit.
-- Rate limit: maks 3 OTP per nomor HP per jam (diverifikasi di aplikasi & DB).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.parent_otp_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text        NOT NULL,
  email       text,
  otp_code    text        NOT NULL,
  tenant_id   uuid        REFERENCES public.tenants(id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  used        boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Aktifkan RLS
ALTER TABLE public.parent_otp_codes ENABLE ROW LEVEL SECURITY;

-- Public dapat insert (request OTP)
CREATE POLICY "public_insert_otp"
  ON public.parent_otp_codes
  FOR INSERT
  WITH CHECK (true);

-- Public dapat SELECT OTP yang masih valid (belum expired, belum digunakan)
-- Ini memungkinkan frontend verifikasi OTP tanpa autentikasi
CREATE POLICY "public_verify_otp"
  ON public.parent_otp_codes
  FOR SELECT
  USING (
    expires_at > now()
    AND NOT used
  );

-- Public dapat UPDATE untuk menandai OTP sebagai sudah digunakan
CREATE POLICY "public_use_otp"
  ON public.parent_otp_codes
  FOR UPDATE
  USING (
    expires_at > now()
    AND NOT used
  );

-- Index untuk performa query verifikasi OTP
CREATE INDEX IF NOT EXISTS idx_otp_phone_active
  ON public.parent_otp_codes (phone, used, expires_at);

-- Index untuk cleanup OTP kadaluarsa
CREATE INDEX IF NOT EXISTS idx_otp_expires_at
  ON public.parent_otp_codes (expires_at);

-- =============================================================================
-- RPC: request_parent_otp
-- Membuat OTP baru dengan rate limiting (maks 3 per nomor per jam)
-- Mengembalikan { success, otp_code (dev only), message }
-- =============================================================================
CREATE OR REPLACE FUNCTION public.request_parent_otp(
  p_phone    text,
  p_tenant_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent_count integer;
  v_otp          text;
  v_expires_at   timestamptz;
  v_is_dev       boolean;
BEGIN
  -- Validasi format nomor HP sederhana (minimal 9 digit)
  IF length(regexp_replace(p_phone, '[^0-9]', '', 'g')) < 9 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nomor HP tidak valid. Minimal 9 digit.'
    );
  END IF;

  -- Rate limiting: maks 3 request OTP per nomor HP per jam
  SELECT COUNT(*) INTO v_recent_count
  FROM public.parent_otp_codes
  WHERE phone = p_phone
    AND created_at > now() - interval '1 hour';

  IF v_recent_count >= 3 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Terlalu banyak permintaan OTP. Coba lagi dalam 1 jam.'
    );
  END IF;

  -- Generate OTP 6 digit
  v_otp := lpad(floor(random() * 1000000)::text, 6, '0');
  v_expires_at := now() + interval '10 minutes';

  -- Simpan OTP ke database
  INSERT INTO public.parent_otp_codes (phone, otp_code, tenant_id, expires_at)
  VALUES (p_phone, v_otp, p_tenant_id, v_expires_at);

  -- Dev mode: kembalikan OTP dalam response (production: akan dikirim via WhatsApp)
  RETURN json_build_object(
    'success', true,
    'message', 'Kode OTP berhasil dibuat.',
    'dev_otp', v_otp,          -- HANYA untuk development! Hapus di production
    'expires_at', v_expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_parent_otp(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.request_parent_otp(text, uuid) TO authenticated;

-- =============================================================================
-- RPC: verify_parent_otp
-- Verifikasi OTP dan tandai sebagai sudah digunakan
-- =============================================================================
CREATE OR REPLACE FUNCTION public.verify_parent_otp(
  p_phone    text,
  p_otp_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_otp_record public.parent_otp_codes%ROWTYPE;
BEGIN
  -- Cari OTP yang valid
  SELECT * INTO v_otp_record
  FROM public.parent_otp_codes
  WHERE phone = p_phone
    AND otp_code = p_otp_code
    AND expires_at > now()
    AND NOT used
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Kode OTP tidak valid atau sudah kadaluarsa.'
    );
  END IF;

  -- Tandai OTP sebagai sudah digunakan
  UPDATE public.parent_otp_codes
  SET used = true
  WHERE id = v_otp_record.id;

  RETURN json_build_object(
    'success', true,
    'message', 'OTP berhasil diverifikasi.',
    'tenant_id', v_otp_record.tenant_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_parent_otp(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_parent_otp(text, text) TO authenticated;

-- =============================================================================
-- Cleanup function: hapus OTP kadaluarsa (jalankan via cron atau manual)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.parent_otp_codes
  WHERE expires_at < now() - interval '1 hour'
     OR used = true AND created_at < now() - interval '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_otps() TO service_role;
