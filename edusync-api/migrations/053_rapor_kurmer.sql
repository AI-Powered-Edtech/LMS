-- 053_rapor_kurmer.sql
-- Fase 3 Units 27-30: Rapor Kurmer + signature flow + batch export
--
-- A rapor is a per-(student × semester) snapshot of academic + non-academic
-- performance, signed by guru mapel → wali kelas → kepsek. The PDF is the
-- physical/digital deliverable; this schema is the data that drives it.

CREATE TABLE IF NOT EXISTS public.rapor_documents (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id         UUID         NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
    academic_year_id    UUID         REFERENCES public.academic_years(id) ON DELETE SET NULL,
    rombel_id           UUID         REFERENCES public.rombel(id) ON DELETE SET NULL,

    -- Snapshot data (denormalised for stability across edits to source rows)
    student_name        TEXT         NOT NULL,
    nisn                TEXT,
    rombel_name         TEXT,

    -- Status workflow: draft → guru_signed → wali_signed → kepsek_signed → published
    status              TEXT         NOT NULL DEFAULT 'draft'
                                       CHECK (status IN
                                              ('draft', 'guru_signed', 'wali_signed',
                                               'kepsek_signed', 'published')),

    -- Generated PDF
    pdf_url             TEXT,
    pdf_generated_at    TIMESTAMPTZ,

    -- Optional AI-generated overall narrative (per-mapel narratives in subject_grades)
    ai_narrative        TEXT,
    ai_narrative_at     TIMESTAMPTZ,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (student_id, semester_id)
);

CREATE INDEX IF NOT EXISTS idx_rapor_documents_tenant   ON public.rapor_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rapor_documents_rombel   ON public.rapor_documents(rombel_id);
CREATE INDEX IF NOT EXISTS idx_rapor_documents_semester ON public.rapor_documents(semester_id);

CREATE TABLE IF NOT EXISTS public.rapor_subject_grades (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id            UUID         NOT NULL REFERENCES public.rapor_documents(id) ON DELETE CASCADE,
    subject_id          UUID         REFERENCES public.subjects(id) ON DELETE SET NULL,
    tenant_id           UUID         NOT NULL,
    subject_name        TEXT         NOT NULL,
    nilai_akhir         NUMERIC(5,2),
    descriptor          public.kurmer_descriptor,
    deskripsi_capaian   TEXT,                       -- per-mapel narrative (AI-generated optional)
    teacher_id          UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rapor_subject_grades_rapor
    ON public.rapor_subject_grades(rapor_id);

-- Signature trail (immutable audit). Each row records ONE signature event.
CREATE TABLE IF NOT EXISTS public.rapor_signatures (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    rapor_id        UUID         NOT NULL REFERENCES public.rapor_documents(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    signer_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    signer_role     TEXT         NOT NULL CHECK (signer_role IN ('guru', 'wali_kelas', 'kepsek')),
    signed_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    notes           TEXT,
    -- Cryptographic proof: hash of (rapor snapshot + signer_id + signed_at)
    -- Computed by the API on insert; verified by the FE on display.
    signature_hash  TEXT         NOT NULL,

    UNIQUE (rapor_id, signer_role)
);

CREATE INDEX IF NOT EXISTS idx_rapor_signatures_rapor ON public.rapor_signatures(rapor_id);

-- RPC: advance status atomically when a signature is added.
CREATE OR REPLACE FUNCTION public.sign_rapor(
    p_rapor_id UUID,
    p_signer_id UUID,
    p_signer_role TEXT,
    p_notes TEXT DEFAULT NULL,
    p_signature_hash TEXT DEFAULT NULL
) RETURNS public.rapor_documents
LANGUAGE plpgsql AS $fn$
DECLARE
    r public.rapor_documents;
    next_status TEXT;
BEGIN
    SELECT * INTO r FROM public.rapor_documents WHERE id = p_rapor_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'rapor not found' USING ERRCODE = 'P0002'; END IF;

    next_status := CASE
        WHEN p_signer_role = 'guru'        AND r.status = 'draft'         THEN 'guru_signed'
        WHEN p_signer_role = 'wali_kelas'  AND r.status = 'guru_signed'   THEN 'wali_signed'
        WHEN p_signer_role = 'kepsek'      AND r.status = 'wali_signed'   THEN 'kepsek_signed'
        ELSE NULL
    END;

    IF next_status IS NULL THEN
        RAISE EXCEPTION 'invalid signature step: % cannot sign while status=%', p_signer_role, r.status
            USING ERRCODE = 'P0003';
    END IF;

    INSERT INTO public.rapor_signatures
        (rapor_id, tenant_id, signer_id, signer_role, notes, signature_hash)
    VALUES
        (p_rapor_id, r.tenant_id, p_signer_id, p_signer_role, p_notes,
         COALESCE(p_signature_hash, encode(digest(p_rapor_id::text || p_signer_id::text || now()::text, 'sha256'), 'hex')));

    UPDATE public.rapor_documents
       SET status = next_status, updated_at = now()
     WHERE id = p_rapor_id
    RETURNING * INTO r;

    RETURN r;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.sign_rapor(UUID, UUID, TEXT, TEXT, TEXT) TO PUBLIC;

DROP TRIGGER IF EXISTS trg_rapor_documents_updated_at ON public.rapor_documents;
CREATE OR REPLACE FUNCTION public.touch_rapor_documents_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_rapor_documents_updated_at
    BEFORE UPDATE ON public.rapor_documents
    FOR EACH ROW EXECUTE FUNCTION public.touch_rapor_documents_updated_at();
