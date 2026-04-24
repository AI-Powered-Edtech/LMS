-- =============================================================================
-- dev_seed.sql — SMA Nusantara Dev (Fase 0.5 synthetic tenant)
-- =============================================================================
-- Idempotent seed for the development pilot school. Designed to be run after
-- baseline.sql + all migrations against an empty (or existing) Postgres
-- instance. Re-running this file is safe — every INSERT uses ON CONFLICT or
-- WHERE NOT EXISTS guards, every entity gets a deterministic UUID derived from
-- email or slug via uuid_generate_v5 so reseeds produce identical IDs.
--
-- Reset workflow: see edusync-api/scripts/reset-dev-school.sh — it drops the
-- tenant cascade and re-runs this file.
--
-- Personas (all password = "password123", hashed with bcrypt via pgcrypto.
-- Argon2 is the production default, but pgcrypto-emitted bcrypt $2a$ hashes
-- are also accepted by edusync-api/crates/auth/src/password.rs:28 — and
-- maybe_rehash() will silently upgrade them to argon2 on first login):
--
--   admin@nusantara.dev          → ADMIN          (admin sekolah / fallback)
--   kepsek@nusantara.dev         → PRINCIPAL      (Kepala Sekolah)
--   wakasek.kurikulum@nusantara.dev → ADMIN       (Wakasek Kurikulum)
--   wakasek.kesiswaan@nusantara.dev → ADMIN       (Wakasek Kesiswaan)
--   tu@nusantara.dev             → ADMIN          (Tata Usaha)
--   bk@nusantara.dev             → TEACHER        (Guru BK)
--   wali.x-ipa-1@nusantara.dev   → TEACHER        (Wali Kelas X-IPA-1)
--   wali.x-ipa-2@nusantara.dev   → TEACHER        (Wali Kelas X-IPA-2)
--   wali.x-ips-1@nusantara.dev   → TEACHER        (Wali Kelas X-IPS-1)
--   wali.xi-ipa-1@nusantara.dev  → TEACHER        (Wali Kelas XI-IPA-1)
--   guru.matematika@nusantara.dev → TEACHER       (Guru Matematika)
--   guru.bahasa-indonesia@nusantara.dev → TEACHER (Guru B. Indonesia)
--   guru.bahasa-inggris@nusantara.dev → TEACHER   (Guru B. Inggris)
--   guru.fisika@nusantara.dev    → TEACHER        (Guru Fisika)
--   guru.biologi@nusantara.dev   → TEACHER        (Guru Biologi)
--   guru.pkn@nusantara.dev       → TEACHER        (Guru PKn)
--   siswa001@nusantara.dev .. siswa120@nusantara.dev → STUDENT (120 siswa)
--   ortu001@nusantara.dev .. ortu120@nusantara.dev   → PARENT  (120 ortu, 1:1)
--
-- Distribution across rombel (4 classes):
--   X-IPA-1  : siswa001..siswa030 (30 siswa, wali kelas wali.x-ipa-1)
--   X-IPA-2  : siswa031..siswa058 (28 siswa, wali kelas wali.x-ipa-2)
--   X-IPS-1  : siswa059..siswa084 (26 siswa, wali kelas wali.x-ips-1)
--   XI-IPA-1 : siswa085..siswa114 (30 siswa, wali kelas wali.xi-ipa-1)
--   (siswa115..siswa120 unenrolled — for testing edge cases)
--
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Stable namespace for v5 UUID derivation. Pinned constant — DO NOT change
-- once any reseed has occurred against a running DB or you will orphan IDs.
DO $$
DECLARE
  ns uuid := 'a3e5b8c1-2f4d-4d9a-8e7c-1b2d3e4f5a60';
BEGIN
  PERFORM set_config('app.dev_seed_ns', ns::text, false);
END $$;

