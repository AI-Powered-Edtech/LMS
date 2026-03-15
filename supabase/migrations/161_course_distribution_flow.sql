-- Migration: 16_course_distribution_flow.sql
-- Description: Introduces course_enrollments (if missing), course_classes, and auto-enrollment logic.

-- 1. Create course_enrollments if it doesn't exist (Fixing missing table from migration 05)
create table if not exists public.course_enrollments (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id),
  course_id   uuid not null references public.courses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'student' check (role in ('student', 'teacher', 'observer')),
  enrolled_at timestamptz default now(),
  unique (user_id, course_id)
);

create index if not exists idx_enrollments_tenant_user on public.course_enrollments (tenant_id, user_id);
create index if not exists idx_enrollments_tenant_course on public.course_enrollments (tenant_id, course_id);

alter table public.course_enrollments enable row level security;

-- Policies for course_enrollments (Re-implementing from 06 if needed)
drop policy if exists "enrollments_select_own" on public.course_enrollments;
create policy "enrollments_select_own"
  on public.course_enrollments for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and user_id = auth.uid()
  );

drop policy if exists "enrollments_select_teacher" on public.course_enrollments;
create policy "enrollments_select_teacher"
  on public.course_enrollments for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id'
    and (auth.jwt() ->> 'role' = 'TEACHER' or auth.jwt() ->> 'role' = 'ADMIN')
  );

-- 2. Create course_classes table
create table if not exists public.course_classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  course_id uuid not null references public.courses(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz default now(),
  unique(course_id, class_id)
);

create index if not exists idx_course_classes_course on public.course_classes(course_id);
create index if not exists idx_course_classes_class on public.course_classes(class_id);
create index if not exists idx_course_classes_tenant on public.course_classes(tenant_id);

alter table public.course_classes enable row level security;

-- Policies for course_classes
drop policy if exists "Users can view course_classes for their tenant" on public.course_classes;
create policy "Users can view course_classes for their tenant"
  on public.course_classes for select
  using ( tenant_id::text = auth.jwt() ->> 'tenant_id' );

drop policy if exists "Teachers and Admins can insert course_classes" on public.course_classes;
create policy "Teachers and Admins can insert course_classes"
  on public.course_classes for insert
  with check ( 
    tenant_id::text = auth.jwt() ->> 'tenant_id' and
    (auth.jwt() ->> 'role' = 'TEACHER' or auth.jwt() ->> 'role' = 'ADMIN')
  );

drop policy if exists "Teachers and Admins can delete course_classes" on public.course_classes;
create policy "Teachers and Admins can delete course_classes"
  on public.course_classes for delete
  using ( 
    tenant_id::text = auth.jwt() ->> 'tenant_id' and
    (auth.jwt() ->> 'role' = 'TEACHER' or auth.jwt() ->> 'role' = 'ADMIN')
  );

-- 3. Auto-Enrollment Triggers
create or replace function public.handle_course_assigned_to_class()
returns trigger as $$
begin
  insert into public.course_enrollments (tenant_id, course_id, user_id, role)
  select NEW.tenant_id, NEW.course_id, e.student_id, 'student'
  from public.enrollments e
  where e.class_id = NEW.class_id
    and e.status = 'ACTIVE'
  on conflict (user_id, course_id) do nothing;
  
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_course_class_inserted on public.course_classes;
create trigger on_course_class_inserted
  after insert on public.course_classes
  for each row execute function public.handle_course_assigned_to_class();

create or replace function public.handle_student_joined_class()
returns trigger as $$
begin
  if NEW.status = 'ACTIVE' then
    insert into public.course_enrollments (tenant_id, course_id, user_id, role)
    select NEW.tenant_id, cc.course_id, NEW.student_id, 'student'
    from public.course_classes cc
    where cc.class_id = NEW.class_id
    on conflict (user_id, course_id) do nothing;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists on_enrollment_inserted on public.enrollments;
create trigger on_enrollment_inserted
  after insert on public.enrollments
  for each row execute function public.handle_student_joined_class();

drop trigger if exists on_enrollment_updated on public.enrollments;
create trigger on_enrollment_updated
  after update of status on public.enrollments
  for each row 
  when (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'ACTIVE')
  execute function public.handle_student_joined_class();

-- 4. Secure Course Visibility
drop policy if exists "Users can view courses" on public.courses;
create policy "Users can view courses"
  on public.courses for select
  using (
    tenant_id::text = auth.jwt() ->> 'tenant_id' 
    and (
      (auth.jwt() ->> 'role' = 'TEACHER' or auth.jwt() ->> 'role' = 'ADMIN')
      or 
      exists (
        select 1 from public.course_enrollments ce 
        where ce.course_id = courses.id 
        and ce.user_id = auth.uid()
      )
    )
  );
