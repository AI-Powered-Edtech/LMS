-- 037_seed_modules_missing_rpcs_and_auth_uid.sql
-- Addresses QA-Dev Loop backlog (run 2026-04-23):
--   1. auth.uid() function missing -> existing RPCs get_tenant_users, get_audit_logs fail (500)
--   2. modules / tenant_modules empty -> admin/feature-flags/administration show "Konfigurasi modul belum lengkap"
--   3. Missing analytics RPCs: get_tenant_activity_counts, get_course_engagement, get_activity_timeline
-- Rules: RETURNS json (not TABLE), read tenant via current_setting('request.jwt.claim.sub') or p_tenant_id,
-- pgcrypto for gen_random_bytes/gen_random_uuid.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;

-- ------------------------------------------------------------------
-- 1) auth.uid() stub backed by request.jwt.claim.sub (set by data_plane.rs)
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;

-- ------------------------------------------------------------------
-- 2) Seed core modules for Demo Tenant (trigger fans them out to every tenant)
-- ------------------------------------------------------------------
DO $seed$
DECLARE
  v_demo uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.modules (slug, name, description, is_core, api_enabled_default, tenant_id)
  VALUES
    ('gradebook',        'Gradebook',         'Nilai & rapor siswa',                          true,  true,  v_demo),
    ('assignments',      'Assignments',       'Tugas siswa',                                  true,  true,  v_demo),
    ('quiz',             'Quiz',              'Kuis dan ujian',                               true,  true,  v_demo),
    ('calendar',         'Kalender',          'Jadwal kelas & tenggat',                       true,  true,  v_demo),
    ('announcements',    'Pengumuman',        'Pengumuman tenant & kelas',                    true,  true,  v_demo),
    ('directory',        'Direktori',         'Direktori pengguna & kelas',                   true,  true,  v_demo),
    ('attendance',       'Absensi',           'Pencatatan kehadiran',                         true,  true,  v_demo),
    ('analytics',        'Analitik',          'Dasbor analitik pembelajaran',                 true,  true,  v_demo),
    ('documents',        'Dokumen',           'Dokumen sekolah',                              false, true,  v_demo),
    ('forum',            'Forum',             'Diskusi kelas',                                false, true,  v_demo),
    ('ai-creator',       'AI Creator',        'Pembuat konten berbasis AI',                   false, true,  v_demo),
    ('speed-grader',     'Speed Grader',      'Penilaian cepat tugas',                        false, true,  v_demo),
    ('group-assignment', 'Tugas Kelompok',    'Tugas kelompok & peer review',                 false, true,  v_demo),
    ('ppdb',             'PPDB',              'Penerimaan peserta didik baru',                false, false, v_demo),
    ('finance',          'Keuangan',          'Tagihan & pembayaran',                         false, false, v_demo),
    ('feature-flags',    'Feature Flags',     'Manajemen feature flag tenant',                true,  true,  v_demo),
    ('system-health',    'System Health',     'Status layanan',                               true,  true,  v_demo),
    ('question-bank',    'Bank Soal',         'Repositori soal & opsi',                       false, true,  v_demo),
    ('audit-logs',       'Audit Logs',        'Log aktivitas admin',                          true,  true,  v_demo),
    ('administration',   'Administrasi',      'Konfigurasi tenant',                           true,  true,  v_demo)
  ON CONFLICT (slug) DO NOTHING;
END
$seed$;

-- Belt-and-suspenders: ensure Demo Tenant has rows for every module
-- (in case the trigger fired before a tenant existed, or seed was partial).
INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
SELECT t.id, m.id, CASE WHEN m.is_core THEN true ELSE m.api_enabled_default END
FROM public.tenants t
CROSS JOIN public.modules m
ON CONFLICT (tenant_id, module_id) DO NOTHING;

-- ------------------------------------------------------------------
-- 3) Missing analytics RPCs (called from src/features/analytics/api/analyticsQueries.ts)
-- ------------------------------------------------------------------

