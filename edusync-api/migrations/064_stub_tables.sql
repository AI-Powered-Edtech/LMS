-- 064_stub_tables.sql
-- Create stub tables that FE services query but were never created elsewhere.
-- Without these, data-plane SELECTs return 404 "Tabel tidak ditemukan".

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  steps_completed jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user
  ON public.onboarding_progress (user_id, tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  seats integer NOT NULL DEFAULT 0,
  seats_used integer NOT NULL DEFAULT 0,
  billing_cycle text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant
  ON public.tenant_subscriptions (tenant_id);

ALTER TABLE public.tenant_subscriptions
  ADD COLUMN IF NOT EXISTS plan_id uuid;
