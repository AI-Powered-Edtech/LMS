-- 043_subjects_and_curriculum_items.sql
-- Fase 1 Unit 16: mata pelajaran (subjects) + capaian pembelajaran (curriculum_items)
--
-- subjects: catalog of mapel offered by a tenant. Bound to grade_level via
-- a many-to-many association table (subject_grade_offerings) because a
-- mapel like "Matematika Wajib" can be offered at kelas X, XI, and XII with
-- distinct CP per phase.
--
-- curriculum_items: hierarchical CP/ATP tree. Top-level = CP (capaian
-- pembelajaran). Children = ATP (alur tujuan pembelajaran). Each row has a
-- self-referential parent_id; depth is unbounded but UI typically renders
-- 2 levels (CP → ATP).

CREATE TABLE IF NOT EXISTS public.subjects (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code            TEXT         NOT NULL,                    -- 'MAT-WAJIB', 'BIN', 'BIO', ...
    name            TEXT         NOT NULL,                    -- 'Matematika Wajib'
    school_band     TEXT         NOT NULL CHECK (school_band IN ('SD', 'SMP', 'SMA')),
    is_kurmer_phase TEXT         CHECK (is_kurmer_phase IN ('A','B','C','D','E','F') OR is_kurmer_phase IS NULL),
    description     TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_subjects_tenant ON public.subjects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subjects_active
    ON public.subjects(tenant_id) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.subject_grade_offerings (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subject_id      UUID         NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    grade_level_id  UUID         NOT NULL REFERENCES public.grade_levels(id) ON DELETE CASCADE,
    weekly_jp       INTEGER      NOT NULL DEFAULT 2,          -- jam pelajaran per minggu
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (subject_id, grade_level_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_grade_offerings_tenant
    ON public.subject_grade_offerings(tenant_id);

CREATE TABLE IF NOT EXISTS public.curriculum_items (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    subject_id      UUID         NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    grade_level_id  UUID         REFERENCES public.grade_levels(id) ON DELETE SET NULL,
    parent_id       UUID         REFERENCES public.curriculum_items(id) ON DELETE CASCADE,
    code            TEXT         NOT NULL,                    -- 'CP-1', 'ATP-1.1', ...
    item_type       TEXT         NOT NULL CHECK (item_type IN ('CP', 'ATP', 'TP')),
    title           TEXT         NOT NULL,
    description     TEXT,
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, subject_id, code)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_items_subject ON public.curriculum_items(subject_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_parent ON public.curriculum_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_items_tenant ON public.curriculum_items(tenant_id);

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE OR REPLACE FUNCTION public.touch_subjects_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_subjects_updated_at
    BEFORE UPDATE ON public.subjects
    FOR EACH ROW EXECUTE FUNCTION public.touch_subjects_updated_at();

DROP TRIGGER IF EXISTS trg_curriculum_items_updated_at ON public.curriculum_items;
CREATE OR REPLACE FUNCTION public.touch_curriculum_items_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_curriculum_items_updated_at
    BEFORE UPDATE ON public.curriculum_items
    FOR EACH ROW EXECUTE FUNCTION public.touch_curriculum_items_updated_at();
