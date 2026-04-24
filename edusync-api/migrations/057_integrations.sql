-- 057_integrations.sql
-- Fase 5 Units 37-40: Dapodik export jobs + WhatsApp/Email channels + Bank VA
--
-- AUTHORITATIVE: Dapodik = CSV export only (per runbook §2). No realtime sync.
-- WhatsApp BSP = Twilio or Infobip (provider-agnostic config).
-- Email = SES or Sendgrid.

CREATE TABLE IF NOT EXISTS public.dapodik_export_jobs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    requested_by    UUID         REFERENCES public.profiles(id) ON DELETE SET NULL,
    export_scope    TEXT         NOT NULL CHECK (export_scope IN ('students', 'staff', 'rombel', 'all')),
    semester_id     UUID         REFERENCES public.semesters(id) ON DELETE SET NULL,
    file_url        TEXT,                          -- generated CSV in storage
    row_count       INTEGER,
    status          TEXT         NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dapodik_export_jobs_tenant
    ON public.dapodik_export_jobs(tenant_id, created_at DESC);

-- Outbound message log (WhatsApp + Email + SMS unified).
-- One row per attempt. Provider-specific fields go into raw_provider_response.
CREATE TABLE IF NOT EXISTS public.outbound_messages (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel         TEXT         NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'push')),
    provider        TEXT         NOT NULL,        -- 'twilio', 'infobip', 'ses', 'sendgrid', ...
    to_address      TEXT         NOT NULL,        -- phone number or email
    template_id     TEXT,                         -- BSP template ID for WhatsApp
    payload         JSONB,                        -- variables / body content
    related_id      UUID,                         -- linked entity (invoice, announcement, ...)
    related_type    TEXT,
    status          TEXT         NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'rejected')),
    error_message   TEXT,
    raw_provider_response JSONB,
    sent_at         TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbound_messages_tenant_status
    ON public.outbound_messages(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_messages_to
    ON public.outbound_messages(to_address);

-- Per-tenant integration config (encrypted secrets handled by app layer; this
-- only stores non-secret fields like provider, template IDs, account IDs).
CREATE TABLE IF NOT EXISTS public.integration_configs (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    integration     TEXT         NOT NULL,        -- 'whatsapp', 'email', 'midtrans', 'bank_va_bca', ...
    is_enabled      BOOLEAN      NOT NULL DEFAULT false,
    config          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, integration)
);

CREATE INDEX IF NOT EXISTS idx_integration_configs_tenant
    ON public.integration_configs(tenant_id);

-- Bank VA aggregator (separate from Midtrans VA — for direct bank integrations
-- where school has its own bank account / corporate billing).
CREATE TABLE IF NOT EXISTS public.bank_va_assignments (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id      UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    bank_code       TEXT         NOT NULL,        -- 'BCA', 'BNI', 'BRI', 'MANDIRI', ...
    va_number       TEXT         NOT NULL,
    is_active       BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, bank_code, va_number)
);

CREATE INDEX IF NOT EXISTS idx_bank_va_assignments_student
    ON public.bank_va_assignments(student_id);
