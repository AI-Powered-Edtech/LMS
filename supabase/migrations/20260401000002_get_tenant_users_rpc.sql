-- =============================================================
-- EduSync LMS — Migration: get_tenant_users RPC
-- Tanggal: 2026-04-01
-- =============================================================
-- Membuat fungsi RPC get_tenant_users untuk Manajemen Pengguna admin.
-- Mendukung pencarian, filter role, dan cursor-based pagination.
-- =============================================================

CREATE OR REPLACE FUNCTION get_tenant_users(
  p_search  TEXT    DEFAULT NULL,
  p_role    TEXT    DEFAULT NULL,
  p_cursor  TEXT    DEFAULT NULL,
  p_limit   INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id         UUID,
  email           TEXT,
  first_name      TEXT,
  last_name       TEXT,
  avatar_url      TEXT,
  roles           TEXT[],
  is_active       BOOLEAN,
  created_at      TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  total_count     BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_total     BIGINT;
BEGIN
  -- Verifikasi autentikasi
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  -- Pastikan pemanggil adalah ADMIN
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id   = auth.uid()
      AND ur.tenant_id = (SELECT get_my_tenant_id())
      AND ur.role      = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mengakses daftar pengguna';
  END IF;

  v_tenant_id := (SELECT get_my_tenant_id());

  -- Hitung total untuk pagination
  SELECT COUNT(DISTINCT p.id)
    INTO v_total
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.id
   WHERE ur.tenant_id = v_tenant_id
     AND (p_search IS NULL OR (
           p.email      ILIKE '%' || p_search || '%'
        OR p.first_name ILIKE '%' || p_search || '%'
        OR p.last_name  ILIKE '%' || p_search || '%'
     ))
     AND (p_role IS NULL OR p_role = '' OR UPPER(p_role) = ur.role::TEXT);

  -- Kembalikan data dengan pagination
  RETURN QUERY
  SELECT
    p.id                          AS user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.avatar_url,
    ARRAY_AGG(DISTINCT ur.role::TEXT) AS roles,
    p.is_active,
    p.created_at,
    NULL::TIMESTAMPTZ              AS last_sign_in_at,
    v_total                        AS total_count
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.tenant_id = v_tenant_id
    AND (p_search IS NULL OR (
          p.email      ILIKE '%' || p_search || '%'
       OR p.first_name ILIKE '%' || p_search || '%'
       OR p.last_name  ILIKE '%' || p_search || '%'
    ))
    AND (p_role IS NULL OR p_role = '' OR UPPER(p_role) = ur.role::TEXT)
    AND (p_cursor IS NULL OR p.created_at < p_cursor::TIMESTAMPTZ)
  GROUP BY p.id, p.email, p.first_name, p.last_name, p.avatar_url, p.is_active, p.created_at
  ORDER BY p.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant eksekusi ke authenticated users (RLS DEFINER akan membatasi akses ke admin saja)
GRANT EXECUTE ON FUNCTION get_tenant_users(TEXT, TEXT, TEXT, INTEGER) TO authenticated;
