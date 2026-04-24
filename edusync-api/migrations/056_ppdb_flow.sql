-- 056_ppdb_flow.sql
-- Fase 4 Unit 36: PPDB (Penerimaan Peserta Didik Baru) — full flow
--
-- Existing schema has a thin `ppdb_periods` + `ppdb_registrations` stub. This
-- migration completes the flow: jalur, kuota, dokumen, tes online, ranking,
-- auto-enroll.

CREATE TABLE IF NOT EXISTS public.ppdb_jalur (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period_id   UUID         NOT NULL REFERENCES public.ppdb_periods(id) ON DELETE CASCADE,
    code        TEXT         NOT NULL,                -- 'zonasi', 'afirmasi', 'prestasi', 'mutasi'
    label       TEXT         NOT NULL,
    quota       INTEGER      NOT NULL DEFAULT 0,
    description TEXT,
    starts_on   DATE,
    ends_on     DATE,
    UNIQUE (period_id, code)
);

CREATE INDEX IF NOT EXISTS idx_ppdb_jalur_period ON public.ppdb_jalur(period_id);

ALTER TABLE public.ppdb_registrations
    ADD COLUMN IF NOT EXISTS jalur_id UUID REFERENCES public.ppdb_jalur(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS test_score NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS rank INTEGER,
    ADD COLUMN IF NOT EXISTS auto_enrolled_rombel_id UUID REFERENCES public.rombel(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.ppdb_documents (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID         NOT NULL REFERENCES public.ppdb_registrations(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    document_type   TEXT         NOT NULL,            -- 'akta_lahir', 'kk', 'ijazah_sd', 'rapor_sd', 'sktm', ...
    file_url        TEXT         NOT NULL,
    file_size       INTEGER,
    mime_type       TEXT,
    status          TEXT         NOT NULL DEFAULT 'uploaded'
                                  CHECK (status IN ('uploaded', 'verified', 'rejected')),
    verified_by     UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppdb_documents_registration
    ON public.ppdb_documents(registration_id);

CREATE TABLE IF NOT EXISTS public.ppdb_tests (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id       UUID         NOT NULL REFERENCES public.ppdb_periods(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    title           TEXT         NOT NULL,
    quiz_id         UUID         REFERENCES public.quizzes(id) ON DELETE SET NULL,
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    weight          NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    UNIQUE (period_id, title)
);

CREATE TABLE IF NOT EXISTS public.ppdb_test_results (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id         UUID         NOT NULL REFERENCES public.ppdb_tests(id) ON DELETE CASCADE,
    registration_id UUID         NOT NULL REFERENCES public.ppdb_registrations(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    raw_score       NUMERIC(5,2),
    weighted_score  NUMERIC(5,2),
    completed_at    TIMESTAMPTZ,

    UNIQUE (test_id, registration_id)
);

-- Auto-rank within (period, jalur) by weighted score across all PPDB tests.
CREATE OR REPLACE FUNCTION public.refresh_ppdb_ranks(p_period_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
    updated_count INT := 0;
BEGIN
    WITH scored AS (
        SELECT r.id AS registration_id,
               r.jalur_id,
               COALESCE(SUM(t.weighted_score), 0) AS total_score
          FROM public.ppdb_registrations r
          LEFT JOIN public.ppdb_test_results t ON t.registration_id = r.id
         WHERE r.period_id = p_period_id
         GROUP BY r.id, r.jalur_id
    ),
    ranked AS (
        SELECT registration_id,
               total_score,
               ROW_NUMBER() OVER (PARTITION BY jalur_id ORDER BY total_score DESC, registration_id) AS rk
          FROM scored
    )
    UPDATE public.ppdb_registrations r
       SET rank = ranked.rk,
           test_score = ranked.total_score
      FROM ranked
     WHERE r.id = ranked.registration_id
       AND r.period_id = p_period_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.refresh_ppdb_ranks(UUID) TO PUBLIC;
