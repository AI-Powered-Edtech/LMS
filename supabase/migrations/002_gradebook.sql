-- =============================================================
-- EduSync LMS — Migration 002: Gradebook Persistence
-- Tanggal: 2026-03-22
-- =============================================================
-- Membuat tabel gradebook_settings dan gradebook_entries beserta
-- RLS policies, indexes, dan RPC helpers untuk modul nilai.
-- =============================================================

-- ── Gradebook settings per course ──────────────────────────────────────────
-- Menyimpan konfigurasi penilaian per kursus: skala huruf dan bobot nilai.
CREATE TABLE IF NOT EXISTS gradebook_settings (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID        NOT NULL,
  course_id          UUID        NOT NULL,
  -- Skala nilai: threshold minimum untuk setiap huruf mutu
  grading_scale      JSONB       NOT NULL DEFAULT '{"A":90,"B":80,"C":70,"D":60,"F":0}',
  weight_quizzes     FLOAT       NOT NULL DEFAULT 0.5,
  weight_assignments FLOAT       NOT NULL DEFAULT 0.5,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, course_id),
  -- Pastikan bobot total = 1 (toleransi floating point)
  CONSTRAINT chk_weights CHECK (ABS((weight_quizzes + weight_assignments) - 1.0) < 0.001)
);

ALTER TABLE gradebook_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gradebook_settings_tenant_course
  ON gradebook_settings(tenant_id, course_id);

-- ── Gradebook entries (satu baris per student × assignment/quiz) ──────────
-- Menyimpan nilai aktual setiap siswa untuk setiap item penilaian.
CREATE TABLE IF NOT EXISTS gradebook_entries (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL,
  student_id    UUID        NOT NULL,
  course_id     UUID        NOT NULL,
  -- Salah satu dari dua ini harus diisi; tidak boleh keduanya NULL sekaligus
  assignment_id UUID,
  quiz_id       UUID,
  score         FLOAT,
  max_score     FLOAT       NOT NULL DEFAULT 100,
  -- Persentase dihitung otomatis dari score/max_score
  percentage    FLOAT       GENERATED ALWAYS AS (
    CASE WHEN max_score > 0 THEN (score / max_score * 100) ELSE 0 END
  ) STORED,
  grade_letter  TEXT,
  notes         TEXT,
  graded_by     UUID,
  graded_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Unik per student per item: NULLS NOT DISTINCT agar NULL dianggap sama
  UNIQUE NULLS NOT DISTINCT (tenant_id, student_id, course_id, assignment_id, quiz_id),
  CONSTRAINT chk_item_set CHECK (
    (assignment_id IS NOT NULL) OR (quiz_id IS NOT NULL)
  ),
  CONSTRAINT chk_score_range CHECK (score IS NULL OR (score >= 0 AND score <= max_score))
);

ALTER TABLE gradebook_entries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gradebook_entries_tenant_course
  ON gradebook_entries(tenant_id, course_id);

CREATE INDEX IF NOT EXISTS idx_gradebook_entries_tenant_student
  ON gradebook_entries(tenant_id, student_id);

-- Covering index untuk tampilan daftar nilai siswa dalam satu kursus
CREATE INDEX IF NOT EXISTS idx_gradebook_entries_course_student
  ON gradebook_entries(course_id, student_id);

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- gradebook_entries: guru mengelola nilai untuk kursus yang mereka ajar
CREATE POLICY "teachers_manage_gradebook"
  ON gradebook_entries FOR ALL
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND course_id IN (
      SELECT id FROM courses
      WHERE tenant_id = (SELECT get_my_tenant_id())
        AND created_by = auth.uid()
    )
  );

-- gradebook_entries: siswa hanya melihat nilai milik sendiri
CREATE POLICY "students_view_own_grades"
  ON gradebook_entries FOR SELECT
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND student_id = auth.uid()
  );

-- gradebook_settings: guru mengelola pengaturan untuk kursus yang mereka ajar
CREATE POLICY "teachers_manage_gradebook_settings"
  ON gradebook_settings FOR ALL
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND course_id IN (
      SELECT id FROM courses
      WHERE tenant_id = (SELECT get_my_tenant_id())
        AND created_by = auth.uid()
    )
  );

-- gradebook_settings: siswa boleh baca skala nilai (perlu tahu konversi huruf)
CREATE POLICY "students_view_gradebook_settings"
  ON gradebook_settings FOR SELECT
  USING (tenant_id = (SELECT get_my_tenant_id()));

-- ── RPC: Hitung huruf mutu dari skala penilaian ───────────────────────────
-- Membaca grading_scale dari gradebook_settings, lalu mencocokan persentase
-- ke threshold tertinggi yang terpenuhi. Default ke skala standar jika belum
-- ada konfigurasi untuk kursus tersebut.
CREATE OR REPLACE FUNCTION compute_grade_letter(
  p_percentage FLOAT,
  p_course_id  UUID,
  p_tenant_id  UUID
) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scale     JSONB;
  v_letter    TEXT    := 'F';
  v_threshold FLOAT;
  v_key       TEXT;
