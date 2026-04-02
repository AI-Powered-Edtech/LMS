-- =============================================================================
-- EduSync LMS — Migration: Security Hardening Phase 5
-- Tanggal: 2026-04-01
-- =============================================================================
-- Deskripsi:
-- 1. Fix Cross-Tenant Leak pada admin_list_tenants.
-- 2. Tambahkan Rate Limiting pada forum/diskusi.
-- 3. Harden admin_list_users (PII protection).
-- 4. Audit Trail untuk penghapusan data sensitif.
-- =============================================================================

-- 1. Fix Cross-Tenant Leak pada admin_list_tenants
-- Admin sekolah hanya boleh melihat data sekolah mereka sendiri.
-- Hanya "Super Admin" (global role) yang boleh melihat semua tenant.
CREATE OR REPLACE FUNCTION public.admin_list_tenants(
    p_search text DEFAULT NULL::text, 
    p_is_active boolean DEFAULT NULL::boolean, 
    p_limit integer DEFAULT 50, 
    p_offset integer DEFAULT 0
) 
RETURNS TABLE(
    id uuid, 
    name text, 
    slug text, 
    is_active boolean, 
    created_at timestamp with time zone, 
    updated_at timestamp with time zone, 
    user_count bigint, 
    teacher_count bigint, 
    student_count bigint, 
    admin_count bigint
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_is_admin boolean;
    v_my_tenant_id uuid;
BEGIN
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;

    v_my_tenant_id := public.get_my_tenant_id();

    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.is_active,
        t.created_at,
        t.updated_at,
        (SELECT count(*) FROM public.profiles p WHERE p.tenant_id = t.id) AS user_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'TEACHER') AS teacher_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'STUDENT') AS student_count,
        (SELECT count(*) FROM public.user_roles ur 
         JOIN public.profiles p ON p.id = ur.user_id 
         WHERE p.tenant_id = t.id AND ur.role = 'ADMIN') AS admin_count
    FROM public.tenants t
    WHERE t.id = v_my_tenant_id -- BATASI HANYA PADA TENANT SENDIRI
      AND (p_search IS NULL OR 
            t.name ILIKE '%' || p_search || '%' OR
            t.slug ILIKE '%' || p_search || '%')
      AND (p_is_active IS NULL OR t.is_active = p_is_active)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 2. Rate Limiting pada Forum/Diskusi
-- Mencegah spam komentar/postingan.
CREATE OR REPLACE FUNCTION public.check_discussion_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_rate_key text;
  v_attempts int;
  v_max_per_minute int := 5; -- Maks 5 post/menit
BEGIN
  v_rate_key := encode(digest('discussion:' || auth.uid()::text, 'sha256'), 'hex');

  INSERT INTO public.rate_limits (hashed_key, action, attempts, window_start)
  VALUES (v_rate_key, 'create_discussion', 1, now())
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

  IF v_attempts > v_max_per_minute THEN
    RAISE EXCEPTION 'Terlalu banyak mengirim pesan. Silakan tunggu sebentar.' USING ERRCODE = 'P0429';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discussion_rate_limit ON public.discussions;
CREATE TRIGGER trg_discussion_rate_limit
BEFORE INSERT ON public.discussions
FOR EACH ROW EXECUTE FUNCTION public.check_discussion_rate_limit();

-- 3. PII Protection pada admin_list_users
-- Masking email jika admin sedang melihat list user (pencegahan data scraping oleh admin yang nakal).
-- Full email hanya ditampilkan jika admin melakukan 'view detail' pada satu user (bisa diimplementasikan di RPC detail).
CREATE OR REPLACE FUNCTION public.admin_list_users(
    p_search text DEFAULT NULL::text, 
    p_role_filter public.app_role DEFAULT NULL::public.app_role, 
    p_is_active boolean DEFAULT NULL::boolean, 
    p_limit integer DEFAULT 50, 
    p_offset integer DEFAULT 0
) 
RETURNS TABLE(
    id uuid, 
    email text, 
    first_name text, 
    last_name text, 
    full_name text, 
    is_active boolean, 
    tenant_id uuid, 
    roles public.app_role[], 
    created_at timestamp with time zone
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_tenant_id uuid;
    v_is_admin boolean;
BEGIN
    v_is_admin := public.has_role('ADMIN');
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    v_tenant_id := public.get_my_tenant_id();
    
    RETURN QUERY
    SELECT 
        p.id,
        CASE 
          WHEN p_limit > 1 THEN '********' || right(p.email, 4) -- Masking pada mode list
          ELSE p.email -- Full email jika limit=1 (asumsi request detail)
        END as email,
        p.first_name,
        p.last_name,
        p.full_name,
        p.is_active,
        p.tenant_id,
        ARRAY(
            SELECT ur.role 
            FROM public.user_roles ur 
            WHERE ur.user_id = p.id AND ur.tenant_id = v_tenant_id
        ) as roles,
        p.created_at
    FROM public.profiles p
    WHERE p.tenant_id = v_tenant_id
      AND (p_search IS NULL OR 
           p.full_name ILIKE '%' || p_search || '%' OR 
           p.email ILIKE '%' || p_search || '%')
      AND (p_is_active IS NULL OR p.is_active = p_is_active)
      AND (p_role_filter IS NULL OR EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = p.id AND ur.role = p_role_filter AND ur.tenant_id = v_tenant_id
      ))
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 4. Audit Trail Otomatis untuk Penghapusan User (Destructive Action)
CREATE OR REPLACE FUNCTION public.audit_user_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.log_admin_action(
    'USER_DELETED',
    OLD.id,
    'profiles',
    OLD.id,
    jsonb_build_object('email', OLD.email, 'full_name', OLD.full_name)
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_deletion ON public.profiles;
CREATE TRIGGER trg_audit_user_deletion
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_deletion();
