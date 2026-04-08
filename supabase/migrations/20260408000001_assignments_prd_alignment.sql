-- Assignments PRD alignment
-- Additive migration to support native submission channels, versioned attempts,
-- teacher reminders, and assignment analytics without breaking existing flows.

ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS available_from timestamptz,
  ADD COLUMN IF NOT EXISTS late_penalty_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_text_submission boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_file_submission boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_link_submission boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true;

UPDATE public.assignments
SET status = CASE WHEN COALESCE(is_published, false) THEN 'published' ELSE 'draft' END
WHERE status IS NULL;

ALTER TABLE public.assignments
  ALTER COLUMN status SET DEFAULT 'draft',
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_assignments_status'
      AND conrelid = 'public.assignments'::regclass
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT chk_assignments_status
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_assignments_late_penalty_percent'
      AND conrelid = 'public.assignments'::regclass
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT chk_assignments_late_penalty_percent
      CHECK (late_penalty_percent BETWEEN 0 AND 100);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_assignments_submission_channels'
      AND conrelid = 'public.assignments'::regclass
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT chk_assignments_submission_channels
      CHECK (allow_text_submission OR allow_file_submission OR allow_link_submission);
  END IF;
END;
$$;

ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS is_late boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS late_penalty_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_score numeric,
  ADD COLUMN IF NOT EXISTS client_request_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_assignment_submissions_late_penalty_percent'
      AND conrelid = 'public.assignment_submissions'::regclass
  ) THEN
    ALTER TABLE public.assignment_submissions
      ADD CONSTRAINT chk_assignment_submissions_late_penalty_percent
      CHECK (late_penalty_percent BETWEEN 0 AND 100);
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignment_submissions_request_id
  ON public.assignment_submissions (assignment_id, student_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_student_attempt_desc
  ON public.assignment_submissions (assignment_id, student_id, attempt_number DESC);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_status_v2
  ON public.assignment_submissions (assignment_id, status);

CREATE OR REPLACE FUNCTION public.sync_assignment_publish_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.status := COALESCE(
    NEW.status,
    CASE WHEN COALESCE(NEW.is_published, false) THEN 'published' ELSE 'draft' END
  );

  IF NEW.status = 'published' THEN
    NEW.is_published := true;
  ELSIF NEW.status = 'draft' THEN
    NEW.is_published := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_assignment_publish_state ON public.assignments;
CREATE TRIGGER trg_sync_assignment_publish_state
BEFORE INSERT OR UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.sync_assignment_publish_state();

CREATE OR REPLACE FUNCTION public.submit_assignment_attempt(
  p_assignment_id uuid,
  p_submission_text text DEFAULT NULL,
  p_file_url text DEFAULT NULL,
  p_link_url text DEFAULT NULL,
  p_client_request_id uuid DEFAULT NULL
)
RETURNS public.assignment_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_assignment public.assignments%ROWTYPE;
  v_existing public.assignment_submissions%ROWTYPE;
  v_result public.assignment_submissions%ROWTYPE;
  v_student_id uuid := auth.uid();
  v_tenant_id uuid := public.get_my_tenant_id();
  v_next_attempt integer;
  v_has_course_access boolean := false;
  v_has_class_access boolean := false;
  v_submission_text text := NULLIF(trim(COALESCE(p_submission_text, '')), '');
  v_link_url text := NULLIF(trim(COALESCE(p_link_url, '')), '');
  v_is_late boolean := false;
  v_status public.submission_status := 'SUBMITTED'::public.submission_status;
BEGIN
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tugas tidak ditemukan';
  END IF;

  IF v_assignment.status <> 'published' AND COALESCE(v_assignment.is_published, false) = false THEN
    RAISE EXCEPTION 'Tugas belum dipublikasikan';
  END IF;

  IF v_assignment.available_from IS NOT NULL AND now() < v_assignment.available_from THEN
    RAISE EXCEPTION 'Tugas belum tersedia';
  END IF;

  IF v_assignment.course_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.course_enrollments ce
      WHERE ce.course_id = v_assignment.course_id
        AND ce.user_id = v_student_id
        AND ce.tenant_id = v_tenant_id
        AND ce.status = 'ACTIVE'
    )
    INTO v_has_course_access;
  END IF;

  IF v_assignment.class_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.class_id = v_assignment.class_id
        AND e.student_id = v_student_id
        AND e.tenant_id = v_tenant_id
        AND e.status = 'ACTIVE'
    )
    INTO v_has_class_access;
  END IF;

  IF v_assignment.course_id IS NOT NULL OR v_assignment.class_id IS NOT NULL THEN
    IF NOT (v_has_course_access OR v_has_class_access) THEN
      RAISE EXCEPTION 'Akses ditolak untuk tugas ini';
    END IF;
  END IF;

  IF v_submission_text IS NULL AND p_file_url IS NULL AND v_link_url IS NULL THEN
    RAISE EXCEPTION 'Isi tugas tidak boleh kosong';
  END IF;

  IF v_submission_text IS NOT NULL AND COALESCE(v_assignment.allow_text_submission, true) = false THEN
    RAISE EXCEPTION 'Tugas ini tidak menerima jawaban teks';
  END IF;

  IF p_file_url IS NOT NULL AND COALESCE(v_assignment.allow_file_submission, true) = false THEN
    RAISE EXCEPTION 'Tugas ini tidak menerima lampiran file';
  END IF;

  IF v_link_url IS NOT NULL AND COALESCE(v_assignment.allow_link_submission, false) = false THEN
    RAISE EXCEPTION 'Tugas ini tidak menerima link';
  END IF;

  IF p_client_request_id IS NOT NULL THEN
    SELECT *
    INTO v_existing
    FROM public.assignment_submissions s
    WHERE s.assignment_id = p_assignment_id
      AND s.student_id = v_student_id
      AND s.tenant_id = v_tenant_id
      AND s.client_request_id = p_client_request_id
    ORDER BY s.attempt_number DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT COALESCE(MAX(s.attempt_number), 0) + 1
  INTO v_next_attempt
  FROM public.assignment_submissions s
  WHERE s.assignment_id = p_assignment_id
    AND s.student_id = v_student_id
    AND s.tenant_id = v_tenant_id;

  IF v_next_attempt > COALESCE(v_assignment.max_attempts, 1) THEN
    RAISE EXCEPTION 'Batas percobaan pengumpulan telah tercapai';
  END IF;

  v_is_late := v_assignment.due_date IS NOT NULL AND now() > v_assignment.due_date;
  v_status := CASE
    WHEN v_is_late THEN 'LATE'::public.submission_status
    ELSE 'SUBMITTED'::public.submission_status
  END;

  INSERT INTO public.assignment_submissions (
    assignment_id,
    student_id,
    submission_text,
    file_url,
    link_url,
    status,
    submitted_at,
    tenant_id,
    attempt_number,
    is_late,
    late_penalty_percent,
    client_request_id
  ) VALUES (
    p_assignment_id,
    v_student_id,
    v_submission_text,
    p_file_url,
    v_link_url,
    v_status,
    now(),
    v_tenant_id,
    v_next_attempt,
    v_is_late,
    COALESCE(v_assignment.late_penalty_percent, 0),
    p_client_request_id
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assignment_submission_bundle(
  p_assignment_id uuid,
  p_student_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_assignment public.assignments%ROWTYPE;
  v_actor_id uuid := auth.uid();
  v_effective_student_id uuid := COALESCE(p_student_id, auth.uid());
  v_tenant_id uuid := public.get_my_tenant_id();
  v_attempts jsonb := '[]'::jsonb;
  v_latest_attempt jsonb := NULL;
  v_attempt_count integer := 0;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tugas tidak ditemukan';
  END IF;

  IF v_effective_student_id <> v_actor_id AND NOT (public.has_role('ADMIN') OR public.has_role('TEACHER')) THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  SELECT COUNT(*)
  INTO v_attempt_count
  FROM public.assignment_submissions s
  WHERE s.assignment_id = p_assignment_id
    AND s.student_id = v_effective_student_id
    AND s.tenant_id = v_tenant_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'attempt_number', s.attempt_number,
        'status', lower(s.status::text),
        'submitted_at', s.submitted_at,
        'submission_text', s.submission_text,
        'file_url', s.file_url,
        'link_url', s.link_url,
        'is_late', s.is_late,
        'late_penalty_percent', s.late_penalty_percent,
        'raw_score', s.raw_score,
        'score', s.score,
        'feedback', s.feedback,
        'graded_at', s.graded_at
      )
      ORDER BY s.attempt_number DESC
    ),
    '[]'::jsonb
  )
  INTO v_attempts
  FROM public.assignment_submissions s
  WHERE s.assignment_id = p_assignment_id
    AND s.student_id = v_effective_student_id
    AND s.tenant_id = v_tenant_id;

  SELECT jsonb_build_object(
      'id', s.id,
      'attempt_number', s.attempt_number,
      'status', lower(s.status::text),
      'submitted_at', s.submitted_at,
      'submission_text', s.submission_text,
      'file_url', s.file_url,
      'link_url', s.link_url,
      'is_late', s.is_late,
      'late_penalty_percent', s.late_penalty_percent,
      'raw_score', s.raw_score,
      'score', s.score,
      'feedback', s.feedback,
      'graded_at', s.graded_at
    )
  INTO v_latest_attempt
  FROM public.assignment_submissions s
  WHERE s.assignment_id = p_assignment_id
    AND s.student_id = v_effective_student_id
    AND s.tenant_id = v_tenant_id
  ORDER BY s.attempt_number DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'assignment', jsonb_build_object(
      'id', v_assignment.id,
      'title', v_assignment.title,
      'description', COALESCE(v_assignment.description, v_assignment.instructions),
      'due_date', v_assignment.due_date,
      'available_from', v_assignment.available_from,
      'max_points', v_assignment.max_points,
      'max_attempts', v_assignment.max_attempts,
      'late_penalty_percent', v_assignment.late_penalty_percent,
      'allow_text_submission', v_assignment.allow_text_submission,
      'allow_file_submission', v_assignment.allow_file_submission,
      'allow_link_submission', v_assignment.allow_link_submission,
      'reminder_enabled', v_assignment.reminder_enabled,
      'status', v_assignment.status
    ),
    'latest_attempt', v_latest_attempt,
    'attempts', v_attempts,
    'remaining_attempts', GREATEST(COALESCE(v_assignment.max_attempts, 1) - v_attempt_count, 0),
    'can_resubmit', (
      GREATEST(COALESCE(v_assignment.max_attempts, 1) - v_attempt_count, 0) > 0
      AND (v_assignment.due_date IS NULL OR now() <= v_assignment.due_date)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assignment_grading_queue(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_assignment public.assignments%ROWTYPE;
  v_tenant_id uuid := public.get_my_tenant_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  IF NOT (public.has_role('ADMIN') OR public.has_role('TEACHER')) THEN
    RAISE EXCEPTION 'Hanya guru atau admin yang dapat melihat antrian penilaian';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tugas tidak ditemukan';
  END IF;

  RETURN (
    WITH enrolled_students AS (
      SELECT DISTINCT ce.user_id AS student_id
      FROM public.course_enrollments ce
      WHERE v_assignment.course_id IS NOT NULL
        AND ce.course_id = v_assignment.course_id
        AND ce.tenant_id = v_tenant_id
        AND ce.status = 'ACTIVE'
      UNION
      SELECT DISTINCT e.student_id
      FROM public.enrollments e
      WHERE v_assignment.class_id IS NOT NULL
        AND e.class_id = v_assignment.class_id
        AND e.tenant_id = v_tenant_id
        AND e.status = 'ACTIVE'
    ),
    latest_attempts AS (
      SELECT DISTINCT ON (s.student_id)
        s.student_id,
        s.id AS submission_id,
        s.attempt_number,
        s.status,
        s.submitted_at,
        s.is_late,
        s.score,
        s.raw_score
      FROM public.assignment_submissions s
      WHERE s.assignment_id = p_assignment_id
        AND s.tenant_id = v_tenant_id
      ORDER BY s.student_id, s.attempt_number DESC, s.submitted_at DESC
    ),
    queue_rows AS (
      SELECT
        es.student_id,
        COALESCE(p.full_name, 'Siswa') AS student_name,
        la.submission_id,
        la.attempt_number,
        CASE
          WHEN la.student_id IS NULL THEN 'not_submitted'
          WHEN la.status IN ('GRADED', 'RETURNED') THEN 'graded'
          WHEN la.is_late OR la.status = 'LATE' THEN 'late'
          ELSE 'submitted'
        END AS queue_status,
        la.submitted_at,
        la.score,
        la.raw_score
      FROM enrolled_students es
      LEFT JOIN public.profiles p
        ON p.id = es.student_id
      LEFT JOIN latest_attempts la
        ON la.student_id = es.student_id
    )
    SELECT jsonb_build_object(
      'students', COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'student_id', qr.student_id,
            'student_name', qr.student_name,
            'submission_id', qr.submission_id,
            'attempt_number', qr.attempt_number,
            'status', qr.queue_status,
            'submitted_at', qr.submitted_at,
            'score', qr.score,
            'raw_score', qr.raw_score
          )
          ORDER BY qr.student_name
        ),
        '[]'::jsonb
      ),
      'counts', jsonb_build_object(
        'total', COUNT(*)::int,
        'not_submitted', COUNT(*) FILTER (WHERE qr.queue_status = 'not_submitted')::int,
        'submitted', COUNT(*) FILTER (WHERE qr.queue_status = 'submitted')::int,
        'late', COUNT(*) FILTER (WHERE qr.queue_status = 'late')::int,
        'graded', COUNT(*) FILTER (WHERE qr.queue_status = 'graded')::int
      )
    )
    FROM queue_rows qr
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_assignment_analytics(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_assignment public.assignments%ROWTYPE;
  v_tenant_id uuid := public.get_my_tenant_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  IF NOT (public.has_role('ADMIN') OR public.has_role('TEACHER')) THEN
    RAISE EXCEPTION 'Hanya guru atau admin yang dapat melihat analitik tugas';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tugas tidak ditemukan';
  END IF;

  RETURN (
    WITH enrolled_students AS (
      SELECT DISTINCT ce.user_id AS student_id
      FROM public.course_enrollments ce
      WHERE v_assignment.course_id IS NOT NULL
        AND ce.course_id = v_assignment.course_id
        AND ce.tenant_id = v_tenant_id
        AND ce.status = 'ACTIVE'
      UNION
      SELECT DISTINCT e.student_id
      FROM public.enrollments e
      WHERE v_assignment.class_id IS NOT NULL
        AND e.class_id = v_assignment.class_id
        AND e.tenant_id = v_tenant_id
        AND e.status = 'ACTIVE'
    ),
    latest_attempts AS (
      SELECT DISTINCT ON (s.student_id)
        s.student_id,
        s.status,
        s.is_late,
        s.raw_score,
        s.score,
        s.submitted_at,
        s.graded_at
      FROM public.assignment_submissions s
      WHERE s.assignment_id = p_assignment_id
        AND s.tenant_id = v_tenant_id
      ORDER BY s.student_id, s.attempt_number DESC, s.submitted_at DESC
    ),
    scoped AS (
      SELECT
        es.student_id,
        la.status,
        la.is_late,
        la.raw_score,
        la.score,
        la.submitted_at,
        la.graded_at
      FROM enrolled_students es
      LEFT JOIN latest_attempts la
        ON la.student_id = es.student_id
    )
    SELECT jsonb_build_object(
      'total_students', COUNT(*)::int,
      'submission_count', COUNT(*) FILTER (WHERE scoped.status IS NOT NULL)::int,
      'graded_count', COUNT(*) FILTER (WHERE scoped.status IN ('GRADED', 'RETURNED'))::int,
      'late_count', COUNT(*) FILTER (WHERE scoped.is_late = true)::int,
      'not_submitted_count', COUNT(*) FILTER (WHERE scoped.status IS NULL)::int,
      'submission_rate', COALESCE(ROUND((COUNT(*) FILTER (WHERE scoped.status IS NOT NULL)::numeric / NULLIF(COUNT(*), 0)) * 100, 2), 0),
      'avg_raw_score', ROUND(COALESCE(AVG(scoped.raw_score), 0), 2),
      'avg_effective_score', ROUND(COALESCE(AVG(scoped.score), 0), 2),
      'avg_time_to_grade_hours',
        ROUND(
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (scoped.graded_at - scoped.submitted_at)) / 3600)
              FILTER (WHERE scoped.graded_at IS NOT NULL AND scoped.submitted_at IS NOT NULL),
            0
          ),
          2
        ),
      'score_distribution', jsonb_build_array(
        jsonb_build_object('bucket', '0-59', 'count', COUNT(*) FILTER (WHERE scoped.score >= 0 AND scoped.score < 60)::int),
        jsonb_build_object('bucket', '60-79', 'count', COUNT(*) FILTER (WHERE scoped.score >= 60 AND scoped.score < 80)::int),
        jsonb_build_object('bucket', '80-100', 'count', COUNT(*) FILTER (WHERE scoped.score >= 80)::int)
      )
    )
    FROM scoped
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.send_assignment_reminders(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_assignment public.assignments%ROWTYPE;
  v_tenant_id uuid := public.get_my_tenant_id();
  v_recipient_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  IF NOT (public.has_role('ADMIN') OR public.has_role('TEACHER')) THEN
    RAISE EXCEPTION 'Hanya guru atau admin yang dapat mengirim pengingat';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id
    AND tenant_id = v_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tugas tidak ditemukan';
  END IF;

  WITH enrolled_students AS (
    SELECT DISTINCT ce.user_id AS student_id
    FROM public.course_enrollments ce
    WHERE v_assignment.course_id IS NOT NULL
      AND ce.course_id = v_assignment.course_id
      AND ce.tenant_id = v_tenant_id
      AND ce.status = 'ACTIVE'
    UNION
    SELECT DISTINCT e.student_id
    FROM public.enrollments e
    WHERE v_assignment.class_id IS NOT NULL
      AND e.class_id = v_assignment.class_id
      AND e.tenant_id = v_tenant_id
      AND e.status = 'ACTIVE'
  ),
  latest_attempts AS (
    SELECT DISTINCT ON (s.student_id)
      s.student_id,
      s.status
    FROM public.assignment_submissions s
    WHERE s.assignment_id = p_assignment_id
      AND s.tenant_id = v_tenant_id
    ORDER BY s.student_id, s.attempt_number DESC, s.submitted_at DESC
  ),
  targets AS (
    SELECT es.student_id
    FROM enrolled_students es
    LEFT JOIN latest_attempts la
      ON la.student_id = es.student_id
    WHERE la.student_id IS NULL OR la.status = 'DRAFT'
  ),
  inserted AS (
    SELECT
      t.student_id,
      public.create_notification(
        v_tenant_id,
        t.student_id,
        'assignment_due',
        'Pengingat tugas',
        format(
          'Tugas "%s" belum Anda kumpulkan.%s',
          v_assignment.title,
          CASE
            WHEN v_assignment.due_date IS NOT NULL
              THEN ' Tenggat: ' || to_char(v_assignment.due_date AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY HH24:MI')
            ELSE ''
          END
        ),
        jsonb_build_object(
          'assignment_id', v_assignment.id,
          'assignment_title', v_assignment.title,
          'due_date', v_assignment.due_date
        )
      ) AS notification_id
    FROM targets t
  )
  SELECT COUNT(*)
  INTO v_recipient_count
  FROM inserted;

  PERFORM public.log_admin_action(
    'assignment.reminder_sent',
    NULL,
    'assignment',
    p_assignment_id,
    jsonb_build_object(
      'recipient_count', v_recipient_count,
      'assignment_title', v_assignment.title
    )
  );

  RETURN jsonb_build_object(
    'recipient_count', v_recipient_count,
    'assignment_id', p_assignment_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_assignment_attempt(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_submission_bundle(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_grading_queue(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assignment_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_assignment_reminders(uuid) TO authenticated;
