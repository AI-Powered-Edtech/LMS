-- 069_classes_rombel_id.sql
-- Workstream B / U08.3 stage 1: link `classes` (course-instance) to `rombel`
-- (class-section). Additive, nullable, backward-compatible.
--
-- Per ADR-002: each course-instance row in `classes` is taught to ONE rombel
-- (class section). Backfill matches `classes.name` against `rombel.code` /
-- `rombel.name` within the same tenant. Dev school has 4 classes that map
-- 1:1 to 4 rombel by code.
--
-- Safety: column is NULLABLE. Old code paths that ignore `rombel_id` keep
-- working. No row deletion. No column drops. Re-runnable.

ALTER TABLE public.classes
    ADD COLUMN IF NOT EXISTS rombel_id UUID
        REFERENCES public.rombel(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_classes_rombel_id
    ON public.classes(rombel_id);

-- Backfill: match by tenant + (code | name). Only fills NULLs.
-- Strategy:
--   1. exact `classes.name = rombel.code` (e.g. "X-IPA-1")
--   2. exact `classes.name = rombel.name` (e.g. "X IPA 1")
--   3. case-insensitive contains as last resort
UPDATE public.classes c
SET    rombel_id = r.id
FROM   public.rombel r
WHERE  c.rombel_id IS NULL
  AND  c.tenant_id = r.tenant_id
  AND  (c.name = r.code OR c.name = r.name);

UPDATE public.classes c
SET    rombel_id = r.id
FROM   public.rombel r
WHERE  c.rombel_id IS NULL
  AND  c.tenant_id = r.tenant_id
  AND  lower(c.name) LIKE '%' || lower(r.code) || '%';

-- Observability: emit a NOTICE with backfill stats so migration logs show
-- coverage without failing the migration when some rows remain unmapped
-- (e.g. legacy course-instances created before rombel existed).
DO $$
DECLARE
    total INT;
    mapped INT;
BEGIN
    SELECT count(*) INTO total FROM public.classes;
    SELECT count(*) INTO mapped FROM public.classes WHERE rombel_id IS NOT NULL;
    RAISE NOTICE 'migration 069: classes.rombel_id backfilled %/% rows', mapped, total;
END $$;