-- get_tenant_activity_counts(p_tenant_id uuid, p_days integer) -> json of {event_type, count}
DROP FUNCTION IF EXISTS public.get_tenant_activity_counts(uuid, integer);
CREATE OR REPLACE FUNCTION public.get_tenant_activity_counts(
  p_tenant_id uuid,
  p_days      integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_days   int := GREATEST(COALESCE(p_days, 7), 1);
  v_rows   json;
BEGIN
  v_tenant := COALESCE(
    p_tenant_id,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
  IF v_tenant IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(row_to_json(t.*)) INTO v_rows FROM (
    SELECT ae.event_type::text AS event_type,
           COUNT(*)::int       AS count
    FROM public.activity_events ae
    WHERE ae.tenant_id = v_tenant
      AND ae.created_at >= now() - make_interval(days => v_days)
    GROUP BY ae.event_type
    ORDER BY count DESC
  ) t;

  RETURN COALESCE(v_rows, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_tenant_activity_counts(uuid, integer) TO PUBLIC;

-- get_course_engagement(p_tenant_id uuid) -> json rows
-- course_stats has schema (completed_lessons, completed_assignments, quiz_attempts, avg_score);
-- the FE expects (total_enrolled, active_students, avg_progress, avg_quiz_score), so we derive on the fly.
DROP FUNCTION IF EXISTS public.get_course_engagement(uuid);
CREATE OR REPLACE FUNCTION public.get_course_engagement(
  p_tenant_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_rows   json;
BEGIN
  v_tenant := COALESCE(
    p_tenant_id,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
  IF v_tenant IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(row_to_json(t.*)) INTO v_rows FROM (
    SELECT c.id                           AS course_id,
           c.title                        AS course_name,
           COALESCE(enr.total, 0)::int    AS total_enrolled,
           COALESCE(active.active, 0)::int AS active_students,
           COALESCE(cs.completed_lessons::float / NULLIF(enr.total, 0), 0)::float AS avg_progress,
           COALESCE(cs.avg_score, 0)::float AS avg_quiz_score
    FROM public.courses c
    LEFT JOIN public.course_stats cs
      ON cs.tenant_id = c.tenant_id AND cs.course_id = c.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total
      FROM public.course_enrollments ce
      WHERE ce.course_id = c.id
    ) enr ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT ae.user_id)::int AS active
      FROM public.activity_events ae
      WHERE ae.course_id = c.id
        AND ae.created_at >= now() - interval '30 days'
    ) active ON true
    WHERE c.tenant_id = v_tenant
    ORDER BY total_enrolled DESC, course_name ASC
    LIMIT 50
  ) t;

  RETURN COALESCE(v_rows, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_course_engagement(uuid) TO PUBLIC;

-- get_activity_timeline(p_tenant_id uuid, p_days integer) -> json of {date, lesson_views, assignment_submissions, quiz_attempts}
DROP FUNCTION IF EXISTS public.get_activity_timeline(uuid, integer);
CREATE OR REPLACE FUNCTION public.get_activity_timeline(
  p_tenant_id uuid,
  p_days      integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_days   int := LEAST(GREATEST(COALESCE(p_days, 30), 1), 365);
  v_rows   json;
BEGIN
  v_tenant := COALESCE(
    p_tenant_id,
    (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
  IF v_tenant IS NULL THEN
    RETURN '[]'::json;
  END IF;

  SELECT json_agg(row_to_json(t.*)) INTO v_rows FROM (
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
           COALESCE(SUM(CASE WHEN ae.event_type::text IN ('LESSON_VIEWED','LESSON_COMPLETED')       THEN 1 ELSE 0 END), 0)::int AS lesson_views,
           COALESCE(SUM(CASE WHEN ae.event_type::text = 'ASSIGNMENT_SUBMITTED'                      THEN 1 ELSE 0 END), 0)::int AS assignment_submissions,
           COALESCE(SUM(CASE WHEN ae.event_type::text IN ('QUIZ_STARTED','QUIZ_SUBMITTED','QUIZ_COMPLETED','QUIZ_PASSED') THEN 1 ELSE 0 END), 0)::int AS quiz_attempts
    FROM generate_series(
           (current_date - (v_days - 1))::date,
           current_date::date,
           interval '1 day'
         ) AS d(day)
    LEFT JOIN public.activity_events ae
      ON ae.tenant_id = v_tenant
     AND ae.created_at >= d.day
     AND ae.created_at <  d.day + interval '1 day'
    GROUP BY d.day
    ORDER BY d.day
  ) t;

  RETURN COALESCE(v_rows, '[]'::json);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_activity_timeline(uuid, integer) TO PUBLIC;

COMMIT;
