-- ==========================================================================
-- Migration 03: Add tenant_id to hierarki tabel konten LMS
--
-- Masalah sebelumnya: `modules`, `lessons`, dan `lesson_resources` tidak memiliki
-- tenant_id langsung. Ini memaksa setiap query untuk JOIN ke `courses` untuk
-- mendapatkan tenant_id, yang lambat dan mempersulit RLS Policy.
--
-- Solusi: Denormalisasikan tenant_id ke setiap layer hierarki konten.
-- ==========================================================================

-- 1. modules
alter table modules
  add column if not exists tenant_id uuid not null
    references tenants(id);

-- 2. lessons
alter table lessons
  add column if not exists tenant_id uuid not null
    references tenants(id);

-- 3. lesson_resources
alter table lesson_resources
  add column if not exists tenant_id uuid not null
    references tenants(id);

-- 4. quiz_attempts (sebelumnya tidak ada tenant_id)
alter table quiz_attempts
  add column if not exists tenant_id uuid not null
    references tenants(id);

-- Trigger: auto-set updated_at pada semua tabel yang relevan
-- (Diasumsikan fungsi update_updated_at_column() sudah ada dari migrasi sebelumnya)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_modules_updated_at
  before update on modules
  for each row execute function update_updated_at_column();

create trigger trg_lessons_updated_at
  before update on lessons
  for each row execute function update_updated_at_column();

create trigger trg_lesson_resources_updated_at
  before update on lesson_resources
  for each row execute function update_updated_at_column();
