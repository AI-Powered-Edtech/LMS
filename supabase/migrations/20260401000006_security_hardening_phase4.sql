-- =============================================================================
-- EduSync LMS — Migration: Security Hardening Phase 4
-- Tanggal: 2026-04-01
-- =============================================================================
-- Deskripsi:
-- 1. Gamification: Tutup celah self-grant points pada add_user_points.
-- 2. PII Protection: Masking email pada view user_profiles untuk non-admin.
-- 3. Search Path Hardening: Proteksi Search Path Hijacking pada fungsi kritis.
-- 4. RLS Hardening: Batasi visibilitas tabel profiles mentah.
-- =============================================================================

-- 1. Gamification Hardening
-- Cabut akses publik dari fungsi add_user_points yang terlalu permisif.
REVOKE EXECUTE ON FUNCTION public.add_user_points(uuid, integer, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.add_user_points(uuid, integer, uuid) FROM anon;

-- Definisikan ulang add_user_points dengan kontrol akses yang benar.
CREATE OR REPLACE FUNCTION public.add_user_points(
  p_user_id uuid,
  p_points integer,
  p_class_id uuid DEFAULT NULL::uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_tenant_id uuid;
  v_current_level integer;
  v_new_level integer;
  v_is_admin_or_teacher boolean;
BEGIN
  -- Dapatkan status role pemanggil
  v_is_admin_or_teacher := (
    SELECT EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'TEACHER')
    )
  );

  -- CEK KEAMANAN: 
  -- 1. Jika bukan admin/teacher, dilarang memanggil fungsi ini secara manual (mencegah self-grant).
  -- 2. Kecuali jika dipanggil oleh sistem (auth.uid() is null, misal dari trigger atau service role).
  IF auth.uid() IS NOT NULL AND NOT v_is_admin_or_teacher THEN
    RAISE EXCEPTION 'Forbidden: Students cannot grant points manually.';
  END IF;

  -- Validasi tenant target
  SELECT tenant_id INTO v_tenant_id FROM user_roles WHERE user_id = p_user_id LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Target user not found or no role assigned';
  END IF;

  -- Pastikan admin/teacher hanya bisa memberi poin ke user di tenant yang sama
  IF auth.uid() IS NOT NULL AND v_is_admin_or_teacher THEN
    IF v_tenant_id != (SELECT get_my_tenant_id()) THEN
      RAISE EXCEPTION 'Forbidden: Cannot grant points to users in another school.';
    END IF;
  END IF;

  -- Update XP
  UPDATE gamification_profiles
  SET xp = xp + p_points,
      updated_at = now()
  WHERE user_id = p_user_id AND tenant_id = v_tenant_id
  RETURNING level INTO v_current_level;

  IF NOT FOUND THEN
    INSERT INTO gamification_profiles (user_id, tenant_id, xp, level)
    VALUES (p_user_id, v_tenant_id, p_points, 1)
    RETURNING level INTO v_current_level;
  END IF;

  -- Recompute Level
  SELECT compute_level((SELECT xp FROM gamification_profiles WHERE user_id = p_user_id AND tenant_id = v_tenant_id)) INTO v_new_level;

  IF v_new_level > v_current_level THEN
    UPDATE gamification_profiles
    SET level = v_new_level
    WHERE user_id = p_user_id AND tenant_id = v_tenant_id;
  END IF;

  -- Audit Trail
  INSERT INTO xp_transactions (user_id, tenant_id, amount, reason, reference_id)
  VALUES (p_user_id, v_tenant_id, p_points, 'SECURITY_HARDENED_GRANT', p_class_id);
END;
$$;

-- Izinkan kembali hanya untuk role terautentikasi (tapi sekarang sudah ada check role di dalam fungsi).
GRANT EXECUTE ON FUNCTION public.add_user_points(uuid, integer, uuid) TO authenticated;

-- 2. PII Protection (Email Masking)
-- Redefinisikan user_profiles sebagai SECURITY DEFINER untuk kontrol kolom yang presisi.
DROP VIEW IF EXISTS public.user_profiles CASCADE;
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
    p.id,
    p.tenant_id,
    -- MASKING: Hanya pemilik data, guru, atau admin yang bisa melihat email asli.
    CASE 
      WHEN auth.uid() = p.id OR (
        SELECT EXISTS (
          SELECT 1 FROM user_roles ur 
          WHERE ur.user_id = auth.uid() 
          AND ur.role IN ('ADMIN', 'TEACHER')
          AND ur.tenant_id = p.tenant_id
        )
      ) THEN p.email 
      ELSE '********' || right(p.email, 4) -- Masking email untuk privasi
    END as email,
    p.full_name,
    p.avatar_url,
    r.role,
    p.level,
    p.created_at,
    p.updated_at
FROM public.profiles p
LEFT JOIN (
    SELECT DISTINCT ON (user_id) user_id, role
    FROM public.user_roles
    ORDER BY user_id, created_at DESC
) r ON p.id = r.user_id;

-- Catatan: View ini tidak menggunakan security_invoker=true karena kita ingin logic CASE di atas 
-- berjalan dengan hak akses postgres (SECURITY DEFINER behavior via view owner).

-- 3. Search Path Hardening
-- Terapkan SET search_path pada fungsi-fungsi kritis yang menggunakan SECURITY DEFINER.
ALTER FUNCTION public.compute_level(integer) SET search_path = public, extensions;
ALTER FUNCTION public.get_my_tenant_id() SET search_path = public, extensions;
ALTER FUNCTION public.has_role(public.app_role) SET search_path = public, extensions;
ALTER FUNCTION public.grade_attempt_question(uuid, numeric, boolean, text) SET search_path = public, extensions;

