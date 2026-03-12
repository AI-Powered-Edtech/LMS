-- ==========================================================================
-- Migration 06: RLS Policies + Feature Toggle Helper
--
-- PRINSIP:
--   1. Semua tabel menggunakan tenant_id = auth.jwt() ->> 'tenant_id' untuk isolasi
--   2. Ownership (created_by) dipastikan untuk write operations
--   3. Student hanya bisa akses course yang mereka enrolled
--   4. Teacher hanya bisa manage course yang mereka buat
--   5. has_feature() dipakai di policy tabel yang memerlukan feature toggle
-- ==========================================================================

-- --------------------------------------------------------------------------
-- HELPER FUNCTION: has_feature
-- Dipakai oleh RLS policies, menghindari JSONB extraction yang berulang
-- --------------------------------------------------------------------------
create or replace function has_feature(feature text)
returns boolean
language sql stable
as $$
  select
    (auth.jwt() -> 'app_metadata' -> 'features') ? feature;
$$;

-- --------------------------------------------------------------------------
-- ENABLE RLS
-- --------------------------------------------------------------------------
alter table courses          enable row level security;
alter table modules          enable row level security;
alter table lessons          enable row level security;
alter table lesson_resources enable row level security;
alter table lesson_progress  enable row level security;
alter table course_enrollments enable row level security;
alter table quiz_attempts    enable row level security;

-- --------------------------------------------------------------------------
-- COURSES
-- --------------------------------------------------------------------------

-- Siswa & Guru: bisa melihat course yang published di tenant mereka
create policy "courses_select_tenant"
  on courses for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and status = 'published'
  );

-- Guru & Admin: bisa melihat semua course (termasuk draft) milik tenant
create policy "courses_select_own_tenant_admin"
  on courses for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

-- Teacher: hanya bisa insert course untuk tenant mereka sendiri
create policy "courses_insert_teacher"
  on courses for insert
  with check (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
    and created_by = auth.uid()
  );

-- Teacher: hanya bisa update course yang mereka buat
create policy "courses_update_owner"
  on courses for update
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and created_by = auth.uid()
  );

-- Teacher: hanya bisa delete course yang mereka buat
create policy "courses_delete_owner"
  on courses for delete
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and created_by = auth.uid()
  );

-- --------------------------------------------------------------------------
-- MODULES
-- --------------------------------------------------------------------------

create policy "modules_select_tenant"
  on modules for select
  using (tenant_id::text = auth.jwt() ->> 'tenant_id');

create policy "modules_insert_teacher"
  on modules for insert
  with check (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

create policy "modules_update_teacher"
  on modules for update
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

create policy "modules_delete_teacher"
  on modules for delete
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

-- --------------------------------------------------------------------------
-- LESSONS
-- --------------------------------------------------------------------------

create policy "lessons_select_tenant"
  on lessons for select
  using (tenant_id::text = auth.jwt() ->> 'tenant_id');

create policy "lessons_insert_teacher"
  on lessons for insert
  with check (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

create policy "lessons_update_teacher"
  on lessons for update
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

create policy "lessons_delete_teacher"
  on lessons for delete
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

-- --------------------------------------------------------------------------
-- LESSON RESOURCES
-- --------------------------------------------------------------------------

create policy "lesson_resources_select_tenant"
  on lesson_resources for select
  using (tenant_id::text = auth.jwt() ->> 'tenant_id');

create policy "lesson_resources_insert_teacher"
  on lesson_resources for insert
  with check (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

create policy "lesson_resources_update_teacher"
  on lesson_resources for update
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

create policy "lesson_resources_delete_teacher"
  on lesson_resources for delete
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

-- --------------------------------------------------------------------------
-- LESSON PROGRESS (Smart Player)
-- --------------------------------------------------------------------------

-- Siswa: hanya bisa lihat progress mereka sendiri
create policy "lesson_progress_select_own"
  on lesson_progress for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and user_id = auth.uid()
  );

-- Guru/Admin: bisa lihat semua progress di tenant mereka (untuk analytics)
create policy "lesson_progress_select_teacher"
  on lesson_progress for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

-- Siswa: hanya bisa insert progress mereka sendiri
create policy "lesson_progress_insert_own"
  on lesson_progress for insert
  with check (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and user_id = auth.uid()
  );

-- Siswa: hanya bisa update progress mereka sendiri
create policy "lesson_progress_update_own"
  on lesson_progress for update
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and user_id = auth.uid()
  );

-- --------------------------------------------------------------------------
-- COURSE ENROLLMENTS
-- --------------------------------------------------------------------------

-- Siswa: bisa lihat enrollment mereka sendiri
create policy "enrollments_select_own"
  on course_enrollments for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and user_id = auth.uid()
  );

-- Teacher/Admin: bisa lihat semua enrollment di tenant mereka
create policy "enrollments_select_teacher"
  on course_enrollments for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
  );

-- Admin: hanya admin yang bisa enroll siswa
create policy "enrollments_insert_admin"
  on course_enrollments for insert
  with check (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' = 'ADMIN'
  );

-- Admin: hanya admin yang bisa menghapus enrollment
create policy "enrollments_delete_admin"
  on course_enrollments for delete
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' = 'ADMIN'
  );

-- --------------------------------------------------------------------------
-- QUIZ ATTEMPTS (Memerlukan Feature Toggle)
-- --------------------------------------------------------------------------

-- Siswa: bisa lihat result quiz mereka sendiri (hanya jika fitur quiz aktif)
create policy "quiz_attempts_select_own"
  on quiz_attempts for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and user_id = auth.uid()
    and has_feature('quiz')
  );

-- Siswa: bisa submit quiz (hanya jika fitur quiz aktif)
create policy "quiz_attempts_insert_student"
  on quiz_attempts for insert
  with check (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and user_id = auth.uid()
    and has_feature('quiz')
  );

-- Teacher: bisa lihat semua quiz attempts di tenant mereka
create policy "quiz_attempts_select_teacher"
  on quiz_attempts for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and auth.jwt() ->> 'role' in ('TEACHER', 'ADMIN')
    and has_feature('quiz')
  );
