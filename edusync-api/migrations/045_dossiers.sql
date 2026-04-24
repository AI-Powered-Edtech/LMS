-- 045_dossiers.sql
-- Fase 1 Unit 18: student_dossier + staff_dossier
--
-- Dossier = data lengkap untuk Dapodik / rapor / dokumen administrasi.
-- Kept separate from `profiles` because:
--   1. profiles is auth-adjacent and high-traffic; dossier is admin-only
--   2. dossier fields (NISN, NIK, NIP, NUPTK) are PII and want stricter access
--   3. dossier columns rarely read in hot paths

CREATE TABLE IF NOT EXISTS public.student_dossier (
    profile_id          UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id           UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Identitas
    nisn                TEXT,            -- 10 digit nomor induk siswa nasional
    nik                 TEXT,            -- 16 digit NIK KTP/KK
    nis_local           TEXT,            -- nomor induk siswa lokal sekolah
    place_of_birth      TEXT,
    date_of_birth       DATE,
    gender              TEXT             CHECK (gender IN ('L', 'P') OR gender IS NULL),
    religion            TEXT,
    nationality         TEXT             DEFAULT 'WNI',

    -- Alamat
    address_street      TEXT,
    address_rt          TEXT,
    address_rw          TEXT,
    address_kelurahan   TEXT,
    address_kecamatan   TEXT,
    address_kota_kab    TEXT,
    address_province    TEXT,
    address_postal_code TEXT,

    -- Wali / orang tua
    father_name         TEXT,
    father_occupation   TEXT,
    father_phone        TEXT,
    mother_name         TEXT,
    mother_occupation   TEXT,
    mother_phone        TEXT,
    guardian_name       TEXT,
    guardian_relation   TEXT,
    guardian_phone      TEXT,

    -- Sekolah asal
    previous_school     TEXT,
    enrollment_year     INTEGER,

    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_dossier_tenant ON public.student_dossier(tenant_id);
CREATE INDEX IF NOT EXISTS idx_student_dossier_nisn ON public.student_dossier(nisn);
CREATE INDEX IF NOT EXISTS idx_student_dossier_nik ON public.student_dossier(nik);

CREATE TABLE IF NOT EXISTS public.staff_dossier (
    profile_id           UUID         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id            UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Identitas pegawai
    nip                  TEXT,           -- 18 digit Nomor Induk Pegawai (PNS)
    nuptk                TEXT,           -- 16 digit Nomor Unik Pendidik & Tenaga Kependidikan
    nik                  TEXT,
    place_of_birth       TEXT,
    date_of_birth        DATE,
    gender               TEXT            CHECK (gender IN ('L', 'P') OR gender IS NULL),

    -- Status kepegawaian
    employment_status    TEXT            CHECK (employment_status IN
                                                ('PNS', 'PPPK', 'GTT', 'GTY', 'HONORER', 'TENAGA_HARIAN')
                                                OR employment_status IS NULL),
    employment_start     DATE,

    -- Kualifikasi & sertifikasi
    education_level      TEXT,           -- 'S1', 'S2', 'S3', 'D3', etc.
    education_major      TEXT,
    teaching_certificate TEXT,           -- nomor sertifikat pendidik
    additional_duties    TEXT[],         -- array: ['wali_kelas', 'wakasek_kurikulum', ...]

    -- Kontak
    phone                TEXT,
    address_summary      TEXT,

    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_dossier_tenant ON public.staff_dossier(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_dossier_nip ON public.staff_dossier(nip);
CREATE INDEX IF NOT EXISTS idx_staff_dossier_nuptk ON public.staff_dossier(nuptk);

DROP TRIGGER IF EXISTS trg_student_dossier_updated_at ON public.student_dossier;
CREATE OR REPLACE FUNCTION public.touch_student_dossier_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_student_dossier_updated_at
    BEFORE UPDATE ON public.student_dossier
    FOR EACH ROW EXECUTE FUNCTION public.touch_student_dossier_updated_at();

DROP TRIGGER IF EXISTS trg_staff_dossier_updated_at ON public.staff_dossier;
CREATE OR REPLACE FUNCTION public.touch_staff_dossier_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN NEW.updated_at := now(); RETURN NEW; END $fn$;
CREATE TRIGGER trg_staff_dossier_updated_at
    BEFORE UPDATE ON public.staff_dossier
    FOR EACH ROW EXECUTE FUNCTION public.touch_staff_dossier_updated_at();
