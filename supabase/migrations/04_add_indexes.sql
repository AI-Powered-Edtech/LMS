-- ==========================================================================
-- Migration 04: Composite Indexes untuk performa Query & RLS
--
-- Kenapa composite index (tenant_id, fk_id)?
-- Karena semua query dimulai dari konteks tenant. Index tunggal pada `course_id`
-- tidak cukup efisien jika RLS menambahkan filter `tenant_id` bersamaan,
-- karena PostgreSQL harus memfilter dua kolom terpisah.
-- Composite index memastikan satu B-Tree index scan untuk keduanya.
-- ==========================================================================

-- courses (sudah ada idx_courses_tenant, buat idx composite jika belum)
create index if not exists idx_courses_tenant_status
  on courses (tenant_id, status);

-- modules
-- create index if not exists idx_modules_tenant_course
  -- on modules (tenant_id, course_id);

-- lessons
create index if not exists idx_lessons_tenant_module
  on lessons (tenant_id, module_id);

-- lesson_resources
create index if not exists idx_resources_tenant_lesson
  on lesson_resources (tenant_id, lesson_id);

-- lesson_progress (kritis untuk Smart Player resume)
create index if not exists idx_progress_tenant_user
  on lesson_progress (tenant_id, user_id);

create index if not exists idx_progress_user_lesson
  on lesson_progress (user_id, lesson_id);

-- quiz_attempts
-- create index if not exists idx_quiz_attempts_tenant_user
  -- on quiz_attempts (tenant_id, user_id);

-- create index if not exists idx_quiz_attempts_quiz
  -- on quiz_attempts (quiz_id, user_id);
