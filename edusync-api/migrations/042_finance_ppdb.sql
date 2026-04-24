-- 042_finance_ppdb.sql
-- Fase 4 Finance + PPDB

-- SPP & Invoices
CREATE TABLE IF NOT EXISTS public.spp_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_month DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PARTIAL', 'PAID', 'CANCELLED')),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spp_invoices_tenant ON public.spp_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_spp_invoices_student ON public.spp_invoices (student_id);

-- Payment Transactions (Midtrans)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID REFERENCES public.spp_invoices(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'MIDTRANS',
    gateway_order_id TEXT UNIQUE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED')),
    payment_method TEXT,
    snap_token TEXT,
    webhook_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON public.payment_transactions (tenant_id);

-- PPDB (Penerimaan Peserta Didik Baru)
CREATE TABLE IF NOT EXISTS public.ppdb_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ppdb_periods_tenant ON public.ppdb_periods (tenant_id);

CREATE TABLE IF NOT EXISTS public.ppdb_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    period_id UUID REFERENCES public.ppdb_periods(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    nisn TEXT,
    email TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'DOCUMENT_UPLOADED', 'TESTING', 'ACCEPTED', 'REJECTED')),
    documents JSONB DEFAULT '{}'::jsonb,
    test_score NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ppdb_registrations_tenant ON public.ppdb_registrations (tenant_id);
