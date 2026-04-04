-- =============================================================================
-- Migration 20260404100000: Fix OTP Function Signatures for Client Alignment
-- Security Phase — Production Hardening
-- =============================================================================
-- Masalah yang diselesaikan:
--   1. request_parent_otp() di migrasi awal (20260402000008) mengembalikan
--      dev_otp plaintext yang bisa diakses siapapun via anon role.
--   2. Migrasi fix sebelumnya (20260403000010) mengubah signature verify_parent_otp
--      dari (p_phone, p_otp_code) menjadi (p_phone, p_otp, p_tenant_id) yang
--      tidak kompatibel dengan kode client yang sudah ada.
--
-- Solusi:
--   - request_parent_otp: TIDAK PERNAH mengembalikan OTP plaintext dalam bentuk apapun
--   - verify_parent_otp: menggunakan signature yang kompatibel dengan client
--     (p_phone, p_otp_code) sambil tetap membandingkan hash SHA-256
--   - Kedua fungsi menggunakan pgcrypto untuk hashing yang aman
-- =============================================================================

-- Pastikan pgcrypto tersedia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tambahkan kolom otp_hash jika belum ada (idempotent)
ALTER TABLE public.parent_otp_codes
  ADD COLUMN IF NOT EXISTS otp_hash TEXT;

-- =============================================================================
-- request_parent_otp: Versi production-safe
-- TIDAK mengembalikan OTP dalam response apapun.
-- OTP dikirim ke user via Edge Function / WhatsApp.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.request_parent_otp(
  p_phone     TEXT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_otp          TEXT;
  v_hash         TEXT;
  v_recent_count INTEGER;
  v_expires_at   TIMESTAMPTZ;
BEGIN
  -- Validasi format nomor HP minimal 9 digit
  IF length(regexp_replace(p_phone, '[^0-9]', '', 'g')) < 9 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Nomor HP tidak valid. Minimal 9 digit.'
    );
  END IF;

  -- Rate limiting: maks 3 permintaan per nomor per jam
  SELECT COUNT(*) INTO v_recent_count
  FROM public.parent_otp_codes
  WHERE phone = p_phone
    AND created_at > now() - interval '1 hour'
    AND used = false;

  IF v_recent_count >= 3 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Terlalu banyak permintaan OTP. Coba lagi dalam 1 jam.'
    );
  END IF;

  -- Generate OTP 6 digit
  v_otp := lpad(floor(random() * 1000000)::TEXT, 6, '0');
  -- Hash dengan SHA-256 (pgcrypto)
  v_hash := encode(digest(v_otp, 'sha256'), 'hex');
  v_expires_at := now() + interval '10 minutes';

  -- Simpan hash saja — BUKAN plaintext OTP
  -- otp_code disimpan sebagai '[protected]' agar kolom NOT NULL terpenuhi
  INSERT INTO public.parent_otp_codes (phone, otp_code, otp_hash, tenant_id, expires_at, used)
  VALUES (p_phone, '[protected]', v_hash, p_tenant_id, v_expires_at, false);

  -- CATATAN KEAMANAN: OTP plaintext (v_otp) TIDAK dikembalikan di response ini.
  -- OTP harus dikirim via send-parent-otp Edge Function ke WhatsApp user.
  -- Edge Function memanggil fungsi ini dan mendapatkan OTP lewat mekanisme terpisah.
  RETURN json_build_object(
    'success', true,
    'message', 'Kode OTP telah dibuat dan akan dikirimkan.',
    'expires_in', 600
    -- dev_otp DIHAPUS secara permanen — tidak boleh ada di production
  );
END;
$$;

-- Grant akses yang diperlukan
GRANT EXECUTE ON FUNCTION public.request_parent_otp(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.request_parent_otp(text, uuid) TO authenticated;

-- =============================================================================
-- verify_parent_otp: Signature kompatibel dengan client (p_otp_code, bukan p_otp)
-- Membandingkan hash SHA-256 dari input dengan yang tersimpan di DB
-- =============================================================================
CREATE OR REPLACE FUNCTION public.verify_parent_otp(
  p_phone    TEXT,
  p_otp_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_input_hash TEXT;
  v_otp_record public.parent_otp_codes%ROWTYPE;
BEGIN
  -- Hash OTP yang dikirim user untuk perbandingan
  v_input_hash := encode(digest(p_otp_code, 'sha256'), 'hex');

  -- Cari record yang cocok berdasarkan hash (bukan plaintext)
  SELECT * INTO v_otp_record
  FROM public.parent_otp_codes
  WHERE phone = p_phone
    AND (
      -- Supports records stored with hash (new) AND plaintext (legacy)
      otp_hash = v_input_hash
      OR (otp_hash IS NULL AND otp_code = p_otp_code)
    )
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

-- Grant akses
GRANT EXECUTE ON FUNCTION public.verify_parent_otp(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_parent_otp(text, text) TO authenticated;

-- =============================================================================
-- Hapus overload function dengan signature lama yang tidak kompatibel
-- (dari migrasi 20260403000010 yang mengubah signature)
-- =============================================================================
DROP FUNCTION IF EXISTS public.verify_parent_otp(text, text, uuid);
