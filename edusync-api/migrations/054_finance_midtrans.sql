-- 054_finance_midtrans.sql
-- Fase 4 Units 32-33: Midtrans payment integration + SPP recurring invoices
--
-- AUTHORITATIVE: Midtrans is the chosen payment gateway (per runbook §2).
-- This migration adds:
--   - invoice_items (line items per invoice)
--   - payment_transactions (Midtrans transaction records, webhook-driven)
--   - spp_schedules (recurring SPP per student)

-- Existing public.invoices already has: id, tenant_id, student_id, amount_due,
-- amount_paid, due_date, status. Add Midtrans linkage.
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS midtrans_order_id TEXT,
    ADD COLUMN IF NOT EXISTS midtrans_snap_url TEXT,
    ADD COLUMN IF NOT EXISTS midtrans_payment_type TEXT,
    ADD COLUMN IF NOT EXISTS midtrans_va_number TEXT,
    ADD COLUMN IF NOT EXISTS midtrans_va_bank TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill invoice_number for legacy rows
UPDATE public.invoices
   SET invoice_number = 'INV-' || to_char(created_at, 'YYYYMM') || '-' || substring(id::text, 1, 8)
 WHERE invoice_number IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_midtrans_order
    ON public.invoices(midtrans_order_id) WHERE midtrans_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID         NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    tenant_id       UUID         NOT NULL,
    description     TEXT         NOT NULL,
    quantity        NUMERIC(8,2) NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12,2) NOT NULL,
    line_total      NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id              UUID         REFERENCES public.invoices(id) ON DELETE SET NULL,
    tenant_id               UUID         NOT NULL,
    midtrans_transaction_id TEXT         UNIQUE,
    midtrans_order_id       TEXT,
    payment_type            TEXT,        -- 'bank_transfer', 'gopay', 'qris', 'credit_card', ...
    transaction_status      TEXT NOT NULL,  -- raw Midtrans status: 'pending', 'settlement', 'capture', 'deny', ...
    fraud_status            TEXT,
    gross_amount            NUMERIC(12,2),
    transaction_time        TIMESTAMPTZ,
    settlement_time         TIMESTAMPTZ,
    raw_response            JSONB,        -- full webhook payload for audit
    received_at             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice
    ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status
    ON public.payment_transactions(transaction_status);

-- SPP schedules: monthly recurring tagihan per student.
CREATE TABLE IF NOT EXISTS public.spp_schedules (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id          UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    academic_year_id    UUID         REFERENCES public.academic_years(id) ON DELETE SET NULL,
    monthly_amount      NUMERIC(12,2) NOT NULL,
    starts_on           DATE         NOT NULL,
    ends_on             DATE,
    is_active           BOOLEAN      NOT NULL DEFAULT true,
    last_generated_for  DATE,                       -- yyyy-mm-01 of the most recently generated invoice
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (student_id, academic_year_id)
);

CREATE INDEX IF NOT EXISTS idx_spp_schedules_active
    ON public.spp_schedules(tenant_id) WHERE is_active = true;

-- Cron-callable function to generate this month's SPP invoices for all active
-- schedules. Idempotent: skips if invoice already exists for the month.
CREATE OR REPLACE FUNCTION public.generate_monthly_spp_invoices(p_for_month DATE DEFAULT date_trunc('month', current_date)::date)
RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
    sch RECORD;
    new_invoice_id UUID;
    created_count INT := 0;
BEGIN
    FOR sch IN
        SELECT * FROM public.spp_schedules
         WHERE is_active = true
           AND starts_on <= p_for_month
           AND (ends_on IS NULL OR ends_on >= p_for_month)
           AND (last_generated_for IS NULL OR last_generated_for < p_for_month)
    LOOP
        INSERT INTO public.invoices
            (tenant_id, student_id, amount_due, amount_paid, due_date, status,
             invoice_number, notes, created_at, updated_at)
        VALUES
            (sch.tenant_id, sch.student_id, sch.monthly_amount, 0,
             (p_for_month + interval '20 days')::date,
             'pending',
             'SPP-' || to_char(p_for_month, 'YYYYMM') || '-' || substring(sch.student_id::text, 1, 8),
             'SPP ' || to_char(p_for_month, 'TMMonth YYYY'),
             now(), now())
        RETURNING id INTO new_invoice_id;

        INSERT INTO public.invoice_items
            (invoice_id, tenant_id, description, quantity, unit_price)
        VALUES
            (new_invoice_id, sch.tenant_id,
             'SPP ' || to_char(p_for_month, 'TMMonth YYYY'),
             1, sch.monthly_amount);

        UPDATE public.spp_schedules
           SET last_generated_for = p_for_month, updated_at = now()
         WHERE id = sch.id;

        created_count := created_count + 1;
    END LOOP;

    RETURN created_count;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.generate_monthly_spp_invoices(DATE) TO PUBLIC;
