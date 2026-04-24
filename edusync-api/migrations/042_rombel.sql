-- 042_rombel.sql
-- Fase 1 Unit 15: rombel (rombongan belajar / class section) — additive
--
-- AUTHORITATIVE DECISION (per SUPERBATCH_CLOUD_AGENT.md §2):
-- "additive `rombel` table, zero-downtime". The existing `classes` table is
-- preserved as "course-instance" (a teacher's class for a specific course);
-- `rombel` is the new "class-section" concept (X-IPA-1 with one wali_kelas
-- and a fixed cohort of students for the entire academic year). Eventually
-- a rombel groups multiple classes (one per mata pelajaran).

CREATE TABLE IF NOT EXISTS public.rombel (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    academic_year_id   UUID         REFERENCES public.academic_years(id) ON DELETE SET NULL,
    grade_level_id     UUID         REFERENCES public.grade_levels(id) ON DELETE SET NULL,
    code               TEXT         NOT NULL,                  -- 'X-IPA-1'
    name               TEXT         NOT NULL,                  -- 'X IPA 1'
    wali_kelas_id      UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    capacity           INTEGER      NOT NULL DEFAULT 36,
    status             TEXT         NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active', 'archived')),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, academic_year_id, code)
);

CREATE INDEX IF NOT EXISTS idx_rombel_tenant ON public.rombel(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rombel_wali_kelas ON public.rombel(wali_kelas_id);
CREATE INDEX IF NOT EXISTS idx_rombel_year ON public.rombel(academic_year_id);

CREATE TABLE IF NOT EXISTS public.rombel_members (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rombel_id   UUID         NOT NULL REFERENCES public.rombel(id) ON DELETE CASCADE,
    student_id  UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id   UUID         NOT NULL,
    joined_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    left_at     TIMESTAMPTZ,

    UNIQUE (rombel_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_rombel_members_student ON public.rombel_members(student_id);
CREATE INDEX IF NOT EXISTS idx_rombel_members_active
    ON public.rombel_members(rombel_id) WHERE left_at IS NULL;

DROP TRIGGER IF EXISTS trg_rombel_updated_at ON public.rombel;
CREATE OR REPLACE FUNCTION public.touch_rombel_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_rombel_updated_at
    BEFORE UPDATE ON public.rombel
    FOR EACH ROW EXECUTE FUNCTION public.touch_rombel_updated_at();

-- RPC: enroll student into rombel (refuses if rombel is at capacity).
CREATE OR REPLACE FUNCTION public.enroll_rombel_member(
    p_rombel_id UUID,
    p_student_id UUID
)
RETURNS public.rombel_members
LANGUAGE plpgsql
AS $fn$
DECLARE
    r public.rombel;
    member_count INT;
    new_member public.rombel_members;
BEGIN
    SELECT * INTO r FROM public.rombel WHERE id = p_rombel_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'rombel not found' USING ERRCODE = 'P0002';
    END IF;
    IF r.status <> 'active' THEN
        RAISE EXCEPTION 'rombel not active' USING ERRCODE = 'P0003';
    END IF;

    SELECT COUNT(*) INTO member_count
      FROM public.rombel_members
     WHERE rombel_id = p_rombel_id AND left_at IS NULL;

    IF member_count >= r.capacity THEN
        RAISE EXCEPTION 'rombel at capacity (%)', r.capacity USING ERRCODE = 'P0004';
    END IF;

    INSERT INTO public.rombel_members (rombel_id, student_id, tenant_id)
    VALUES (p_rombel_id, p_student_id, r.tenant_id)
    ON CONFLICT (rombel_id, student_id) DO UPDATE SET left_at = NULL
    RETURNING * INTO new_member;

    RETURN new_member;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.enroll_rombel_member(UUID, UUID) TO PUBLIC;
