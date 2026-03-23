-- ==============================================================================
-- PHASE 4: BILLING SCHEMA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.billing_plans(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.tenant_subscriptions(id) ON DELETE SET NULL,
  amount_due numeric NOT NULL,
  amount_paid numeric DEFAULT 0,
  status text NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  invoice_pdf_url text,
  due_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  payment_method text NOT NULL,
  receipt_url text,
  created_at timestamptz DEFAULT NOW()
);

-- RLS
ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON "public"."billing_plans" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin full access" ON "public"."billing_plans" FOR ALL TO authenticated USING (public.has_role('ADMIN'));

CREATE POLICY "Read own subscription" ON "public"."tenant_subscriptions" FOR SELECT TO authenticated USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Admin full access" ON "public"."tenant_subscriptions" FOR ALL TO authenticated USING (public.has_role('ADMIN'));

CREATE POLICY "Read own invoices" ON "public"."invoices" FOR SELECT TO authenticated USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Admin full access" ON "public"."invoices" FOR ALL TO authenticated USING (public.has_role('ADMIN'));

CREATE POLICY "Read own payments" ON "public"."payments" FOR SELECT TO authenticated USING (tenant_id = public.get_my_tenant_id());
CREATE POLICY "Admin full access" ON "public"."payments" FOR ALL TO authenticated USING (public.has_role('ADMIN'));
