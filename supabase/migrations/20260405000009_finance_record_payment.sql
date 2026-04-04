-- =============================================================================
-- EduSync LMS — Sprint 2.2: Finance Payment Recording
-- Tanggal: 2026-04-05
-- =============================================================================
-- RPC record_payment : atomically marks invoice as paid (with advisory lock)
-- RPC create_invoice : create new SPP invoice for a student
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC: record_payment
-- Atomically records a payment and marks the invoice as paid.
-- Uses pg_advisory_xact_lock to prevent double-payment race conditions.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_payment(
  p_invoice_id UUID,
  p_amount     NUMERIC,
  p_method     TEXT DEFAULT 'transfer'
)
RETURNS TABLE (
  payment_id     UUID,
  invoice_id     UUID,
  invoice_status TEXT,
  paid_at        TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment_id UUID;
  v_invoice    RECORD;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  -- Advisory lock: prevents concurrent payments on the same invoice
  PERFORM pg_advisory_xact_lock(hashtext(p_invoice_id::text));

  -- Fetch and row-lock the invoice (must belong to current tenant)
  SELECT id,
         status,
         COALESCE(amount_due, amount, 0) AS amount_due,
         tenant_id
    INTO v_invoice
    FROM public.invoices
   WHERE id = p_invoice_id
     AND tenant_id = public.get_my_tenant_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tagihan tidak ditemukan';
  END IF;

  IF LOWER(v_invoice.status) = 'paid' THEN
    RAISE EXCEPTION 'Tagihan sudah dibayar';
  END IF;

  -- Insert payment record
  INSERT INTO public.payments (invoice_id, amount, method, tenant_id)
  VALUES (p_invoice_id, p_amount, p_method, v_invoice.tenant_id)
  RETURNING id INTO v_payment_id;

  -- Mark invoice as paid
  UPDATE public.invoices
     SET status     = 'paid',
         paid_at    = NOW(),
         updated_at = NOW()
   WHERE id = p_invoice_id;

  RETURN QUERY
  SELECT v_payment_id,
         p_invoice_id,
         'paid'::TEXT,
         NOW()::TIMESTAMPTZ;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT) FROM anon;

-- ---------------------------------------------------------------------------
-- RPC: create_invoice
-- Creates a new SPP invoice for a student in the current tenant.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_invoice(
  p_student_id  UUID,
  p_amount      NUMERIC,
  p_description TEXT,
  p_due_date    DATE    DEFAULT NULL,
  p_month_year  TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice_id UUID;
  v_tenant_id  UUID;
BEGIN
  -- Auth check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  v_tenant_id := public.get_my_tenant_id();

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant tidak ditemukan';
  END IF;

  INSERT INTO public.invoices (
    student_id,
    amount,
    amount_due,
    description,
    due_date,
    month_year,
    status,
    tenant_id
  )
  VALUES (
    p_student_id,
    p_amount,
    p_amount,
    p_description,
    p_due_date,
    p_month_year,
    'pending',
    v_tenant_id
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invoice(UUID, NUMERIC, TEXT, DATE, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_invoice(UUID, NUMERIC, TEXT, DATE, TEXT) FROM anon;
