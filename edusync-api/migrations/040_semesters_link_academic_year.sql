-- 040_semesters_link_academic_year.sql
-- Fase 1 Unit 13: link semesters to academic_years
--
-- Existing schema stores tahun-ajaran as a TEXT column on semesters
-- (e.g. "2026/2027"). We add a proper FK to public.academic_years and
-- backfill via the text label match. The text column is retained as
-- read-only for backward compatibility — FE can drop it once all callers
-- migrate to academic_year_id.

ALTER TABLE public.semesters
    ADD COLUMN IF NOT EXISTS academic_year_id UUID
        REFERENCES public.academic_years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_semesters_academic_year_id
    ON public.semesters(academic_year_id);

-- Backfill: match semesters.academic_year (TEXT) to academic_years.label.
-- If a tenant has a semester referencing a label that no academic_year row
-- exists for, we leave academic_year_id NULL and emit a NOTICE so the
-- operator can create the missing academic_year row before relying on the
-- new FK.
DO $$
DECLARE
    rec RECORD;
    matched UUID;
    missing_count INT := 0;
BEGIN
    FOR rec IN
        SELECT id, tenant_id, academic_year
          FROM public.semesters
         WHERE academic_year_id IS NULL
    LOOP
        SELECT id INTO matched
          FROM public.academic_years
         WHERE tenant_id = rec.tenant_id
           AND label = rec.academic_year
         LIMIT 1;

        IF matched IS NOT NULL THEN
            UPDATE public.semesters
               SET academic_year_id = matched, updated_at = now()
             WHERE id = rec.id;
        ELSE
            missing_count := missing_count + 1;
        END IF;
    END LOOP;

    IF missing_count > 0 THEN
        RAISE NOTICE
            '% semester rows could not be linked to an academic_year. Create the matching academic_years rows then re-run UPDATE on semesters.',
            missing_count;
    END IF;
END
$$;
