-- 041_grade_levels.sql
-- Fase 1 Unit 14: tingkat / grade level (kelas 1-12 unified across SD/SMP/SMA)
--
-- Design: a single table per tenant with rows seeded from a canonical 12-row
-- catalog. This keeps grade_levels reusable across school types (SD: 1-6,
-- SMP: 7-9, SMA: 10-12, MA: 10-12) without forcing every tenant to enable
-- all 12. The `is_enabled` flag controls visibility.

CREATE TABLE IF NOT EXISTS public.grade_levels (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code        TEXT         NOT NULL,                       -- '1', '2', ..., '10', '11', '12'
    label       TEXT         NOT NULL,                       -- 'Kelas 1 SD', 'Kelas X SMA', etc.
    school_band TEXT         NOT NULL CHECK (school_band IN ('SD', 'SMP', 'SMA')),
    sort_order  INTEGER      NOT NULL,
    is_enabled  BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_grade_levels_tenant ON public.grade_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grade_levels_enabled
    ON public.grade_levels(tenant_id, sort_order) WHERE is_enabled = true;

DROP TRIGGER IF EXISTS trg_grade_levels_updated_at ON public.grade_levels;
CREATE OR REPLACE FUNCTION public.touch_grade_levels_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_grade_levels_updated_at
    BEFORE UPDATE ON public.grade_levels
    FOR EACH ROW EXECUTE FUNCTION public.touch_grade_levels_updated_at();

-- Seed canonical 12-row catalog for every existing tenant. Idempotent via
-- ON CONFLICT (tenant_id, code).
INSERT INTO public.grade_levels (tenant_id, code, label, school_band, sort_order, is_enabled)
SELECT
    t.id,
    canon.code,
    canon.label,
    canon.school_band,
    canon.sort_order,
    canon.school_band IN ('SMA')   -- default: only SMA enabled (matches dev school)
FROM public.tenants t
CROSS JOIN (
    VALUES
        ('1',  'Kelas 1 SD',   'SD',  1),
        ('2',  'Kelas 2 SD',   'SD',  2),
        ('3',  'Kelas 3 SD',   'SD',  3),
        ('4',  'Kelas 4 SD',   'SD',  4),
        ('5',  'Kelas 5 SD',   'SD',  5),
        ('6',  'Kelas 6 SD',   'SD',  6),
        ('7',  'Kelas 7 SMP',  'SMP', 7),
        ('8',  'Kelas 8 SMP',  'SMP', 8),
        ('9',  'Kelas 9 SMP',  'SMP', 9),
        ('10', 'Kelas X SMA',  'SMA', 10),
        ('11', 'Kelas XI SMA', 'SMA', 11),
        ('12', 'Kelas XII SMA','SMA', 12)
) AS canon(code, label, school_band, sort_order)
ON CONFLICT (tenant_id, code) DO NOTHING;
