-- 051_p5_module.sql
-- Fase 2 Unit 24: P5 (Projek Penguatan Profil Pelajar Pancasila)
--
-- A P5 project runs as a cross-mapel theme over weeks/months. Students
-- collaborate, get peer + self assessment, and submit a portfolio.
--
-- Tables:
--   p5_themes        : the 7 dimensi profil pelajar Pancasila + 8 tema Kemdikbud
--   p5_projects      : a tenant's instance of a project
--   p5_project_members : students participating
--   p5_assessments   : peer + self + facilitator scores per dimensi

CREATE TABLE IF NOT EXISTS public.p5_themes (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code            TEXT         NOT NULL UNIQUE,             -- 'KEWIRAUSAHAAN', 'BANGUNLAH_JIWA_RAGA', ...
    label           TEXT         NOT NULL,
    description     TEXT,
    sort_order      INTEGER      NOT NULL DEFAULT 0
);

INSERT INTO public.p5_themes (code, label, sort_order) VALUES
    ('GAYA_HIDUP_BERKELANJUTAN', 'Gaya Hidup Berkelanjutan', 1),
    ('KEARIFAN_LOKAL',           'Kearifan Lokal', 2),
    ('BHINNEKA_TUNGGAL_IKA',     'Bhinneka Tunggal Ika', 3),
    ('BANGUNLAH_JIWA_RAGA',      'Bangunlah Jiwa dan Raganya', 4),
    ('SUARA_DEMOKRASI',          'Suara Demokrasi', 5),
    ('REKAYASA_TEKNOLOGI',       'Rekayasa dan Teknologi untuk Membangun NKRI', 6),
    ('KEWIRAUSAHAAN',            'Kewirausahaan', 7),
    ('KEBEKERJAAN',              'Kebekerjaan (SMK saja)', 8)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.p5_projects (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    academic_year_id    UUID         REFERENCES public.academic_years(id) ON DELETE SET NULL,
    theme_id            UUID         REFERENCES public.p5_themes(id),
    title               TEXT         NOT NULL,
    description         TEXT,
    facilitator_id      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    starts_on           DATE,
    ends_on             DATE,
    status              TEXT         NOT NULL DEFAULT 'planned'
                                       CHECK (status IN ('planned', 'active', 'completed', 'archived')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_p5_projects_tenant ON public.p5_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_p5_projects_year ON public.p5_projects(academic_year_id);

CREATE TABLE IF NOT EXISTS public.p5_project_members (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID         NOT NULL REFERENCES public.p5_projects(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    role_in_project TEXT         DEFAULT 'member',
    joined_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (project_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_p5_project_members_student
    ON public.p5_project_members(student_id);

-- Six dimensi profil pelajar Pancasila (Kemdikbud)
DO $$ BEGIN
    CREATE TYPE public.p5_dimensi AS ENUM (
        'BERIMAN_BERTAKWA',
        'BERKEBINEKAAN_GLOBAL',
        'BERGOTONG_ROYONG',
        'MANDIRI',
        'BERNALAR_KRITIS',
        'KREATIF'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.p5_assessments (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID         NOT NULL REFERENCES public.p5_projects(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assessor_id     UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL for self
    tenant_id       UUID         NOT NULL,
    dimensi         public.p5_dimensi NOT NULL,
    descriptor      public.kurmer_descriptor NOT NULL,
    notes           TEXT,
    assessment_type TEXT         NOT NULL CHECK (assessment_type IN ('self', 'peer', 'facilitator')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_p5_assessments_project_student
    ON public.p5_assessments(project_id, student_id);
