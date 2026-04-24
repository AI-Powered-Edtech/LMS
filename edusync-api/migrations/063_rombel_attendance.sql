-- 063_rombel_attendance.sql
-- Daily attendance per rombel × tanggal (deferred from Fase 0.5 dev_seed.sql).
--
-- The existing public.attendance_records table is per-class (course-instance).
-- This adds a rombel-scoped layer where wali kelas marks daily presence in
-- one batch — the standard Indonesian school flow (absen pagi).

CREATE TABLE IF NOT EXISTS public.rombel_attendance (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    rombel_id       UUID         NOT NULL REFERENCES public.rombel(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_date DATE         NOT NULL,
    status          TEXT         NOT NULL CHECK (status IN ('hadir', 'sakit', 'izin', 'alpa')),
    notes           TEXT,
    recorded_by     UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    recorded_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (rombel_id, student_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_rombel_attendance_rombel_date
    ON public.rombel_attendance(rombel_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_rombel_attendance_student
    ON public.rombel_attendance(student_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_rombel_attendance_tenant_date
    ON public.rombel_attendance(tenant_id, attendance_date DESC);

-- Bulk upsert RPC: pass an array of (student_id, status) pairs for one
-- rombel × date. Used by the wali kelas absen-pagi UI.
CREATE OR REPLACE FUNCTION public.bulk_record_attendance(
    p_tenant_id UUID,
    p_rombel_id UUID,
    p_attendance_date DATE,
    p_recorder_id UUID,
    p_records JSONB              -- [{"student_id":"...", "status":"hadir|sakit|izin|alpa", "notes":"..."}, ...]
) RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
    rec JSONB;
    inserted_count INT := 0;
BEGIN
    FOR rec IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        INSERT INTO public.rombel_attendance
            (tenant_id, rombel_id, student_id, attendance_date, status, notes, recorded_by)
        VALUES
            (p_tenant_id,
             p_rombel_id,
             (rec->>'student_id')::uuid,
             p_attendance_date,
             rec->>'status',
             rec->>'notes',
             p_recorder_id)
        ON CONFLICT (rombel_id, student_id, attendance_date) DO UPDATE SET
            status = EXCLUDED.status,
            notes = EXCLUDED.notes,
            recorded_by = EXCLUDED.recorded_by,
            recorded_at = now();
        inserted_count := inserted_count + 1;
    END LOOP;

    RETURN inserted_count;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.bulk_record_attendance(UUID, UUID, DATE, UUID, JSONB) TO PUBLIC;
