-- =============================================================================
-- EduSync LMS — Migration: Security Hardening Phase 2
-- Tanggal: 2026-04-01
-- =============================================================================
-- Deskripsi:
-- 1. Refaktor rate_limits untuk privasi (hashing).
-- 2. Pengamanan admin_audit_logs (fail-closed RLS + secure RPC).
-- 3. Proteksi brute-force pada public_lookup_class.
-- =============================================================================

-- 1. Refaktor rate_limits (Privacy-by-Design)
-- Tambahkan kolom hashed_key untuk menggantikan key mentah (PII).
ALTER TABLE public.rate_limits ADD COLUMN IF NOT EXISTS hashed_key text;

-- Migrasi data lama (opsional, tapi untuk keamanan kita anggap data lama bisa dibersihkan)
-- UPDATE public.rate_limits SET hashed_key = encode(digest(key, 'sha256'), 'hex') WHERE hashed_key IS NULL;

-- Tambahkan constraint unik baru dan hapus yang lama jika perlu
ALTER TABLE public.rate_limits DROP CONSTRAINT IF EXISTS rate_limits_key_action_unique;
-- Kita biarkan kolom 'key' ada tapi opsional, atau bisa dihapus nanti. Untuk sekarang kita buat hashed_key wajib.
-- ALTER TABLE public.rate_limits ALTER COLUMN hashed_key SET NOT NULL; -- Jangan dulu agar tidak break EF yang sedang jalan

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_hashed_key_action ON public.rate_limits (hashed_key, action);

COMMENT ON COLUMN public.rate_limits.hashed_key IS 'SHA-256 hash dari identifier (email/IP) untuk melindungi privasi.';

-- 2. Pengamanan admin_audit_logs
-- Cabut akses INSERT langsung dari user authenticated.
REVOKE INSERT ON public.admin_audit_logs FROM authenticated;

-- Buat fungsi SECURITY DEFINER untuk logging yang aman.
DROP FUNCTION IF EXISTS public.log_admin_action(text, uuid, text, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action            text,
  p_target_user_id    uuid DEFAULT NULL,
  p_target_entity_type text DEFAULT NULL,
  p_target_entity_id  uuid DEFAULT NULL,
  p_metadata          jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Verifikasi pemanggil terautentikasi
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  -- Dapatkan tenant_id pemanggil
  v_tenant_id := (SELECT get_my_tenant_id());

  -- Hanya simpan log jika pemanggil adalah ADMIN atau TEACHER (atau sistem)
  -- Catatan: has_role() sudah menggunakan tenant_id internal.
  IF NOT (has_role('ADMIN') OR has_role('TEACHER')) THEN
     RAISE EXCEPTION 'Hanya admin atau guru yang dapat mencatat log audit';
  END IF;

  INSERT INTO public.admin_audit_logs (
    tenant_id,
    admin_user_id,
    action,
    target_user_id,
    target_entity_type,
    target_entity_id,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    v_tenant_id,
    auth.uid(),
    p_action,
    p_target_user_id,
    p_target_entity_type,
    p_target_entity_id,
    p_metadata,
    -- IP dan User Agent diambil dari session setting jika tersedia (Supabase menyediakannya)
    current_setting('request.headers', true)::jsonb->>'x-real-ip',
    current_setting('request.headers', true)::jsonb->>'user-agent'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;

-- 3. Proteksi brute-force pada public_lookup_class
-- Kita tambahkan pengecekan rate limit langsung di dalam fungsi public_lookup_class.
CREATE OR REPLACE FUNCTION public.public_lookup_class(p_join_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_class  record;
  v_teacher_name text;
  v_tenant_name  text;
  v_ip text;
  v_rate_key text;
  v_attempts int;
BEGIN
  -- A. Proteksi Rate Limit Dasar (per IP)
  v_ip := COALESCE(current_setting('request.headers', true)::jsonb->>'x-real-ip', 'unknown');
  v_rate_key := encode(digest('lookup_class:' || v_ip, 'sha256'), 'hex');

  -- Cek/Update rate limit
  INSERT INTO public.rate_limits (hashed_key, action, attempts, window_start)
  VALUES (v_rate_key, 'lookup_class', 1, now())
  ON CONFLICT (hashed_key, action, window_start) DO UPDATE
  SET attempts = CASE 
      WHEN rate_limits.window_start < now() - interval '1 minute' THEN 1 
      ELSE rate_limits.attempts + 1 
    END,
    window_start = CASE 
      WHEN rate_limits.window_start < now() - interval '1 minute' THEN now() 
      ELSE rate_limits.window_start 
    END
  RETURNING attempts INTO v_attempts;

  IF v_attempts > 10 THEN -- Maks 10 percobaan per menit per IP
    RETURN json_build_object('found', false, 'error', 'Terlalu banyak percobaan. Silakan coba lagi nanti.', 'code', 'RATE_LIMITED');
  END IF;

  -- B. Logika Bisnis
  SELECT c.id, c.name, c.teacher_id, c.tenant_id INTO v_class
  FROM public.classes c
  WHERE upper(trim(c.join_code)) = upper(trim(p_join_code))
  LIMIT 1;

  IF v_class.id IS NULL THEN
    RETURN json_build_object('found', false, 'error', 'Kode kelas tidak ditemukan');
  END IF;

  SELECT full_name INTO v_teacher_name FROM public.profiles WHERE id = v_class.teacher_id;
  SELECT name       INTO v_tenant_name  FROM public.tenants  WHERE id = v_class.tenant_id;

  RETURN json_build_object(
    'found',        true,
    'class_id',     v_class.id,
    'class_name',   v_class.name,
    'teacher_name', COALESCE(v_teacher_name, 'Guru'),
    'tenant_id',    v_class.tenant_id,
    'tenant_name',  COALESCE(v_tenant_name, 'Sekolah')
  );
END;
$$;