BEGIN
  SELECT grading_scale INTO v_scale
  FROM gradebook_settings
  WHERE course_id = p_course_id
    AND tenant_id = p_tenant_id;

  -- Gunakan skala default jika kursus belum punya konfigurasi
  IF v_scale IS NULL THEN
    v_scale := '{"A":90,"B":80,"C":70,"D":60,"F":0}'::JSONB;
  END IF;

  -- Iterasi dari threshold tertinggi ke terendah; ambil pertama yang terpenuhi
  FOR v_key, v_threshold IN
    SELECT key, (value #>> '{}')::FLOAT
    FROM jsonb_each(v_scale)
    ORDER BY (value #>> '{}')::FLOAT DESC
  LOOP
    IF p_percentage >= v_threshold THEN
      v_letter := v_key;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_letter;
END;
$$;

-- ── RPC: Sinkronisasi gradebook dari quiz_attempts ────────────────────────
-- Upsert nilai quiz ke gradebook_entries berdasarkan quiz_attempts yang sudah
-- selesai (completed_at IS NOT NULL). Dipanggil oleh guru setelah quiz ditutup
-- atau secara periodik oleh background job.
-- Mengembalikan jumlah baris yang di-upsert.
CREATE OR REPLACE FUNCTION sync_gradebook_entries(
  p_course_id UUID,
  p_tenant_id UUID
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  -- Verifikasi caller adalah guru kursus ini atau admin tenant
  IF NOT EXISTS (
    SELECT 1 FROM courses
    WHERE id = p_course_id
      AND tenant_id = p_tenant_id
      AND created_by = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
      AND tenant_id = p_tenant_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Akses ditolak: hanya guru atau admin yang dapat sinkronisasi gradebook';
  END IF;

  -- Upsert dari quiz_attempts yang sudah selesai
  INSERT INTO gradebook_entries (
    tenant_id,
    student_id,
    course_id,
    quiz_id,
    score,
    max_score,
    grade_letter,
    graded_at,
    updated_at
  )
  SELECT
    p_tenant_id,
    qa.user_id,
    p_course_id,
    qa.quiz_id,
    qa.score,
    COALESCE(q.total_points, 100),
    compute_grade_letter(
      CASE WHEN COALESCE(q.total_points, 100) > 0
           THEN qa.score / COALESCE(q.total_points, 100) * 100
           ELSE 0
      END,
      p_course_id,
      p_tenant_id
    ),
    qa.completed_at,
    now()
  FROM quiz_attempts qa
  JOIN quizzes q ON q.id = qa.quiz_id
  WHERE q.course_id   = p_course_id
    AND qa.tenant_id  = p_tenant_id
    AND qa.completed_at IS NOT NULL
  ON CONFLICT (tenant_id, student_id, course_id, assignment_id, quiz_id)
  DO UPDATE SET
    score        = EXCLUDED.score,
    max_score    = EXCLUDED.max_score,
    grade_letter = EXCLUDED.grade_letter,
    graded_at    = EXCLUDED.graded_at,
    updated_at   = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── RPC: Ringkasan nilai per student dalam satu kursus ────────────────────
-- Mengembalikan rata-rata tertimbang (quiz + assignment) untuk setiap siswa.
-- Dipakai di halaman gradebook teacher.
CREATE OR REPLACE FUNCTION get_course_gradebook_summary(
  p_course_id UUID,
  p_tenant_id UUID
) RETURNS TABLE (
  student_id   UUID,
  quiz_avg     FLOAT,
  assign_avg   FLOAT,
  weighted_avg FLOAT,
  final_grade  TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wq FLOAT;
  v_wa FLOAT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  SELECT weight_quizzes, weight_assignments
  INTO v_wq, v_wa
  FROM gradebook_settings
  WHERE course_id = p_course_id AND tenant_id = p_tenant_id;

  -- Default weights jika belum dikonfigurasi
  v_wq := COALESCE(v_wq, 0.5);
  v_wa := COALESCE(v_wa, 0.5);

  RETURN QUERY
  SELECT
    ge.student_id,
    AVG(ge.percentage) FILTER (WHERE ge.quiz_id IS NOT NULL)       AS quiz_avg,
    AVG(ge.percentage) FILTER (WHERE ge.assignment_id IS NOT NULL) AS assign_avg,
    (
      COALESCE(AVG(ge.percentage) FILTER (WHERE ge.quiz_id IS NOT NULL), 0)       * v_wq
      + COALESCE(AVG(ge.percentage) FILTER (WHERE ge.assignment_id IS NOT NULL), 0) * v_wa
    )                                                               AS weighted_avg,
    compute_grade_letter(
      (
        COALESCE(AVG(ge.percentage) FILTER (WHERE ge.quiz_id IS NOT NULL), 0)       * v_wq
        + COALESCE(AVG(ge.percentage) FILTER (WHERE ge.assignment_id IS NOT NULL), 0) * v_wa
      ),
      p_course_id,
      p_tenant_id
    )                                                               AS final_grade
  FROM gradebook_entries ge
  WHERE ge.course_id  = p_course_id
    AND ge.tenant_id  = p_tenant_id
  GROUP BY ge.student_id;
END;
$$;
