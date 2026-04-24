-- 044_timetable_slots.sql
-- Fase 1 Unit 17: jadwal pelajaran (timetable_slots)
--
-- A slot represents one JP (jam pelajaran, ~45 minutes) on a specific weekday
-- for a specific rombel. The teacher_id + subject_id pin who teaches what.
-- room_label is free-text since not all schools have a structured room
-- catalog (Fase 1 punts on rooms; Fase 5+ if needed).

CREATE TABLE IF NOT EXISTS public.timetable_slots (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    academic_year_id   UUID         REFERENCES public.academic_years(id) ON DELETE SET NULL,
    rombel_id          UUID         NOT NULL REFERENCES public.rombel(id) ON DELETE CASCADE,
    subject_id         UUID         NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teacher_id         UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    weekday            INTEGER      NOT NULL CHECK (weekday BETWEEN 1 AND 7), -- 1=Mon..7=Sun
    period_start       INTEGER      NOT NULL CHECK (period_start BETWEEN 1 AND 12), -- JP ke-N
    period_end         INTEGER      NOT NULL CHECK (period_end BETWEEN 1 AND 12),
    room_label         TEXT,
    note               TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CHECK (period_end >= period_start),
    -- One slot per (rombel, weekday, period) — no double-booking a rombel.
    UNIQUE (rombel_id, weekday, period_start, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_timetable_slots_tenant
    ON public.timetable_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_rombel_day
    ON public.timetable_slots(rombel_id, weekday);
CREATE INDEX IF NOT EXISTS idx_timetable_slots_teacher
    ON public.timetable_slots(teacher_id);

DROP TRIGGER IF EXISTS trg_timetable_slots_updated_at ON public.timetable_slots;
CREATE OR REPLACE FUNCTION public.touch_timetable_slots_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_timetable_slots_updated_at
    BEFORE UPDATE ON public.timetable_slots
    FOR EACH ROW EXECUTE FUNCTION public.touch_timetable_slots_updated_at();

-- Defensive teacher-conflict check via trigger: a teacher cannot teach two
-- rombel in the same JP slot. (Soft check — emits NOTICE on conflict so the
-- grid editor can prompt; not a hard constraint because some schools use
-- co-teaching arrangements.)
CREATE OR REPLACE FUNCTION public.check_timetable_teacher_conflict()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
    conflict_id UUID;
BEGIN
    IF NEW.teacher_id IS NULL THEN RETURN NEW; END IF;

    SELECT id INTO conflict_id
      FROM public.timetable_slots
     WHERE teacher_id = NEW.teacher_id
       AND weekday = NEW.weekday
       AND academic_year_id IS NOT DISTINCT FROM NEW.academic_year_id
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND NOT (NEW.period_end < period_start OR NEW.period_start > period_end)
     LIMIT 1;

    IF conflict_id IS NOT NULL THEN
        RAISE NOTICE 'teacher % has overlapping slot % (rombel/JP collision)', NEW.teacher_id, conflict_id;
    END IF;
    RETURN NEW;
END
$fn$;

DROP TRIGGER IF EXISTS trg_timetable_teacher_conflict ON public.timetable_slots;
CREATE TRIGGER trg_timetable_teacher_conflict
    BEFORE INSERT OR UPDATE ON public.timetable_slots
    FOR EACH ROW EXECUTE FUNCTION public.check_timetable_teacher_conflict();
