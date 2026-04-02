-- =============================================================================
-- EduSync LMS — Migration: Security Hardening Phase 3
-- Tanggal: 2026-04-01
-- =============================================================================
-- Deskripsi:
-- 1. Fix IDOR pada search_lesson_resources (force get_my_tenant_id).
-- 2. Restore lesson context di get_tutor_context dengan validasi tenant.
-- 3. Harden v1_checkout_submission_queue (revoke EXECUTE dari authenticated).
-- 4. Storage Hardening (Batasi SVG pada bucket publik).
-- =============================================================================

-- 1. Fix IDOR pada search_lesson_resources
-- Mengabaikan p_tenant_id dan menggunakan identitas user yang memanggil (get_my_tenant_id).
DROP FUNCTION IF EXISTS public.search_lesson_resources(uuid, uuid, text, int);
CREATE OR REPLACE FUNCTION public.search_lesson_resources(
  p_tenant_id uuid, -- Diabaikan, pakai get_my_tenant_id
  p_course_id uuid, -- Diperlukan untuk mempersempit pencarian dalam satu kursus
  p_query text,
  p_limit int DEFAULT 5
)
RETURNS TABLE(id uuid, title text, description text, file_url text, file_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_my_tenant_id uuid := get_my_tenant_id();
BEGIN
  -- Validasi autentikasi
  IF auth.uid() IS NULL OR v_my_tenant_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT lr.id, lr.title, lr.description, lr.file_url, lr.file_type
  FROM public.lesson_resources lr
  WHERE lr.tenant_id = v_my_tenant_id
    AND lr.course_id = p_course_id -- Opsional: bisa ditambahkan validasi kepemilikan course_id jika perlu
    AND (
      lr.title ILIKE '%' || p_query || '%'
      OR lr.description ILIKE '%' || p_query || '%'
    )
  LIMIT p_limit;
END;
$$;

-- 2. Restore lesson context di get_tutor_context dengan validasi tenant
DROP FUNCTION IF EXISTS public.get_tutor_context(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_tutor_context(
  p_course_id uuid,
  p_lesson_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_id uuid := get_my_tenant_id();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  WITH stats AS (
    SELECT
      (SELECT COUNT(*) FROM student_lesson_signals WHERE user_id = v_user_id AND total_time_spent > 0) as lessons_started,
      (SELECT COUNT(*) FROM student_lesson_signals WHERE user_id = v_user_id AND is_completed = true) as lessons_completed,
      (SELECT AVG(latest_quiz_score) FROM student_lesson_signals WHERE user_id = v_user_id AND latest_quiz_score IS NOT NULL) as avg_score
  ),
  lesson_data AS (
    SELECT jsonb_build_object(
      'id', l.id,
      'title', l.title,
      'content', l.content,
      'type', l.type,
      'module', (SELECT jsonb_build_object('course_id', m.course_id) FROM modules m WHERE m.id = l.module_id)
    ) as lesson_obj
    FROM lessons l
    WHERE l.id = p_lesson_id AND l.tenant_id = v_tenant_id
  ),
  progress_data AS (
    SELECT jsonb_build_object(
      'progress_percent', COALESCE(sls.progress_percent, 0),
      'is_completed', COALESCE(sls.is_completed, false)
    ) as prog_obj
    FROM student_lesson_signals sls
    WHERE sls.lesson_id = p_lesson_id AND sls.user_id = v_user_id
  )
  SELECT jsonb_build_object(
    'student_profile', (SELECT jsonb_build_object('id', v_user_id, 'tenant_id', v_tenant_id)),
    'stats', (SELECT row_to_json(stats) FROM stats),
    'lesson', (SELECT lesson_obj FROM lesson_data),
    'progress', (SELECT prog_obj FROM progress_data),
    'resources', (
      SELECT COALESCE(jsonb_agg(r), '[]'::jsonb)
      FROM lesson_resources r
      WHERE r.lesson_id = p_lesson_id AND r.tenant_id = v_tenant_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- 3. Harden v1_checkout_submission_queue
-- Cabut akses dari role publik/authenticated. Fungsi ini hanya boleh dipanggil via service role (postgres).
REVOKE EXECUTE ON FUNCTION public.v1_checkout_submission_queue() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.v1_checkout_submission_queue() FROM anon;
REVOKE EXECUTE ON FUNCTION public.v1_checkout_submission_queue() FROM public;

-- 4. Storage Hardening: Hapus SVG dari bucket publik 'lesson-images'
-- Hal ini untuk mencegah serangan XSS via SVG yang disisipi script jahat.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'lesson-images';

-- 5. Bersihkan RLS admin_audit_logs lama (opsional tapi disarankan)
-- Pastikan hanya RPC log_admin_action yang bisa mengisi log.
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can view their own audit logs" ON public.admin_audit_logs;

-- Hanya admin yang bisa melihat log audit sekolahnya.
CREATE POLICY "Admins can view audit logs of their tenant"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_my_tenant_id()
    AND (has_role('ADMIN') OR has_role('TEACHER'))
  );
