-- 039_academic_foundation.sql
-- Phase 1 Core Academic Foundation
-- Add new roles to app_role enum
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'PRINCIPAL';
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'WAKASEK';
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'WALI_KELAS';
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'GURU_BK';
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'TU';
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'PARENT';
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'YAYASAN';
ALTER TYPE "public"."app_role" ADD VALUE IF NOT EXISTS 'PENGAWAS';

CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_academic_years_tenant ON public.academic_years (tenant_id);

-- Refactor semesters
-- Instead of deleting 'academic_year' column right away (might break existing things during migration),
-- we add 'academic_year_id' and we can link it later or drop 'academic_year' after data migration.
ALTER TABLE public.semesters ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;
-- Let's also ensure tenant_id is indexed
CREATE INDEX IF NOT EXISTS idx_semesters_tenant ON public.semesters (tenant_id);
CREATE INDEX IF NOT EXISTS idx_semesters_ay ON public.semesters (academic_year_id);


CREATE TABLE IF NOT EXISTS public.grade_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    level_number INTEGER NOT NULL CHECK (level_number BETWEEN 1 AND 12),
    name TEXT NOT NULL,
    phase TEXT, -- e.g. 'A', 'B', 'C', 'D', 'E', 'F'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, level_number)
);
CREATE INDEX IF NOT EXISTS idx_grade_levels_tenant ON public.grade_levels (tenant_id);


CREATE TABLE IF NOT EXISTS public.rombels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name TEXT NOT NULL,
    grade_level_id UUID NOT NULL REFERENCES public.grade_levels(id),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
    wali_kelas_id UUID REFERENCES public.profiles(id), -- homeroom teacher
    max_capacity INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rombels_tenant ON public.rombels (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rombels_ay ON public.rombels (academic_year_id);
CREATE INDEX IF NOT EXISTS idx_rombels_grade ON public.rombels (grade_level_id);

CREATE TABLE IF NOT EXISTS public.rombel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rombel_id UUID NOT NULL REFERENCES public.rombels(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, rombel_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_rombel_members_tenant ON public.rombel_members (tenant_id);
CREATE INDEX IF NOT EXISTS idx_rombel_members_rombel ON public.rombel_members (rombel_id);
CREATE INDEX IF NOT EXISTS idx_rombel_members_student ON public.rombel_members (student_id);


CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'umum', -- umum, ipa, ips, p5, muatan_lokal
    phase TEXT, -- A, B, C, D, E, F
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_subjects_tenant ON public.subjects (tenant_id);

CREATE TABLE IF NOT EXISTS public.curriculum_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'CP', 'ATP', 'TP'
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_tenant ON public.curriculum_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_subject ON public.curriculum_items (subject_id);


CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    rombel_id UUID NOT NULL REFERENCES public.rombels(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_tenant ON public.timetable_slots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_rombel ON public.timetable_slots (rombel_id);


CREATE TABLE IF NOT EXISTS public.student_dossiers (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    nisn TEXT UNIQUE,
    nik TEXT UNIQUE,
    address TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_dossiers_tenant ON public.student_dossiers (tenant_id);

CREATE TABLE IF NOT EXISTS public.staff_dossiers (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    nip TEXT UNIQUE,
    nuptk TEXT UNIQUE,
    nik TEXT UNIQUE,
    address TEXT,
    certification TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_dossiers_tenant ON public.staff_dossiers (tenant_id);


