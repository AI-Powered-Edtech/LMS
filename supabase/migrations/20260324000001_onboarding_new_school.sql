-- Migration: 20260324000001_onboarding_new_school.sql
-- Menambahkan fungsi pendaftaran (Onboarding) sekolah baru dan pengguna.

-- Fungsi ini dijalankan oleh user yang baru login (misal via Google),
-- namun belum memiliki tenant apa pun. Fungsi ini membuat tenant baru, 
-- mengupdate public.profiles (jika nama kosong), dan memberi peran 'admin'.

CREATE OR REPLACE FUNCTION public.create_school_tenant(
  p_school_name TEXT,
  p_full_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 1. Buat Tenant baru
  INSERT INTO public.tenants (name, status)
  VALUES (p_school_name, 'active')
  RETURNING id INTO v_tenant_id;

  -- 2. Update public.profiles jika p_full_name diberikan
  IF p_full_name IS NOT NULL AND p_full_name <> '' THEN
    UPDATE public.profiles
    SET full_name = p_full_name, updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- 3. Jadikan user ini sebagai admin di tenant baru
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (v_user_id, v_tenant_id, 'admin');

  RETURN v_tenant_id;
END;
$$;

-- Beri akses eksekusi ke authenticated users
GRANT EXECUTE ON FUNCTION public.create_school_tenant(TEXT, TEXT) TO authenticated;

-- Fungsi untuk bergabung ke sekolah yang sudah ada via Invitation Token
CREATE OR REPLACE FUNCTION public.join_school_via_token(
  p_token UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_role TEXT;
  v_email TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Cek validitas token
  SELECT tenant_id, role INTO v_tenant_id, v_role
  FROM public.tenant_invitations
  WHERE token = p_token
    AND expires_at > now()
    AND accepted_at IS NULL
    AND email = v_email;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Token tidak valid, sudah kadaluarsa, atau email tidak cocok.';
  END IF;

  -- Tandai token sebagai telah digunakan
  UPDATE public.tenant_invitations
  SET accepted_at = now()
  WHERE token = p_token;

  -- Tambahkan role pengguna ke tenant
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (v_user_id, v_tenant_id, v_role::app_role);

  RETURN v_tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_school_via_token(UUID) TO authenticated;