-- 4. RLS Hardening pada tabel profiles
-- Batasi visibilitas tabel profiles mentah. User hanya bisa melihat baris mereka sendiri.
-- Untuk melihat info user lain (nama/avatar), mereka HARUS menggunakan view user_profiles.
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Tambahkan policy untuk Admin/Teacher agar tetap bisa melihat data mentah jika diperlukan (misal untuk export).
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('ADMIN', 'TEACHER')
      AND tenant_id = profiles.tenant_id
    )
  );

-- 5. Discussion Hardening
-- Pastikan user tidak bisa mem-vote post mereka sendiri jika menggunakan RPC (mencegah manipulasi popularitas).
CREATE OR REPLACE FUNCTION public.vote_discussion_secure(p_discussion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM discussions 
    WHERE id = p_discussion_id 
    AND author_id != auth.uid() -- Dilarang vote diri sendiri
  ) THEN
    RAISE EXCEPTION 'Forbidden: Cannot vote on your own post or post not found.';
  END IF;

  UPDATE discussions 
  SET upvotes = COALESCE(upvotes, 0) + 1 
  WHERE id = p_discussion_id;
END;
$$;

-- 6. Reports Hardening (H6)
-- Tambahkan kontrol akses pada pembuatan dan pengambilan data laporan.
CREATE OR REPLACE FUNCTION public.save_scheduled_report_secure(
    p_name TEXT,
    p_report_type TEXT,
    p_config JSONB,
    p_schedule TEXT DEFAULT 'none',
    p_export_format TEXT DEFAULT 'csv',
    p_report_id UUID DEFAULT NULL
) RETURNS public.scheduled_reports 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE 
    v_result public.scheduled_reports;
    v_is_admin_or_teacher boolean;
BEGIN
    v_is_admin_or_teacher := (
        SELECT EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('ADMIN', 'TEACHER')
        )
    );

    IF NOT v_is_admin_or_teacher THEN
        RAISE EXCEPTION 'Forbidden: Only admins and teachers can create reports.';
    END IF;

    IF p_report_id IS NOT NULL THEN
        UPDATE public.scheduled_reports 
        SET name=p_name, report_type=p_report_type, config=p_config, schedule=p_schedule, export_format=p_export_format
        WHERE id=p_report_id AND created_by=auth.uid() 
        RETURNING * INTO v_result;
    ELSE
        INSERT INTO public.scheduled_reports (tenant_id, created_by, name, report_type, config, schedule, export_format)
        VALUES (get_my_tenant_id(), auth.uid(), p_name, p_report_type, p_config, p_schedule, p_export_format)
        RETURNING * INTO v_result;
    END IF;
    RETURN v_result;
END;
$$;

-- Timpa fungsi lama yang tidak aman (jika ada).
CREATE OR REPLACE FUNCTION public.save_scheduled_report(
    p_name TEXT, p_report_type TEXT, p_config JSONB, p_schedule TEXT DEFAULT 'none', p_export_format TEXT DEFAULT 'csv', p_report_id UUID DEFAULT NULL
) RETURNS public.scheduled_reports AS $$
BEGIN
    RETURN public.save_scheduled_report_secure(p_name, p_report_type, p_config, p_schedule, p_export_format, p_report_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Tambahkan pengecekan role juga pada generate_report_data.
CREATE OR REPLACE FUNCTION public.generate_report_data(p_report_id UUID)
RETURNS JSONB 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_report public.scheduled_reports;
    v_data JSONB;
    v_tenant_id UUID;
BEGIN
    -- Hanya owner terautentikasi (yang harusnya admin/teacher dari check save_scheduled_report) yang bisa generate.
    SELECT * INTO v_report FROM public.scheduled_reports 
    WHERE id = p_report_id AND created_by = auth.uid();
    
    IF NOT FOUND THEN 
        RAISE EXCEPTION 'Report not found or access denied.';
    END IF;

    v_tenant_id := v_report.tenant_id;

    IF v_report.report_type = 'student_list' THEN
        SELECT jsonb_agg(row_to_json(t)) INTO v_data FROM (
            SELECT p.full_name, p.email, ur.role::text AS role,
                   COALESCE(sxs.total_xp, 0) as total_xp,
                   COALESCE(sxs.level, 1) as level,
                   COALESCE(sxs.streak_current, 0) as streak_current
            FROM public.profiles p
            JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = v_tenant_id
            LEFT JOIN public.student_xp_summary sxs ON sxs.user_id = p.id AND sxs.tenant_id = v_tenant_id
            WHERE p.tenant_id = v_tenant_id AND ur.role = 'STUDENT'
        ) t;
    ELSIF v_report.report_type = 'engagement' THEN
        SELECT jsonb_agg(row_to_json(t)) INTO v_data FROM (
            SELECT p.full_name,
                   COUNT(DISTINCT le.session_id) as total_sessions,
                   COUNT(le.id) as total_events,
                   MAX(le.created_at) as last_active
            FROM public.profiles p
            JOIN public.user_roles ur ON ur.user_id = p.id AND ur.tenant_id = v_tenant_id
            LEFT JOIN public.learning_events le ON le.user_id = p.id AND le.tenant_id = v_tenant_id
            WHERE p.tenant_id = v_tenant_id AND ur.role = 'STUDENT'
            GROUP BY p.id, p.full_name
        ) t;
    ELSE
        v_data := '[]'::jsonb;
    END IF;

    UPDATE public.scheduled_reports SET last_generated_at = now() WHERE id = p_report_id;
    RETURN COALESCE(v_data, '[]'::jsonb);
END;
$$;

