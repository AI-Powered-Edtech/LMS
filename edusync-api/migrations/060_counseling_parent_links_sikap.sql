-- 060_counseling_parent_links_sikap.sql
-- Sikap & BK module + parent-child linking (gap-analysis A:P1, dependency for Fase 4 parent flow).

-- ─── Parent ↔ Student linking ──────────────────────────────────────────────────
-- 1:N relation (1 student can have multiple parents/guardians; 1 parent can
-- have multiple children). Used by parent dashboard and notification fan-out.
CREATE TABLE IF NOT EXISTS public.parent_student_links (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    parent_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relation        TEXT         NOT NULL DEFAULT 'wali'
                                  CHECK (relation IN ('ayah', 'ibu', 'wali')),
    is_primary      BOOLEAN      NOT NULL DEFAULT false,
    receive_notifications BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_student_links_parent
    ON public.parent_student_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_links_student
    ON public.parent_student_links(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_parent_primary_per_student
    ON public.parent_student_links(student_id) WHERE is_primary = true;

-- ─── Counseling notes (Guru BK) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.counseling_notes (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    counselor_id    UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_date    DATE         NOT NULL DEFAULT current_date,
    category        TEXT         NOT NULL CHECK (category IN
                                    ('akademik', 'pribadi', 'sosial', 'karier', 'pelanggaran', 'lainnya')),
    summary         TEXT         NOT NULL,
    follow_up       TEXT,
    is_confidential BOOLEAN      NOT NULL DEFAULT true,
    parent_notified BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_counseling_notes_student_date
    ON public.counseling_notes(student_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_counseling_notes_counselor
    ON public.counseling_notes(counselor_id);
CREATE INDEX IF NOT EXISTS idx_counseling_notes_category
    ON public.counseling_notes(tenant_id, category);

DROP TRIGGER IF EXISTS trg_counseling_notes_updated_at ON public.counseling_notes;
CREATE OR REPLACE FUNCTION public.touch_counseling_notes_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_counseling_notes_updated_at
    BEFORE UPDATE ON public.counseling_notes
    FOR EACH ROW EXECUTE FUNCTION public.touch_counseling_notes_updated_at();

-- ─── Sikap records (penilaian sikap by wali kelas) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.sikap_records (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id     UUID         REFERENCES public.semesters(id) ON DELETE SET NULL,
    rombel_id       UUID         REFERENCES public.rombel(id) ON DELETE SET NULL,
    aspect          TEXT         NOT NULL CHECK (aspect IN ('sikap_spiritual', 'sikap_sosial')),
    descriptor      public.kurmer_descriptor NOT NULL,
    deskripsi       TEXT,
    recorded_by     UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (student_id, semester_id, aspect)
);

CREATE INDEX IF NOT EXISTS idx_sikap_records_student
    ON public.sikap_records(student_id);

-- ─── Auto-link parents to siswa from dev_seed (idempotent backfill) ──────────
-- siswa001@nusantara.dev ↔ ortu001@nusantara.dev, etc.
DO $$
DECLARE
    tid uuid := public.dev_seed_uuid('tenant:sma-nusantara-dev');
BEGIN
    -- Only run if dev_seed_uuid function exists (i.e., dev_seed.sql has been applied).
    INSERT INTO public.parent_student_links (tenant_id, parent_id, student_id, relation, is_primary)
    SELECT
        tid,
        public.dev_seed_uuid('user:ortu' || lpad(n::text, 3, '0') || '@nusantara.dev'),
        public.dev_seed_uuid('user:siswa' || lpad(n::text, 3, '0') || '@nusantara.dev'),
        'wali',
        true
    FROM generate_series(1, 120) n
    WHERE EXISTS (SELECT 1 FROM public.profiles WHERE id = public.dev_seed_uuid('user:siswa' || lpad(n::text, 3, '0') || '@nusantara.dev'))
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = public.dev_seed_uuid('user:ortu' || lpad(n::text, 3, '0') || '@nusantara.dev'))
    ON CONFLICT (parent_id, student_id) DO NOTHING;
EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'dev_seed_uuid not available — skip backfill';
WHEN OTHERS THEN
    RAISE NOTICE 'parent_student_links backfill skipped: %', SQLERRM;
END $$;

-- ─── RPC: get_my_children (used by parent dashboard) ──────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_children_v2(p_parent_id UUID)
RETURNS json
LANGUAGE sql STABLE AS $fn$
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
        SELECT
            p.id, p.email, p.full_name,
            l.relation, l.is_primary, l.receive_notifications,
            (SELECT json_build_object(
                'rombel_id', rm.rombel_id,
                'rombel_name', r.name
              )
              FROM public.rombel_members rm
              JOIN public.rombel r ON r.id = rm.rombel_id
              WHERE rm.student_id = p.id AND rm.left_at IS NULL
              LIMIT 1
            ) AS rombel
        FROM public.parent_student_links l
        JOIN public.profiles p ON p.id = l.student_id
        WHERE l.parent_id = p_parent_id
        ORDER BY l.is_primary DESC, p.full_name
    ) t
$fn$;

GRANT EXECUTE ON FUNCTION public.get_my_children_v2(UUID) TO PUBLIC;