-- Helper to materialise the namespace inside SQL expressions.
CREATE OR REPLACE FUNCTION public.dev_seed_uuid(label text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT uuid_generate_v5('a3e5b8c1-2f4d-4d9a-8e7c-1b2d3e4f5a60'::uuid, label)
$fn$;

-- ─── 1. Tenant ─────────────────────────────────────────────────────────────────

INSERT INTO public.tenants (id, name, slug, is_active, created_at, updated_at)
VALUES (
  public.dev_seed_uuid('tenant:sma-nusantara-dev'),
  'SMA Nusantara Dev',
  'sma-nusantara-dev',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = true, updated_at = now();

-- ─── 2. Staff users (16 personas) ──────────────────────────────────────────────

WITH staff(email, first_name, last_name, role) AS (
  VALUES
    ('admin@nusantara.dev',                'Admin',     'Sekolah',         'ADMIN'),
    ('kepsek@nusantara.dev',               'Bapak Drs.', 'Hartono Wijaya', 'PRINCIPAL'),
    ('wakasek.kurikulum@nusantara.dev',    'Ibu Sri',   'Mulyati',         'ADMIN'),
    ('wakasek.kesiswaan@nusantara.dev',    'Bapak Agus','Setiawan',        'ADMIN'),
    ('tu@nusantara.dev',                   'Ibu Dewi',  'Lestari',         'ADMIN'),
    ('bk@nusantara.dev',                   'Ibu Rina',  'Pratiwi',         'TEACHER'),
    ('wali.x-ipa-1@nusantara.dev',         'Bapak Budi','Santoso',         'TEACHER'),
    ('wali.x-ipa-2@nusantara.dev',         'Ibu Siti',  'Aminah',          'TEACHER'),
    ('wali.x-ips-1@nusantara.dev',         'Bapak Joko','Susilo',          'TEACHER'),
    ('wali.xi-ipa-1@nusantara.dev',        'Ibu Maya',  'Anggraini',       'TEACHER'),
    ('guru.matematika@nusantara.dev',      'Bapak Eko', 'Prasetyo',        'TEACHER'),
    ('guru.bahasa-indonesia@nusantara.dev','Ibu Nina',  'Hartati',         'TEACHER'),
    ('guru.bahasa-inggris@nusantara.dev',  'Mr. David', 'Pratama',         'TEACHER'),
    ('guru.fisika@nusantara.dev',          'Bapak Dimas','Saputra',        'TEACHER'),
    ('guru.biologi@nusantara.dev',         'Ibu Lia',   'Wulandari',       'TEACHER'),
    ('guru.pkn@nusantara.dev',             'Bapak Hadi','Nugroho',         'TEACHER')
)
INSERT INTO public.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
SELECT
  public.dev_seed_uuid('user:' || email),
  email,
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object('first_name', first_name, 'last_name', last_name, 'role', role),
  now(),
  now()
FROM staff
ON CONFLICT (email) DO UPDATE SET
  email_confirmed_at = COALESCE(public.users.email_confirmed_at, now()),
  updated_at = now();

-- ─── 3. Student + parent users (120 of each, generated) ────────────────────────

INSERT INTO public.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
SELECT
  public.dev_seed_uuid('user:siswa' || lpad(n::text, 3, '0') || '@nusantara.dev'),
  'siswa' || lpad(n::text, 3, '0') || '@nusantara.dev',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object(
    'first_name', (ARRAY['Ahmad','Siti','Budi','Rina','Agus','Dewi','Eko','Maya','Hadi','Nina'])[1 + (n % 10)],
    'last_name',  (ARRAY['Santoso','Wijaya','Pratiwi','Saputra','Hartono','Lestari','Setiawan','Anggraini','Pratama','Wulandari'])[1 + ((n / 10) % 10)],
    'role', 'STUDENT',
    'nisn', to_char(2010 + (n % 5), 'FM0000') || '0' || lpad(n::text, 6, '0')
  ),
  now(),
  now()
FROM generate_series(1, 120) n
ON CONFLICT (email) DO UPDATE SET email_confirmed_at = COALESCE(public.users.email_confirmed_at, now()), updated_at = now();

INSERT INTO public.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
SELECT
  public.dev_seed_uuid('user:ortu' || lpad(n::text, 3, '0') || '@nusantara.dev'),
  'ortu' || lpad(n::text, 3, '0') || '@nusantara.dev',
  crypt('password123', gen_salt('bf')),
  now(),
  jsonb_build_object(
    'first_name', 'Wali',
    'last_name', 'Siswa ' || lpad(n::text, 3, '0'),
    'role', 'PARENT'
  ),
  now(),
  now()
FROM generate_series(1, 120) n
ON CONFLICT (email) DO UPDATE SET email_confirmed_at = COALESCE(public.users.email_confirmed_at, now()), updated_at = now();

-- ─── 4. Profiles (1 row per user, FK to tenant) ────────────────────────────────

INSERT INTO public.profiles (id, email, first_name, last_name, tenant_id, is_active, is_demo, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  public.dev_seed_uuid('tenant:sma-nusantara-dev'),
  true,
  true,
  now(),
  now()
FROM public.users u
WHERE u.email LIKE '%@nusantara.dev'
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  tenant_id = EXCLUDED.tenant_id,
  is_demo = true,
  updated_at = now();

-- ─── 5. user_roles + tenant_memberships ────────────────────────────────────────

INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT
  u.id,
  (u.raw_user_meta_data->>'role')::public.app_role,
  public.dev_seed_uuid('tenant:sma-nusantara-dev')
FROM public.users u
WHERE u.email LIKE '%@nusantara.dev'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.id
      AND ur.tenant_id = public.dev_seed_uuid('tenant:sma-nusantara-dev')
  );

-- tenant_memberships uses TEXT role, allowing finer Indonesian role names that
-- the FE can branch on. When Fase 1 RBAC matrix lands, replace the literal
-- strings here with role IDs from the new role table.
INSERT INTO public.tenant_memberships (tenant_id, user_id, role, status, joined_at)
SELECT
  public.dev_seed_uuid('tenant:sma-nusantara-dev'),
  u.id,
  CASE
    WHEN u.email = 'kepsek@nusantara.dev'                 THEN 'principal'
    WHEN u.email = 'wakasek.kurikulum@nusantara.dev'      THEN 'wakasek_kurikulum'
    WHEN u.email = 'wakasek.kesiswaan@nusantara.dev'      THEN 'wakasek_kesiswaan'
    WHEN u.email = 'tu@nusantara.dev'                     THEN 'tu'
    WHEN u.email = 'bk@nusantara.dev'                     THEN 'guru_bk'
    WHEN u.email LIKE 'wali.%@nusantara.dev'              THEN 'wali_kelas'
    WHEN u.email LIKE 'guru.%@nusantara.dev'              THEN 'teacher'
    WHEN u.email = 'admin@nusantara.dev'                  THEN 'admin'
    WHEN u.email LIKE 'siswa%@nusantara.dev'              THEN 'student'
    WHEN u.email LIKE 'ortu%@nusantara.dev'               THEN 'parent'
    ELSE 'student'
  END,
  'active',
  now()
FROM public.users u
WHERE u.email LIKE '%@nusantara.dev'
ON CONFLICT (tenant_id, user_id) DO UPDATE SET
  role = EXCLUDED.role,
  status = 'active',
  updated_at = now();

-- ─── 6. Classes (4 rombel) ─────────────────────────────────────────────────────

INSERT INTO public.classes (id, name, teacher_id, join_code, max_students, tenant_id, created_at, updated_at)
VALUES
  (
    public.dev_seed_uuid('class:x-ipa-1'),
    'X IPA 1',
    public.dev_seed_uuid('user:wali.x-ipa-1@nusantara.dev'),
    'XIPA01', 36,
    public.dev_seed_uuid('tenant:sma-nusantara-dev'),
    now(), now()
  ),
  (
    public.dev_seed_uuid('class:x-ipa-2'),
    'X IPA 2',
    public.dev_seed_uuid('user:wali.x-ipa-2@nusantara.dev'),
    'XIPA02', 36,
    public.dev_seed_uuid('tenant:sma-nusantara-dev'),
    now(), now()
  ),
  (
    public.dev_seed_uuid('class:x-ips-1'),
    'X IPS 1',
    public.dev_seed_uuid('user:wali.x-ips-1@nusantara.dev'),
    'XIPS01', 36,
    public.dev_seed_uuid('tenant:sma-nusantara-dev'),
    now(), now()
  ),
  (
    public.dev_seed_uuid('class:xi-ipa-1'),
    'XI IPA 1',
    public.dev_seed_uuid('user:wali.xi-ipa-1@nusantara.dev'),
    'XIIPA01', 36,
    public.dev_seed_uuid('tenant:sma-nusantara-dev'),
    now(), now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  teacher_id = EXCLUDED.teacher_id,
  join_code = EXCLUDED.join_code,
  updated_at = now();

-- ─── 7. Enrollments (114 students into 4 rombel; 6 unenrolled for edge cases) ──

WITH ranges(class_label, range_lo, range_hi) AS (
  VALUES
    ('class:x-ipa-1',   1,  30),
    ('class:x-ipa-2',  31,  58),
    ('class:x-ips-1',  59,  84),
    ('class:xi-ipa-1', 85, 114)
)
INSERT INTO public.enrollments (id, class_id, student_id, status, joined_at, tenant_id)
SELECT
  public.dev_seed_uuid('enroll:' || r.class_label || ':siswa' || lpad(n::text, 3, '0')),
  public.dev_seed_uuid(r.class_label),
  public.dev_seed_uuid('user:siswa' || lpad(n::text, 3, '0') || '@nusantara.dev'),
  'ACTIVE'::public.enrollment_status,
  now() - (n || ' hours')::interval,
  public.dev_seed_uuid('tenant:sma-nusantara-dev')
FROM ranges r
CROSS JOIN LATERAL generate_series(r.range_lo, r.range_hi) n
ON CONFLICT (id) DO NOTHING;

-- ─── 8. Sample courses (4) — bound to rombel via join_code link in FE ─────────

INSERT INTO public.courses (id, title, description, created_by, tenant_id, status, created_at, updated_at)
VALUES
  (public.dev_seed_uuid('course:matematika-x'),
   'Matematika Wajib X', 'Aljabar, Trigonometri, dan Geometri Fase E (Kurmer)',
   public.dev_seed_uuid('user:guru.matematika@nusantara.dev'),
   public.dev_seed_uuid('tenant:sma-nusantara-dev'),
   'published', now(), now()),
  (public.dev_seed_uuid('course:bahasa-indonesia-x'),
   'Bahasa Indonesia X', 'Teks naratif, eksposisi, dan persuasi Fase E',
   public.dev_seed_uuid('user:guru.bahasa-indonesia@nusantara.dev'),
   public.dev_seed_uuid('tenant:sma-nusantara-dev'),
   'published', now(), now()),
  (public.dev_seed_uuid('course:fisika-x'),
   'Fisika X (IPA)', 'Mekanika dasar dan pengukuran',
   public.dev_seed_uuid('user:guru.fisika@nusantara.dev'),
   public.dev_seed_uuid('tenant:sma-nusantara-dev'),
   'published', now(), now()),
  (public.dev_seed_uuid('course:pkn-x'),
   'Pendidikan Pancasila X', 'Nilai-nilai Pancasila dan kewarganegaraan',
   public.dev_seed_uuid('user:guru.pkn@nusantara.dev'),
   public.dev_seed_uuid('tenant:sma-nusantara-dev'),
   'published', now(), now())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = now();

-- ─── 9. course_classes (link courses to rombel) ────────────────────────────────
-- Each course assigned to all 4 rombel by default (every rombel takes all 4 mapel
-- in this slim seed). Fase 1 timetable will replace this with proper JP slots.

INSERT INTO public.course_classes (course_id, class_id, tenant_id)
SELECT
  c.course_id,
  cl.class_id,
  public.dev_seed_uuid('tenant:sma-nusantara-dev')
FROM (VALUES
  (public.dev_seed_uuid('course:matematika-x')),
  (public.dev_seed_uuid('course:bahasa-indonesia-x')),
  (public.dev_seed_uuid('course:fisika-x')),
  (public.dev_seed_uuid('course:pkn-x'))
) AS c(course_id)
CROSS JOIN (VALUES
  (public.dev_seed_uuid('class:x-ipa-1')),
  (public.dev_seed_uuid('class:x-ipa-2')),
  (public.dev_seed_uuid('class:x-ips-1')),
  (public.dev_seed_uuid('class:xi-ipa-1'))
) AS cl(class_id)
ON CONFLICT DO NOTHING;

-- ─── 10. Announcements (3 sample) ──────────────────────────────────────────────

INSERT INTO public.announcements (id, tenant_id, created_by, title, content, created_at, updated_at)
VALUES
  (public.dev_seed_uuid('ann:welcome'),
   public.dev_seed_uuid('tenant:sma-nusantara-dev'),
   public.dev_seed_uuid('user:kepsek@nusantara.dev'),
   'Selamat Datang Tahun Ajaran 2026/2027',
   'Selamat datang kembali siswa-siswi SMA Nusantara Dev. Mari kita mulai semester baru dengan semangat belajar.',
   now() - interval '7 days', now() - interval '7 days'),
  (public.dev_seed_uuid('ann:p5-launch'),
   public.dev_seed_uuid('tenant:sma-nusantara-dev'),
   public.dev_seed_uuid('user:wakasek.kurikulum@nusantara.dev'),
   'Peluncuran Projek P5: Kewirausahaan',
   'Mulai minggu depan, semua kelas X akan memulai Projek Penguatan Profil Pelajar Pancasila dengan tema Kewirausahaan.',
   now() - interval '3 days', now() - interval '3 days'),
  (public.dev_seed_uuid('ann:spp-reminder'),
   public.dev_seed_uuid('tenant:sma-nusantara-dev'),
   public.dev_seed_uuid('user:tu@nusantara.dev'),
   'Pengingat Pembayaran SPP April',
   'Mohon orang tua/wali siswa untuk segera melunasi tagihan SPP bulan April sebelum tanggal 25.',
   now() - interval '1 day', now() - interval '1 day')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = now();

-- ─── 11. Cleanup helper function (used by reset-dev-school.sh) ─────────────────

CREATE OR REPLACE FUNCTION public.dev_seed_purge()
RETURNS void
LANGUAGE plpgsql
AS $fn$
DECLARE
  tid uuid := public.dev_seed_uuid('tenant:sma-nusantara-dev');
BEGIN
  -- Order matters: child tables first to avoid FK violations.
  DELETE FROM public.enrollments        WHERE tenant_id = tid;
  DELETE FROM public.course_classes     WHERE tenant_id = tid;
  DELETE FROM public.classes            WHERE tenant_id = tid;
  DELETE FROM public.courses            WHERE tenant_id = tid;
  DELETE FROM public.announcements      WHERE tenant_id = tid;
  DELETE FROM public.tenant_memberships WHERE tenant_id = tid;
  DELETE FROM public.user_roles         WHERE tenant_id = tid;
  DELETE FROM public.profiles           WHERE tenant_id = tid;
  DELETE FROM public.users              WHERE email LIKE '%@nusantara.dev';
  DELETE FROM public.tenants            WHERE id = tid;
END
$fn$;

COMMIT;

-- =============================================================================
-- TODO (deferred to later Fase units, do NOT block Fase 0.5 exit on these):
--   * lessons + assignments + quizzes per course → Fase 2 (CP/ATP tagging)
--   * attendance_records (2 weeks × 4 rombel)    → Fase 1 (timetable lands first)
--   * invoices SPP 3 bulan (60% paid)            → Fase 4 (Midtrans + finance)
--   * forum posts + discussions                  → Fase 2 (event bus)
--   * P5 project rows                            → Fase 2 (P5 module)
--   * student_dossier (NISN, NIK, alamat, wali)  → Fase 1 (dossier table)
--   * staff_dossier (NIP, NUPTK)                 → Fase 1 (dossier table)
-- =============================================================================
