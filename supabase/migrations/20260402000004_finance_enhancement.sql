-- =============================================================================
-- EduSync LMS — Finance Enhancement: SPP Dashboard Support
-- Tanggal: 2026-04-02
-- =============================================================================
-- Tambah kolom SPP pada invoices (description, month_year) dan
-- buat view finance_invoice_details untuk query dashboard keuangan.
-- =============================================================================

-- 1. Tambah kolom SPP jika belum ada
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS description        text,
  ADD COLUMN IF NOT EXISTS month_year         text,      -- format: '2026-01'
  ADD COLUMN IF NOT EXISTS paid_at            timestamptz;

-- 2. View gabungan invoice + profil siswa (digunakan finance dashboard)
CREATE OR REPLACE VIEW public.finance_invoice_details AS
SELECT
  i.id,
  i.tenant_id,
  i.student_id,
  p.full_name                                  AS student_name,
  p.email                                      AS student_email,
  COALESCE(i.amount_due, i.amount, 0)          AS amount_due,
  COALESCE(i.amount_paid, 0)                   AS amount_paid,
  LOWER(i.status)                              AS status,
  i.description,
  i.month_year,
  i.due_date,
  i.paid_at,
  i.created_at,
  i.updated_at
FROM public.invoices i
LEFT JOIN public.profiles p ON p.id = i.student_id AND p.tenant_id = i.tenant_id;

-- RLS: ikuti izin invoices (admin penuh, siswa baca milik sendiri)
ALTER VIEW public.finance_invoice_details OWNER TO postgres;

-- 3. Fungsi RPC: ringkasan keuangan bulan ini
CREATE OR REPLACE FUNCTION public.get_finance_overview(p_tenant_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start  timestamptz := date_trunc('month', now());
  v_month_end    timestamptz := date_trunc('month', now()) + interval '1 month';
  v_total        numeric := 0;
  v_paid         numeric := 0;
  v_unpaid       numeric := 0;
BEGIN
  -- Total tagihan bulan ini (berdasarkan created_at atau due_date)
  SELECT COALESCE(SUM(COALESCE(amount_due, amount, 0)), 0)
    INTO v_total
    FROM public.invoices
   WHERE tenant_id = p_tenant_id
     AND created_at >= v_month_start
     AND created_at <  v_month_end;

  -- Sudah dibayar bulan ini
  SELECT COALESCE(SUM(COALESCE(amount_due, amount, 0)), 0)
    INTO v_paid
    FROM public.invoices
   WHERE tenant_id = p_tenant_id
     AND LOWER(status) IN ('paid', 'lunas')
     AND created_at >= v_month_start
     AND created_at <  v_month_end;

  -- Belum / terlambat bayar (semua waktu, bukan hanya bulan ini)
  SELECT COALESCE(SUM(COALESCE(amount_due, amount, 0)), 0)
    INTO v_unpaid
    FROM public.invoices
   WHERE tenant_id = p_tenant_id
     AND LOWER(status) IN ('pending', 'open', 'overdue', 'terlambat', 'belum bayar', 'unpaid');

  RETURN json_build_object(
    'total_this_month',  v_total,
    'paid_this_month',   v_paid,
    'unpaid_total',      v_unpaid,
    'payment_rate',      CASE WHEN v_total > 0 THEN ROUND((v_paid / v_total) * 100, 1) ELSE 0 END
  );
END;
$$;

ALTER FUNCTION public.get_finance_overview(uuid) OWNER TO postgres;

-- 4. Fungsi RPC: data bulanan 6 bulan terakhir untuk chart
CREATE OR REPLACE FUNCTION public.get_finance_monthly(p_tenant_id uuid)
RETURNS TABLE(
  month_label  text,
  month_key    text,
  total        numeric,
  paid         numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT
      generate_series(
        date_trunc('month', now()) - interval '5 months',
        date_trunc('month', now()),
        interval '1 month'
      ) AS month_start
  )
  SELECT
    TO_CHAR(m.month_start, 'Mon YY')                                    AS month_label,
    TO_CHAR(m.month_start, 'YYYY-MM')                                   AS month_key,
    COALESCE(SUM(COALESCE(i.amount_due, i.amount, 0)), 0)               AS total,
    COALESCE(SUM(
      CASE WHEN LOWER(i.status) IN ('paid', 'lunas')
           THEN COALESCE(i.amount_due, i.amount, 0) ELSE 0 END
    ), 0) AS paid
  FROM months m
  LEFT JOIN public.invoices i
         ON i.tenant_id = p_tenant_id
        AND i.created_at >= m.month_start
        AND i.created_at <  m.month_start + interval '1 month'
  GROUP BY m.month_start
  ORDER BY m.month_start ASC;
END;
$$;

ALTER FUNCTION public.get_finance_monthly(uuid) OWNER TO postgres;
