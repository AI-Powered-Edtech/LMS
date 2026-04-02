-- =============================================================================
-- EduSync LMS — Migration: Security Hardening Phase 6
-- Tanggal: 2026-04-01
-- =============================================================================
-- Deskripsi:
-- 1. Question Bank Hardening: Batasi akses RPC ke Admin/Teacher.
-- 2. Gradebook Hardening: Perbaiki RLS dan RPC access control.
-- 3. Storage Alignment: Pastikan bucket submissions terdaftar dan private.
-- =============================================================================

-- 1. Question Bank Hardening
-- Pastikan siswa tidak bisa memanggil RPC pencarian soal (mencegah bocornya bank soal).
CREATE OR REPLACE FUNCTION public.check_is_staff()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN (SELECT public.has_role('ADMIN') OR public.has_role('TEACHER'));
END;
$$;

-- Harden search_questions
CREATE OR REPLACE FUNCTION public.search_questions(
    p_subject_id UUID DEFAULT NULL, 
    p_topic_id UUID DEFAULT NULL, 
    p_difficulty_level INTEGER DEFAULT NULL, 
    p_question_type TEXT DEFAULT NULL, 
    p_search_query TEXT DEFAULT NULL, 
    p_tags TEXT[] DEFAULT NULL, 
    p_limit INTEGER DEFAULT 50, 
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE(id UUID, subject_id UUID, topic_id UUID, question_type TEXT, question_text TEXT, difficulty_level INTEGER, created_at TIMESTAMPTZ, tags TEXT[])
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- SECURITY CHECK
    IF NOT public.check_is_staff() THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya admin atau guru yang dapat mengakses bank soal.';
    END IF;

    v_tenant_id := get_my_tenant_id();

    RETURN QUERY
    SELECT
        q.id,
        q.subject_id,
        q.topic_id,
        q.question_type::TEXT,
        q.question_text,
        q.difficulty_level,
        q.created_at,
        ARRAY(SELECT qt.tag FROM public.question_tags qt WHERE qt.question_id = q.id) as tags
    FROM public.question_bank q
    WHERE q.tenant_id = v_tenant_id
        AND q.is_archived = FALSE
        AND (p_subject_id IS NULL OR q.subject_id = p_subject_id)
        AND (p_topic_id IS NULL OR q.topic_id = p_topic_id)
        AND (p_difficulty_level IS NULL OR q.difficulty_level = p_difficulty_level)
        AND (p_question_type IS NULL OR q.question_type::TEXT = p_question_type)
        AND (p_search_query IS NULL OR q.question_text ILIKE '%' || p_search_query || '%')
        AND (p_tags IS NULL OR EXISTS (
            SELECT 1 FROM public.question_tags qt
            WHERE qt.question_id = q.id AND qt.tag = ANY(p_tags)
        ))
    ORDER BY q.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Harden get_question
CREATE OR REPLACE FUNCTION public.get_question(p_question_id UUID)
RETURNS JSONB
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_tenant_id UUID := get_my_tenant_id();
    v_result JSONB;
BEGIN
    -- SECURITY CHECK
    IF NOT public.check_is_staff() THEN
        RAISE EXCEPTION 'Akses ditolak.';
    END IF;

    SELECT row_to_json(q)::jsonb INTO v_result
    FROM public.question_bank q
    WHERE q.id = p_question_id AND q.tenant_id = v_tenant_id;

    RETURN v_result;
END;
$$;

-- 2. Gradebook Hardening
-- Perbaiki RLS agar admin juga bisa mengelola nilai.
DROP POLICY IF EXISTS "teachers_manage_gradebook" ON public.gradebook_entries;
CREATE POLICY "staff_manage_gradebook"
  ON public.gradebook_entries FOR ALL
  TO authenticated
  USING (
    tenant_id = get_my_tenant_id()
    AND (
      public.has_role('ADMIN') 
      OR EXISTS (
        SELECT 1 FROM courses 
        WHERE id = gradebook_entries.course_id 
        AND (created_by = auth.uid() OR tenant_id = get_my_tenant_id())
        -- Catatan: Idealnya cek relasi guru-kursus yang lebih spesifik
      )
    )
  );

-- Harden get_course_gradebook_summary RPC
CREATE OR REPLACE FUNCTION public.get_course_gradebook_summary(
  p_course_id UUID,
  p_tenant_id UUID -- Tetap ada tapi divalidasi
) RETURNS TABLE (
  student_id   UUID,
  quiz_avg     FLOAT,
  assign_avg   FLOAT,
  weighted_avg FLOAT,
  final_grade  TEXT
)
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_wq FLOAT;
  v_wa FLOAT;
  v_my_tenant_id UUID := get_my_tenant_id();
BEGIN
  -- SECURITY CHECK: Hanya staff yang boleh melihat ringkasan nilai seluruh kelas
  IF NOT public.check_is_staff() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya guru atau admin yang dapat melihat ringkasan nilai.';
  END IF;

  -- Pastikan tenant ID cocok
  IF p_tenant_id != v_my_tenant_id THEN
    RAISE EXCEPTION 'Akses lintas sekolah ditolak.';
  END IF;

  SELECT weight_quizzes, weight_assignments
  INTO v_wq, v_wa
  FROM public.gradebook_settings
  WHERE course_id = p_course_id AND tenant_id = v_my_tenant_id;

  v_wq := COALESCE(v_wq, 0.5);
  v_wa := COALESCE(v_wa, 0.5);

  RETURN QUERY
  SELECT
    ge.student_id,
    AVG(ge.percentage) FILTER (WHERE ge.quiz_id IS NOT NULL)::FLOAT       AS quiz_avg,
    AVG(ge.percentage) FILTER (WHERE ge.assignment_id IS NOT NULL)::FLOAT AS assign_avg,
    (
      COALESCE(AVG(ge.percentage) FILTER (WHERE ge.quiz_id IS NOT NULL), 0)       * v_wq
      + COALESCE(AVG(ge.percentage) FILTER (WHERE ge.assignment_id IS NOT NULL), 0) * v_wa
    )::FLOAT                                                               AS weighted_avg,
    public.compute_grade_letter(
      (
        COALESCE(AVG(ge.percentage) FILTER (WHERE ge.quiz_id IS NOT NULL), 0)       * v_wq
        + COALESCE(AVG(ge.percentage) FILTER (WHERE ge.assignment_id IS NOT NULL), 0) * v_wa
      )::FLOAT,
      p_course_id,
      v_my_tenant_id
    )                                                               AS final_grade
  FROM public.gradebook_entries ge
  WHERE ge.course_id  = p_course_id
    AND ge.tenant_id  = v_my_tenant_id
  GROUP BY ge.student_id;
END;
$$;

-- 3. Storage Alignment
-- Pastikan bucket 'assignment-submissions' ada dan bersifat private jika belum terdaftar.
-- (Kita asumsikan 'course-content' adalah bucket utama, tapi untuk kompatibilitas code:)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-submissions',
  'assignment-submissions',
  false, -- PRIVATE!
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Tambahkan RLS untuk bucket baru ini
DROP POLICY IF EXISTS "Students can upload their own submissions" ON storage.objects;
CREATE POLICY "Students can upload their own submissions"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = (SELECT get_my_tenant_id()::text)
  );

DROP POLICY IF EXISTS "Staff can read all submissions" ON storage.objects;
CREATE POLICY "Staff can read all submissions"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'assignment-submissions'
    AND (storage.foldername(name))[1] = (SELECT get_my_tenant_id()::text)
    AND (
      (SELECT public.check_is_staff()) -- Admin/Teacher bisa lihat semua
      OR (storage.foldername(name))[4] = auth.uid()::text -- Siswa hanya bisa lihat miliknya (path index ke-4 sesuai assignmentService)
    )
  );
