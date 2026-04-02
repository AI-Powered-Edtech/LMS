-- =============================================================
-- EduSync LMS — Fix: Harmonize invoices table schema
-- Tanggal: 2026-04-01
-- =============================================================
-- Tabel invoices di schema_baseline.sql memiliki kolom 'amount'
-- (SPP siswa), sedangkan 011_billing_schema.sql memerlukan kolom
-- 'amount_due', 'amount_paid', dan 'due_date' (billing SaaS).
-- Migration ini menambahkan kolom yang hilang agar kompatibel.
-- =============================================================

-- Tambah kolom billing jika belum ada
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS amount_due   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date     timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_pdf_url text;

-- Migrate data: isi amount_due dari amount jika amount_due masih 0
UPDATE public.invoices
   SET amount_due = amount
 WHERE amount_due = 0 AND amount IS NOT NULL AND amount > 0;

-- Tambah constraint status billing jika belum ada (hanya jika kolom status masih menerima nilai lama)
-- Note: invoices lama pakai status 'PENDING', billing pakai lowercase
-- Normalisasi: lowercase existing status
UPDATE public.invoices
   SET status = LOWER(status)
 WHERE status != LOWER(status);
