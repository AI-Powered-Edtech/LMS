-- 055_bos_expense_tracking.sql
-- Fase 4 Unit 35: BOS expense tracking (sekolah negeri)
--
-- BOS (Bantuan Operasional Sekolah) is the primary funding for sekolah
-- negeri. Schools must report expenses categorized per Permendikbud guidance.

CREATE TABLE IF NOT EXISTS public.bos_funding_periods (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    period_label    TEXT         NOT NULL,        -- 'BOS Reguler 2026 Tahap 1'
    period_quarter  TEXT         CHECK (period_quarter IN ('Q1','Q2','Q3','Q4') OR period_quarter IS NULL),
    funding_year    INTEGER      NOT NULL,
    allocated_amount NUMERIC(15,2) NOT NULL,
    received_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
    received_at     DATE,
    status          TEXT         NOT NULL DEFAULT 'allocated'
                                  CHECK (status IN ('allocated', 'received', 'spent', 'reported')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, period_label)
);

CREATE INDEX IF NOT EXISTS idx_bos_funding_periods_tenant
    ON public.bos_funding_periods(tenant_id);

-- 12 standard kategori per Permendikbud BOS (numbered per the regulation).
CREATE TABLE IF NOT EXISTS public.bos_expense_categories (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT         NOT NULL UNIQUE,    -- '1', '2', ..., '12'
    label       TEXT         NOT NULL,
    description TEXT
);

INSERT INTO public.bos_expense_categories (code, label, description) VALUES
    ('1',  'Penerimaan Peserta Didik Baru', 'Termasuk kegiatan PPDB'),
    ('2',  'Pengembangan Perpustakaan', 'Buku, langganan jurnal'),
    ('3',  'Kegiatan Pembelajaran & Ekstrakurikuler', 'Termasuk lomba'),
    ('4',  'Kegiatan Asesmen & Evaluasi', 'Termasuk PAS, PAT, AKM'),
    ('5',  'Administrasi Kegiatan Sekolah', 'ATK, formulir'),
    ('6',  'Pengembangan Profesi Guru & Tenaga Kependidikan', 'Pelatihan, sertifikasi'),
    ('7',  'Daya Listrik, Air, dan Jasa Telekomunikasi', NULL),
    ('8',  'Pemeliharaan Sarana & Prasarana', NULL),
    ('9',  'Penyediaan Alat Multi Media Pembelajaran', 'Komputer, proyektor'),
    ('10', 'Penyelenggaraan Kegiatan Peningkatan Mutu', NULL),
    ('11', 'Penyelenggaraan Bursa Kerja Khusus (SMK)', NULL),
    ('12', 'Pembayaran Honor', 'Honor GTT/PTT terbatas')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.bos_expenses (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    funding_period_id UUID       REFERENCES public.bos_funding_periods(id) ON DELETE SET NULL,
    category_id     UUID         REFERENCES public.bos_expense_categories(id) ON DELETE RESTRICT,
    description     TEXT         NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    expense_date    DATE         NOT NULL,
    receipt_url     TEXT,                          -- bukti / kwitansi
    vendor_name     TEXT,
    submitted_by    UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by     UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    status          TEXT         NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bos_expenses_tenant_date
    ON public.bos_expenses(tenant_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_bos_expenses_period
    ON public.bos_expenses(funding_period_id);
CREATE INDEX IF NOT EXISTS idx_bos_expenses_category
    ON public.bos_expenses(category_id);
