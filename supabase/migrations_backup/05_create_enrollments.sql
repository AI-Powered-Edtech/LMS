-- ==========================================================================
-- Migration 05: course_enrollments table
--
-- Tujuan: Mendefinisikan relasi eksplisit antara user dan course.
-- Tanpa tabel ini, tidak ada cara resmi untuk mengetahui:
--   - Siapa saja siswa yang terdaftar di sebuah course?
--   - Apakah siswa X berhak mengakses course Y?
--   - Siapa guru yang mengajar course ini?
-- Tabel ini menjadi fondasi untuk access control, analytics, dan AI recommendation.
-- ==========================================================================

create table if not exists course_enrollments (
  id          uuid primary key default gen_random_uuid(),

  tenant_id   uuid not null references tenants(id),
  course_id   uuid not null references courses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,

  -- 'student' | 'teacher' | 'observer'
  role        text not null default 'student'
                check (role in ('student', 'teacher', 'observer')),

  enrolled_at timestamptz default now(),

  -- Satu user hanya boleh terdaftar sekali per course
  unique (user_id, course_id)
);

-- Index untuk queries utama:
-- 1. "Tampilkan semua course yang diikuti user X di tenant Y" -> sidebar siswa
create index if not exists idx_enrollments_tenant_user
  on course_enrollments (tenant_id, user_id);

-- 2. "Tampilkan semua siswa di course X" -> teacher dashboard
create index if not exists idx_enrollments_tenant_course
  on course_enrollments (tenant_id, course_id);

-- Trigger updated_at tidak diperlukan karena tabel ini adalah "append only"
-- (enrollment tidak diupdate, cukup dihapus dan dibuat ulang jika perlu)
