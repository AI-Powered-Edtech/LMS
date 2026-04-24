-- Migrasi 024 — Course Review Workflow (Opsi B)
-- Memperkenalkan state machine eksplisit: draft -> in_review -> approved -> published
-- (archived tetap tersedia sebagai terminal state).
-- Tabel course_reviews menyimpan riwayat review + catatan reviewer.
--
-- CATATAN PENTING: ALTER TYPE ... ADD VALUE tidak bisa dijalankan
-- di dalam transaction. Jalankan file ini dengan:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f 024_course_review_workflow.sql
-- Psql menjalankan tiap statement SQL top-level secara individual; perintah
-- ALTER TYPE akan auto-commit. Bagian DDL tabel di bawahnya aman.

-- 1. Perluas enum course_status. Gunakan IF NOT EXISTS agar idempoten.
ALTER TYPE public.course_status ADD VALUE IF NOT EXISTS 'in_review' BEFORE 'published';
ALTER TYPE public.course_status ADD VALUE IF NOT EXISTS 'approved' BEFORE 'published';

-- 2. Kolom audit di courses untuk timestamp transisi review.
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS submitted_for_review_at timestamptz,
    ADD COLUMN IF NOT EXISTS approved_at timestamptz,
    ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id);

-- 3. Tabel riwayat review.
CREATE TABLE IF NOT EXISTS public.course_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
    verdict text NOT NULL CHECK (verdict IN ('approved', 'rejected', 'changes_requested')),
    note text,
    from_status public.course_status NOT NULL,
    to_status public.course_status NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_reviews_course_idx
    ON public.course_reviews(course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS course_reviews_tenant_idx
    ON public.course_reviews(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS course_reviews_reviewer_idx
    ON public.course_reviews(reviewer_id, created_at DESC);

ALTER TABLE public.course_reviews OWNER TO postgres;

-- 4. RLS: tenant-isolation sederhana. Guru/admin bisa lihat review
--    kursus di tenant-nya; VIL set_config('request.jwt.claim.tenant_id', ...)
--    sudah dipakai oleh rpc_proxy_handler, jadi kebijakan ini cocok dengan
--    pola RLS yang ada.
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_reviews_tenant_select ON public.course_reviews;
CREATE POLICY course_reviews_tenant_select
    ON public.course_reviews
    FOR SELECT
    USING (tenant_id::text = current_setting('request.jwt.claim.tenant_id', true));

DROP POLICY IF EXISTS course_reviews_tenant_insert ON public.course_reviews;
CREATE POLICY course_reviews_tenant_insert
    ON public.course_reviews
    FOR INSERT
    WITH CHECK (tenant_id::text = current_setting('request.jwt.claim.tenant_id', true));

COMMENT ON TABLE public.course_reviews IS
    'Riwayat review kursus (migrasi 024). Entri dibuat ketika seorang reviewer memverdict kursus via endpoint POST /api/v1/courses/:id/review.';
