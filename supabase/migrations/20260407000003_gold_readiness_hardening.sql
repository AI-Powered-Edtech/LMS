-- =============================================================================
-- EduSync LMS — Gold Readiness Hardening
-- Tanggal: 2026-04-07
-- =============================================================================
-- Menutup gap readiness untuk:
-- 1. Survey analytics RPC tenant-scoped
-- 2. Finance dashboard/payment/reminder RPC
-- 3. Parent dashboard snapshot RPC
-- 4. Principal monthly trend RPC
-- 5. Bulk import async job rows + SQL worker
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Survey analytics hardening
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_survey_results(uuid);
DROP FUNCTION IF EXISTS public.export_survey_responses(uuid);

CREATE OR REPLACE FUNCTION public.get_survey_results(
  p_tenant_id uuid,
  p_survey_id uuid
)
RETURNS TABLE (
  survey_id uuid,
  survey_title text,
  target_audience text,
  status text,
  total_responses bigint,
  response_rate numeric,
  question_id text,
  question_text text,
  question_type text,
  rating_avg numeric,
  rating_distribution jsonb,
  yes_count bigint,
  no_count bigint,
  text_answers text[],
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_survey_id uuid;
  v_survey_title text;
  v_target_audience text;
  v_status text;
  v_questions jsonb;
  v_created_at timestamptz;
  v_question jsonb;
  v_total_responses bigint := 0;
  v_target_count bigint := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('PRINCIPAL'::public.app_role)
     AND NOT public.has_role('ADMIN'::public.app_role)
  THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran PRINCIPAL atau ADMIN';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  SELECT
    s.id,
    s.title,
    s.target_audience,
    s.status,
    s.questions,
    s.created_at
  INTO
    v_survey_id,
    v_survey_title,
    v_target_audience,
    v_status,
    v_questions,
    v_created_at
  FROM public.satisfaction_surveys s
  WHERE s.id = p_survey_id
    AND s.tenant_id = p_tenant_id;

  IF v_survey_id IS NULL THEN
    RAISE EXCEPTION 'Survei tidak ditemukan';
  END IF;

  SELECT COUNT(sr.id)
  INTO v_total_responses
  FROM public.survey_responses sr
  WHERE sr.survey_id = p_survey_id
    AND sr.tenant_id = p_tenant_id;

  IF v_target_audience = 'teachers' THEN
    SELECT COUNT(DISTINCT ur.user_id)
    INTO v_target_count
    FROM public.user_roles ur
    WHERE ur.tenant_id = p_tenant_id
      AND ur.role = 'TEACHER';
  ELSIF v_target_audience = 'students' THEN
    SELECT COUNT(DISTINCT ur.user_id)
    INTO v_target_count
    FROM public.user_roles ur
    WHERE ur.tenant_id = p_tenant_id
      AND ur.role = 'STUDENT';
  ELSIF v_target_audience = 'parents' THEN
    SELECT COUNT(DISTINCT spl.parent_id)
    INTO v_target_count
    FROM public.student_parent_links spl
    WHERE spl.tenant_id = p_tenant_id;
  ELSE
    SELECT COUNT(DISTINCT member_id)
    INTO v_target_count
    FROM (
      SELECT ur.user_id AS member_id
      FROM public.user_roles ur
      WHERE ur.tenant_id = p_tenant_id
      UNION
      SELECT spl.parent_id AS member_id
      FROM public.student_parent_links spl
      WHERE spl.tenant_id = p_tenant_id
    ) audience_members;
  END IF;

  FOR v_question IN
    SELECT value
    FROM jsonb_array_elements(v_questions)
  LOOP
    survey_id := v_survey_id;
    survey_title := v_survey_title;
    target_audience := v_target_audience;
    status := v_status;
    total_responses := v_total_responses;
    response_rate :=
      CASE
        WHEN v_target_count > 0 THEN ROUND((v_total_responses::numeric / v_target_count::numeric) * 100, 2)
        ELSE NULL
      END;
    question_id := v_question->>'id';
    question_text := v_question->>'text';
    question_type := v_question->>'type';
    created_at := v_created_at;

    rating_avg := NULL;
    rating_distribution := NULL;
    yes_count := NULL;
    no_count := NULL;
    text_answers := NULL;

    IF question_type = 'rating' THEN
      SELECT
        ROUND(AVG((sr.answers->>question_id)::numeric), 2),
        jsonb_build_object(
          '1', COUNT(*) FILTER (WHERE (sr.answers->>question_id)::int = 1),
          '2', COUNT(*) FILTER (WHERE (sr.answers->>question_id)::int = 2),
          '3', COUNT(*) FILTER (WHERE (sr.answers->>question_id)::int = 3),
          '4', COUNT(*) FILTER (WHERE (sr.answers->>question_id)::int = 4),
          '5', COUNT(*) FILTER (WHERE (sr.answers->>question_id)::int = 5)
        )
      INTO rating_avg, rating_distribution
      FROM public.survey_responses sr
      WHERE sr.survey_id = p_survey_id
        AND sr.tenant_id = p_tenant_id
        AND sr.answers ? question_id
        AND (sr.answers->>question_id) ~ '^[1-5]$';
    ELSIF question_type = 'yesno' THEN
      SELECT
        COUNT(*) FILTER (
          WHERE lower(coalesce(sr.answers->>question_id, '')) IN ('true', 'ya', 'yes', '1')
        ),
        COUNT(*) FILTER (
          WHERE lower(coalesce(sr.answers->>question_id, '')) IN ('false', 'tidak', 'no', '0')
        )
      INTO yes_count, no_count
      FROM public.survey_responses sr
      WHERE sr.survey_id = p_survey_id
        AND sr.tenant_id = p_tenant_id
        AND sr.answers ? question_id;
    ELSE
      SELECT ARRAY_AGG(answer_value ORDER BY submitted_at DESC)
      INTO text_answers
      FROM (
        SELECT
          sr.answers->>question_id AS answer_value,
          sr.submitted_at
        FROM public.survey_responses sr
        WHERE sr.survey_id = p_survey_id
          AND sr.tenant_id = p_tenant_id
          AND sr.answers ? question_id
          AND NULLIF(trim(sr.answers->>question_id), '') IS NOT NULL
        ORDER BY sr.submitted_at DESC
        LIMIT 250
      ) text_rows;
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_survey_results(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_survey_results(uuid, uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.export_survey_responses(
  p_tenant_id uuid,
  p_survey_id uuid
)
RETURNS TABLE (
  respondent_id uuid,
  responded_at timestamptz,
  question_id text,
  question_text text,
  question_type text,
  answer_value text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_questions jsonb;
  v_question jsonb;
  v_response record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('PRINCIPAL'::public.app_role)
     AND NOT public.has_role('ADMIN'::public.app_role)
  THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran PRINCIPAL atau ADMIN';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  SELECT s.questions
  INTO v_questions
  FROM public.satisfaction_surveys s
  WHERE s.id = p_survey_id
    AND s.tenant_id = p_tenant_id;

  IF v_questions IS NULL THEN
    RAISE EXCEPTION 'Survei tidak ditemukan';
  END IF;

  FOR v_response IN
    SELECT
      sr.respondent_id,
      sr.submitted_at,
      sr.answers
    FROM public.survey_responses sr
    WHERE sr.survey_id = p_survey_id
      AND sr.tenant_id = p_tenant_id
    ORDER BY sr.submitted_at ASC
  LOOP
    FOR v_question IN
      SELECT value
      FROM jsonb_array_elements(v_questions)
    LOOP
      respondent_id := v_response.respondent_id;
      responded_at := v_response.submitted_at;
      question_id := v_question->>'id';
      question_text := v_question->>'text';
      question_type := v_question->>'type';
      answer_value := COALESCE(v_response.answers->>question_id, '');
      RETURN NEXT;
    END LOOP;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_survey_responses(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.export_survey_responses(uuid, uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.get_survey_summary(p_tenant_id uuid)
RETURNS TABLE (
  survey_id uuid,
  title text,
  target_audience text,
  status text,
  created_at timestamptz,
  total_responses bigint,
  unique_respondents bigint,
  first_response_at timestamptz,
  last_response_at timestamptz,
  avg_response_time_seconds numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('PRINCIPAL'::public.app_role)
     AND NOT public.has_role('ADMIN'::public.app_role)
  THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran PRINCIPAL atau ADMIN';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  RETURN QUERY
  SELECT
    s.id AS survey_id,
    s.title,
    s.target_audience,
    s.status,
    s.created_at,
    COUNT(sr.id) AS total_responses,
    COUNT(DISTINCT sr.respondent_id) AS unique_respondents,
    MIN(sr.submitted_at) AS first_response_at,
    MAX(sr.submitted_at) AS last_response_at,
    CASE
      WHEN COUNT(sr.id) > 0 THEN
        ROUND(AVG(EXTRACT(EPOCH FROM (sr.submitted_at - s.created_at)))::numeric, 2)
      ELSE NULL
    END AS avg_response_time_seconds
  FROM public.satisfaction_surveys s
  LEFT JOIN public.survey_responses sr
    ON sr.survey_id = s.id
    AND sr.tenant_id = s.tenant_id
  WHERE s.tenant_id = p_tenant_id
  GROUP BY s.id, s.title, s.target_audience, s.status, s.created_at
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_survey_summary(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_survey_summary(uuid) FROM anon;

-- ---------------------------------------------------------------------------
-- 2. Finance hardening
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_created_at
  ON public.payments (invoice_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_finance_dashboard_page(
  p_tenant_id uuid,
  p_status text DEFAULT 'all',
  p_search text DEFAULT '',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  amount_due numeric,
  amount_paid numeric,
  status text,
  description text,
  month_year text,
  due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offset integer := GREATEST((COALESCE(p_page, 1) - 1) * GREATEST(COALESCE(p_page_size, 20), 1), 0);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
  v_status text := lower(coalesce(p_status, 'all'));
  v_search text := trim(coalesce(p_search, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('ADMIN'::public.app_role)
     AND NOT public.has_role('PRINCIPAL'::public.app_role)
  THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran ADMIN atau PRINCIPAL';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      f.id,
      f.tenant_id,
      f.student_id,
      f.student_name,
      f.student_email,
      f.amount_due::numeric AS amount_due,
      f.amount_paid::numeric AS amount_paid,
      lower(f.status) AS status,
      f.description,
      f.month_year,
      f.due_date,
      f.paid_at,
      f.created_at,
      f.updated_at
    FROM public.finance_invoice_details f
    WHERE f.tenant_id = p_tenant_id
      AND (
        v_status = 'all'
        OR (v_status = 'paid' AND lower(f.status) = 'paid')
        OR (v_status = 'pending' AND lower(f.status) IN ('pending', 'open', 'draft'))
        OR (v_status = 'overdue' AND lower(f.status) IN ('overdue', 'terlambat', 'uncollectible'))
      )
      AND (
        v_search = ''
        OR coalesce(f.student_name, '') ILIKE '%' || v_search || '%'
        OR coalesce(f.student_email, '') ILIKE '%' || v_search || '%'
        OR coalesce(f.description, '') ILIKE '%' || v_search || '%'
      )
  )
  SELECT
    filtered.id,
    filtered.tenant_id,
    filtered.student_id,
    filtered.student_name,
    filtered.student_email,
    filtered.amount_due,
    filtered.amount_paid,
    filtered.status,
    filtered.description,
    filtered.month_year,
    filtered.due_date,
    filtered.paid_at,
    filtered.created_at,
    filtered.updated_at,
    COUNT(*) OVER () AS total_count
  FROM filtered
  ORDER BY filtered.created_at DESC
  OFFSET v_offset
  LIMIT v_page_size;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_dashboard_page(uuid, text, text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_finance_dashboard_page(uuid, text, text, integer, integer) FROM anon;

CREATE OR REPLACE FUNCTION public.reconcile_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  payment_id uuid,
  invoice_id uuid,
  invoice_status text,
  amount_paid numeric,
  amount_remaining numeric,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice record;
  v_payment_id uuid;
  v_new_amount_paid numeric;
  v_remaining numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('ADMIN'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran ADMIN';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Nominal pembayaran harus lebih besar dari nol';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_invoice_id::text));

  SELECT
    i.id,
    i.tenant_id,
    lower(i.status) AS status,
    coalesce(i.amount_due, i.amount, 0)::numeric AS amount_due,
    coalesce(i.amount_paid, 0)::numeric AS amount_paid
  INTO v_invoice
  FROM public.invoices i
  WHERE i.id = p_invoice_id
    AND i.tenant_id = public.get_my_tenant_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tagihan tidak ditemukan';
  END IF;

  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'Tagihan sudah dibayar';
  END IF;

  v_remaining := GREATEST(v_invoice.amount_due - v_invoice.amount_paid, 0);

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Nominal pembayaran melebihi sisa tagihan';
  END IF;

  INSERT INTO public.payments (
    invoice_id,
    amount,
    method,
    tenant_id,
    payment_reference,
    notes,
    recorded_by
  )
  VALUES (
    p_invoice_id,
    p_amount,
    COALESCE(NULLIF(trim(p_method), ''), 'transfer'),
    v_invoice.tenant_id,
    NULLIF(trim(p_reference), ''),
    NULLIF(trim(p_notes), ''),
    auth.uid()
  )
  RETURNING id INTO v_payment_id;

  v_new_amount_paid := v_invoice.amount_paid + p_amount;
  v_remaining := GREATEST(v_invoice.amount_due - v_new_amount_paid, 0);

  UPDATE public.invoices
  SET
    amount_paid = v_new_amount_paid,
    status = CASE WHEN v_remaining = 0 THEN 'paid' ELSE 'pending' END,
    paid_at = CASE WHEN v_remaining = 0 THEN now() ELSE paid_at END,
    updated_at = now()
  WHERE id = p_invoice_id;

  PERFORM public.log_admin_action(
    'finance.invoice.reconciled',
    v_invoice.id,
    'invoice',
    v_invoice.id,
    jsonb_build_object(
      'amount', p_amount,
      'method', COALESCE(NULLIF(trim(p_method), ''), 'transfer'),
      'reference', NULLIF(trim(p_reference), ''),
      'notes', NULLIF(trim(p_notes), ''),
      'remaining', v_remaining
    )
  );

  RETURN QUERY
  SELECT
    v_payment_id,
    v_invoice.id,
    CASE WHEN v_remaining = 0 THEN 'paid' ELSE 'pending' END,
    v_new_amount_paid,
    v_remaining,
    CASE WHEN v_remaining = 0 THEN now() ELSE NULL END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_invoice_payment(uuid, numeric, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_invoice_payment(uuid, numeric, text, text, text) FROM anon;

CREATE OR REPLACE FUNCTION public.send_invoice_reminders(
  p_tenant_id uuid,
  p_invoice_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  invoice_id uuid,
  student_id uuid,
  student_name text,
  student_email text,
  reminder_status text,
  reminder_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('ADMIN'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran ADMIN';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  FOR v_invoice IN
    SELECT
      f.id,
      f.student_id,
      f.student_name,
      f.student_email,
      f.amount_due::numeric AS amount_due,
      f.month_year,
      f.due_date,
      lower(f.status) AS status
    FROM public.finance_invoice_details f
    WHERE f.tenant_id = p_tenant_id
      AND lower(f.status) <> 'paid'
      AND (
        p_invoice_ids IS NULL
        OR cardinality(p_invoice_ids) = 0
        OR f.id = ANY (p_invoice_ids)
      )
    ORDER BY f.created_at DESC
  LOOP
    IF v_invoice.student_id IS NULL THEN
      invoice_id := v_invoice.id;
      student_id := NULL;
      student_name := v_invoice.student_name;
      student_email := v_invoice.student_email;
      reminder_status := 'failed';
      reminder_message := 'Siswa tujuan tidak ditemukan.';
      RETURN NEXT;
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (
      tenant_id,
      user_id,
      title,
      message,
      type,
      entity_id
    )
    VALUES (
      p_tenant_id,
      v_invoice.student_id,
      'Pengingat pembayaran',
      format(
        'Tagihan %s sebesar Rp %s masih menunggu pembayaran. Mohon lakukan pelunasan sebelum jatuh tempo %s.',
        COALESCE(v_invoice.month_year, 'SPP'),
        to_char(v_invoice.amount_due, 'FM999999999999'),
        COALESCE(to_char(v_invoice.due_date, 'DD Mon YYYY'), 'yang tertera')
      ),
      'INFO'::public.notification_type,
      v_invoice.id
    );

    PERFORM public.log_admin_action(
      'finance.invoice.reminder_sent',
      v_invoice.student_id,
      'invoice',
      v_invoice.id,
      jsonb_build_object(
        'email', v_invoice.student_email,
        'amount_due', v_invoice.amount_due,
        'month_year', v_invoice.month_year
      )
    );

    invoice_id := v_invoice.id;
    student_id := v_invoice.student_id;
    student_name := v_invoice.student_name;
    student_email := v_invoice.student_email;
    reminder_status := 'queued';
    reminder_message := 'Pengingat berhasil dicatat dan notifikasi internal telah dibuat.';
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_invoice_reminders(uuid, uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.send_invoice_reminders(uuid, uuid[]) FROM anon;

-- ---------------------------------------------------------------------------
-- 3. Parent dashboard snapshot
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_parent_dashboard_snapshot(
  p_tenant_id uuid,
  p_parent_id uuid,
  p_student_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_child record;
  v_result jsonb := '[]'::jsonb;
  v_week_start date;
  v_week_end date;
  v_grades jsonb;
  v_attendance jsonb;
  v_pending jsonb;
  v_achievements jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('PARENT'::public.app_role) THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran PARENT';
  END IF;

  IF p_parent_id <> auth.uid() THEN
    RAISE EXCEPTION 'Akses ditolak: parent tidak cocok';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  v_week_start := date_trunc('week', now()::date + interval '1 day')::date - interval '1 day';
  v_week_end := v_week_start + 4;

  FOR v_child IN
    SELECT DISTINCT ON (p.id)
      p.id AS student_id,
      p.full_name AS student_name,
      p.avatar_url AS student_avatar,
      COALESCE(c.name, 'Tidak ada kelas') AS class_name,
      spl.relationship
    FROM public.student_parent_links spl
    JOIN public.profiles p
      ON p.id = spl.student_id
      AND p.tenant_id = spl.tenant_id
    LEFT JOIN public.enrollments e
      ON e.student_id = spl.student_id
      AND e.tenant_id = spl.tenant_id
    LEFT JOIN public.classes c
      ON c.id = e.class_id
    WHERE spl.parent_id = p_parent_id
      AND spl.tenant_id = p_tenant_id
      AND (
        p_student_ids IS NULL
        OR cardinality(p_student_ids) = 0
        OR p.id = ANY (p_student_ids)
      )
    ORDER BY p.id
  LOOP
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'subject', subject,
        'latest_score', latest_score,
        'previous_score', previous_score,
        'trend', trend
      )
      ORDER BY subject
    ), '[]'::jsonb)
    INTO v_grades
    FROM (
      WITH ranked_grades AS (
        SELECT
          COALESCE(c.title, 'Mata Pelajaran') AS subject,
          CASE
            WHEN ge.max_score > 0 THEN ROUND((ge.score / ge.max_score) * 100)
            ELSE 0
          END AS pct_score,
          ROW_NUMBER() OVER (
            PARTITION BY ge.student_id, COALESCE(c.title, 'Mata Pelajaran')
            ORDER BY ge.created_at DESC
          ) AS rn
        FROM public.gradebook_entries ge
        LEFT JOIN public.courses c
          ON c.id = ge.course_id
         AND c.tenant_id = p_tenant_id
        WHERE ge.student_id = v_child.student_id
          AND ge.tenant_id = p_tenant_id
      )
      SELECT
        subject,
        MAX(pct_score) FILTER (WHERE rn = 1) AS latest_score,
        MAX(pct_score) FILTER (WHERE rn = 2) AS previous_score,
        CASE
          WHEN MAX(pct_score) FILTER (WHERE rn = 2) IS NULL THEN 'stable'
          WHEN MAX(pct_score) FILTER (WHERE rn = 1) > MAX(pct_score) FILTER (WHERE rn = 2) + 2 THEN 'up'
          WHEN MAX(pct_score) FILTER (WHERE rn = 1) < MAX(pct_score) FILTER (WHERE rn = 2) - 2 THEN 'down'
          ELSE 'stable'
        END AS trend
      FROM ranked_grades
      WHERE rn <= 2
      GROUP BY subject
      ORDER BY subject
      LIMIT 6
    ) grade_rows;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'date', attendance_date,
        'status', attendance_status
      )
      ORDER BY attendance_date
    ), '[]'::jsonb)
    INTO v_attendance
    FROM (
      WITH dates AS (
        SELECT generate_series(v_week_start, v_week_end, interval '1 day')::date AS attendance_date
      ),
      attendance_rows AS (
        SELECT
          ar.date::date AS attendance_date,
          CASE
            WHEN lower(ar.status) IN ('hadir', 'present') THEN 'hadir'
            WHEN lower(ar.status) IN ('sakit', 'sick') THEN 'sakit'
            WHEN lower(ar.status) IN ('izin', 'excused') THEN 'izin'
            ELSE 'alpha'
          END AS attendance_status
        FROM public.enrollments e
        JOIN public.attendance_records ar
          ON ar.enrollment_id = e.id
        WHERE e.student_id = v_child.student_id
          AND e.tenant_id = p_tenant_id
          AND ar.date >= v_week_start
          AND ar.date <= v_week_end
      )
      SELECT
        d.attendance_date,
        COALESCE(a.attendance_status, 'alpha') AS attendance_status
      FROM dates d
      LEFT JOIN attendance_rows a
        ON a.attendance_date = d.attendance_date
      ORDER BY d.attendance_date
    ) attendance_data;

    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', assignment_id,
        'title', title,
        'subject', subject,
        'due_date', due_date,
        'is_overdue', is_overdue
      )
      ORDER BY due_date NULLS LAST
    ), '[]'::jsonb)
    INTO v_pending
    FROM (
      SELECT
        a.id AS assignment_id,
        a.title,
        COALESCE(c.title, 'Mata Pelajaran') AS subject,
        a.due_date,
        (a.due_date IS NOT NULL AND a.due_date < now()) AS is_overdue
      FROM public.enrollments e
      JOIN public.assignments a
        ON a.course_id = e.course_id
       AND a.tenant_id = p_tenant_id
      LEFT JOIN public.courses c
        ON c.id = a.course_id
       AND c.tenant_id = p_tenant_id
      WHERE e.student_id = v_child.student_id
        AND e.tenant_id = p_tenant_id
        AND COALESCE(a.is_published, false) = true
        AND NOT EXISTS (
          SELECT 1
          FROM public.assignment_submissions s
          WHERE s.assignment_id = a.id
            AND s.student_id = v_child.student_id
            AND s.status IN ('submitted', 'graded', 'returned')
        )
      ORDER BY a.due_date ASC NULLS LAST
      LIMIT 10
    ) pending_rows;

    SELECT COALESCE(jsonb_agg(achievement_text ORDER BY created_at DESC), '[]'::jsonb)
    INTO v_achievements
    FROM (
      SELECT
        CASE
          WHEN ae.event_type = 'BADGE_AWARDED' THEN format('Meraih badge "%s"', COALESCE(ae.metadata->>'badge_name', 'Badge baru'))
          WHEN ae.event_type = 'XP_EARNED' THEN format('+%s XP diperoleh', COALESCE(ae.metadata->>'xp_amount', ae.metadata->>'amount', '0'))
          WHEN ae.event_type = 'LESSON_COMPLETED' THEN format('Menyelesaikan "%s"', COALESCE(ae.metadata->>'lesson_title', 'Pelajaran'))
          WHEN ae.event_type = 'QUIZ_COMPLETED' THEN format('Kuis selesai dengan nilai %s', COALESCE(ae.metadata->>'score', '0'))
          ELSE NULL
        END AS achievement_text,
        ae.created_at
      FROM public.activity_events ae
      WHERE ae.user_id = v_child.student_id
        AND ae.tenant_id = p_tenant_id
        AND ae.event_type IN ('BADGE_AWARDED', 'XP_EARNED', 'LESSON_COMPLETED', 'QUIZ_COMPLETED')
        AND ae.created_at >= now() - interval '7 days'
      ORDER BY ae.created_at DESC
      LIMIT 5
    ) achievement_rows
    WHERE achievement_text IS NOT NULL;

    v_result := v_result || jsonb_build_array(
      jsonb_build_object(
        'child', jsonb_build_object(
          'student_id', v_child.student_id,
          'student_name', v_child.student_name,
          'student_avatar', v_child.student_avatar,
          'class_name', v_child.class_name,
          'relationship', v_child.relationship
        ),
        'grades', v_grades,
        'attendance_this_week', v_attendance,
        'pending_assignments', v_pending,
        'recent_achievements', v_achievements
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'children', v_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_dashboard_snapshot(uuid, uuid, uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_parent_dashboard_snapshot(uuid, uuid, uuid[]) FROM anon;

-- ---------------------------------------------------------------------------
-- 4. Principal monthly trend cached RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_principal_monthly_trend_cached(
  p_tenant_id uuid,
  p_months integer DEFAULT 6
)
RETURNS TABLE (
  month_key text,
  month_label text,
  active_students bigint,
  lesson_completions bigint,
  quiz_attempts bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_months integer := LEAST(GREATEST(COALESCE(p_months, 6), 1), 12);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  IF NOT public.has_role('PRINCIPAL'::public.app_role)
     AND NOT public.has_role('ADMIN'::public.app_role)
  THEN
    RAISE EXCEPTION 'Akses ditolak: membutuhkan peran PRINCIPAL atau ADMIN';
  END IF;

  IF p_tenant_id IS NULL OR p_tenant_id <> public.get_my_tenant_id() THEN
    RAISE EXCEPTION 'Akses ditolak: tenant tidak cocok';
  END IF;

  RETURN QUERY
  WITH months AS (
    SELECT generate_series(
      date_trunc('month', now()) - make_interval(months => v_months - 1),
      date_trunc('month', now()),
      interval '1 month'
    ) AS month_start
  ),
  activity AS (
    SELECT
      date_trunc('month', ae.created_at) AS month_start,
      COUNT(DISTINCT ae.user_id) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM public.user_roles ur
          WHERE ur.user_id = ae.user_id
            AND ur.tenant_id = p_tenant_id
            AND ur.role = 'STUDENT'
        )
      ) AS active_students,
      COUNT(*) FILTER (WHERE ae.event_type = 'LESSON_COMPLETED') AS lesson_completions,
      COUNT(*) FILTER (WHERE ae.event_type IN ('QUIZ_ATTEMPT', 'QUIZ_SUBMITTED', 'QUIZ_COMPLETED')) AS quiz_attempts
    FROM public.activity_events ae
    WHERE ae.tenant_id = p_tenant_id
      AND ae.created_at >= date_trunc('month', now()) - make_interval(months => v_months - 1)
    GROUP BY 1
  )
  SELECT
    to_char(m.month_start, 'YYYY-MM') AS month_key,
    to_char(m.month_start, 'Mon YYYY') AS month_label,
    COALESCE(a.active_students, 0) AS active_students,
    COALESCE(a.lesson_completions, 0) AS lesson_completions,
    COALESCE(a.quiz_attempts, 0) AS quiz_attempts
  FROM months m
  LEFT JOIN activity a
    ON a.month_start = m.month_start
  ORDER BY m.month_start ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_principal_monthly_trend_cached(uuid, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_principal_monthly_trend_cached(uuid, integer) FROM anon;

-- ---------------------------------------------------------------------------
-- 5. Bulk import async jobs
-- ---------------------------------------------------------------------------

ALTER TABLE public.bulk_import_jobs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.bulk_import_job_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.bulk_import_jobs(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  nis text,
  nomor_hp text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  error_reason text,
  invitation_id uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, row_number)
);

ALTER TABLE public.bulk_import_job_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_import_job_rows" ON public.bulk_import_job_rows;
CREATE POLICY "admin_manage_import_job_rows"
  ON public.bulk_import_job_rows
  FOR ALL
  USING (
    tenant_id = public.get_my_tenant_id()
    AND public.has_role('ADMIN'::public.app_role)
  )
  WITH CHECK (
    tenant_id = public.get_my_tenant_id()
    AND public.has_role('ADMIN'::public.app_role)
  );

CREATE TRIGGER auto_set_tenant_id_bulk_import_rows
  BEFORE INSERT ON public.bulk_import_job_rows
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE INDEX IF NOT EXISTS idx_bulk_import_job_rows_job_status
  ON public.bulk_import_job_rows (job_id, status, row_number);

CREATE INDEX IF NOT EXISTS idx_bulk_import_job_rows_tenant_created
  ON public.bulk_import_job_rows (tenant_id, created_at DESC);

GRANT ALL ON TABLE public.bulk_import_job_rows TO authenticated;

CREATE OR REPLACE FUNCTION public.process_bulk_import_jobs(p_batch_size integer DEFAULT 500)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_job record;
  v_row record;
  v_processed integer := 0;
  v_batch_size integer := LEAST(GREATEST(COALESCE(p_batch_size, 500), 1), 1000);
  v_role text;
  v_existing_profile_id uuid;
  v_existing_invitation_id uuid;
  v_has_lock boolean;
BEGIN
  FOR v_job IN
    SELECT
      j.id,
      j.tenant_id,
      j.created_by
    FROM public.bulk_import_jobs j
    WHERE j.status = 'processing'
      AND EXISTS (
        SELECT 1
        FROM public.bulk_import_job_rows r
        WHERE r.job_id = j.id
          AND r.status = 'pending'
      )
    ORDER BY j.created_at ASC
  LOOP
    v_has_lock := pg_try_advisory_xact_lock(hashtext(v_job.id::text));
    IF NOT v_has_lock THEN
      CONTINUE;
    END IF;

    UPDATE public.bulk_import_jobs
    SET started_at = COALESCE(started_at, now())
    WHERE id = v_job.id;

    FOR v_row IN
      SELECT
        r.id,
        r.row_number,
        lower(trim(r.email)) AS email,
        trim(r.full_name) AS full_name,
        lower(trim(r.role)) AS role,
        NULLIF(trim(r.nis), '') AS nis,
        NULLIF(trim(r.nomor_hp), '') AS nomor_hp
      FROM public.bulk_import_job_rows r
      WHERE r.job_id = v_job.id
        AND r.status = 'pending'
      ORDER BY r.row_number ASC
      LIMIT v_batch_size
      FOR UPDATE SKIP LOCKED
    LOOP
      UPDATE public.bulk_import_job_rows
      SET status = 'processing'
      WHERE id = v_row.id;

      BEGIN
        IF v_row.email !~* '^[^@]+@[^@]+\.[^@]+$' THEN
          RAISE EXCEPTION 'Email tidak valid';
        END IF;

        IF v_row.full_name IS NULL OR v_row.full_name = '' THEN
          RAISE EXCEPTION 'Nama lengkap wajib diisi';
        END IF;

        v_role := CASE
          WHEN v_row.role IN ('siswa', 'student') THEN 'student'
          WHEN v_row.role IN ('guru', 'teacher') THEN 'teacher'
          WHEN v_row.role = 'admin' THEN 'admin'
          ELSE NULL
        END;

        IF v_role IS NULL THEN
          RAISE EXCEPTION 'Peran tidak valid';
        END IF;

        SELECT p.id
        INTO v_existing_profile_id
        FROM public.profiles p
        WHERE p.tenant_id = v_job.tenant_id
          AND lower(p.email) = v_row.email
        LIMIT 1;

        IF v_existing_profile_id IS NOT NULL THEN
          RAISE EXCEPTION 'Email sudah terdaftar sebagai pengguna tenant ini';
        END IF;

        SELECT ti.id
        INTO v_existing_invitation_id
        FROM public.tenant_invitations ti
        WHERE ti.tenant_id = v_job.tenant_id
          AND lower(ti.email) = v_row.email
          AND ti.status IN ('pending', 'accepted')
          AND ti.accepted_at IS NULL
        LIMIT 1;

        IF v_existing_invitation_id IS NOT NULL THEN
          RAISE EXCEPTION 'Email sudah memiliki undangan aktif';
        END IF;

        INSERT INTO public.tenant_invitations (
          tenant_id,
          email,
          role,
          invited_by
        )
        VALUES (
          v_job.tenant_id,
          v_row.email,
          v_role,
          v_job.created_by
        )
        RETURNING id INTO v_existing_invitation_id;

        UPDATE public.bulk_import_job_rows
        SET
          status = 'success',
          invitation_id = v_existing_invitation_id,
          error_reason = NULL,
          processed_at = now()
        WHERE id = v_row.id;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.bulk_import_job_rows
        SET
          status = 'failed',
          error_reason = left(SQLERRM, 500),
          processed_at = now()
        WHERE id = v_row.id;
      END;

      v_processed := v_processed + 1;
    END LOOP;

    UPDATE public.bulk_import_jobs j
    SET
      success_rows = stats.success_rows,
      failed_rows = stats.failed_rows,
      processed_at = now(),
      completed_at = CASE WHEN stats.pending_rows = 0 THEN now() ELSE j.completed_at END,
      status = CASE
        WHEN stats.pending_rows > 0 THEN 'processing'
        WHEN stats.success_rows > 0 AND stats.failed_rows = 0 THEN 'completed'
        WHEN stats.success_rows > 0 AND stats.failed_rows > 0 THEN 'partial'
        WHEN stats.success_rows = 0 AND stats.failed_rows > 0 THEN 'failed'
        ELSE j.status
      END,
      error_details = CASE
        WHEN stats.failed_rows > 0 THEN stats.error_details
        ELSE NULL
      END
    FROM (
      SELECT
        COUNT(*) FILTER (WHERE r.status = 'success') AS success_rows,
        COUNT(*) FILTER (WHERE r.status = 'failed') AS failed_rows,
        COUNT(*) FILTER (WHERE r.status IN ('pending', 'processing')) AS pending_rows,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'row', r.row_number,
              'email', r.email,
              'reason', r.error_reason
            )
            ORDER BY r.row_number
          ) FILTER (WHERE r.status = 'failed'),
          '[]'::jsonb
        ) AS error_details
      FROM public.bulk_import_job_rows r
      WHERE r.job_id = v_job.id
    ) stats
    WHERE j.id = v_job.id;
  END LOOP;

  RETURN v_processed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_bulk_import_jobs(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.process_bulk_import_jobs(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_bulk_import_jobs(integer) FROM anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('process-bulk-import-jobs');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    PERFORM cron.schedule(
      'process-bulk-import-jobs',
      '*/1 * * * *',
      'SELECT public.process_bulk_import_jobs(500)'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_survey_results(uuid, uuid) IS
  'Returns tenant-scoped per-question survey analytics for principal/admin users.';
COMMENT ON FUNCTION public.export_survey_responses(uuid, uuid) IS
  'Returns flattened tenant-scoped survey responses for CSV export.';
COMMENT ON FUNCTION public.get_survey_summary(uuid) IS
  'Returns tenant-scoped survey summary metrics for principal/admin users.';
COMMENT ON FUNCTION public.get_finance_dashboard_page(uuid, text, text, integer, integer) IS
  'Returns paginated tenant-scoped finance invoice rows with total_count.';
COMMENT ON FUNCTION public.reconcile_invoice_payment(uuid, numeric, text, text, text) IS
  'Records invoice payments atomically with audit logging and partial-payment support.';
COMMENT ON FUNCTION public.send_invoice_reminders(uuid, uuid[]) IS
  'Creates internal reminder notifications for unpaid invoices and logs admin actions.';
COMMENT ON FUNCTION public.get_parent_dashboard_snapshot(uuid, uuid, uuid[]) IS
  'Returns a single tenant-scoped dashboard snapshot for all linked children of a parent.';
COMMENT ON FUNCTION public.get_principal_monthly_trend_cached(uuid, integer) IS
  'Returns monthly principal trend metrics aggregated server-side.';
COMMENT ON FUNCTION public.process_bulk_import_jobs(integer) IS
  'Processes pending bulk import rows in bounded batches using advisory locks.';
