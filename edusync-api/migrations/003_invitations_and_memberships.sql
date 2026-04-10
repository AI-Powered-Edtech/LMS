-- Migration 003: user_invitations + tenant_memberships
-- These tables exist on the remote Supabase project; this migration
-- creates them for fresh environments (CREATE IF NOT EXISTS is a no-op
-- on the remote DB where they already exist).

-- app_role ENUM (may already exist via user_roles table migration)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('STUDENT', 'TEACHER', 'ADMIN', 'PARENT', 'PRINCIPAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- user_invitations: invitation tokens for tenant onboarding
-- Schema mirrors the remote Supabase project exactly.
CREATE TABLE IF NOT EXISTS public.user_invitations (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID         NOT NULL REFERENCES public.tenants(id)   ON DELETE CASCADE,
    email       TEXT         NOT NULL,
    invited_by  UUID         NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
    role        public.app_role NOT NULL,
    token       TEXT         NOT NULL UNIQUE,
    status      TEXT         NOT NULL DEFAULT 'pending',   -- pending | accepted | revoked
    expires_at  TIMESTAMPTZ  NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token     ON public.user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email     ON public.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant_id ON public.user_invitations(tenant_id);

-- tenant_memberships: unified membership status (used by sync_user_tenant_access RPC)
-- Schema mirrors the remote Supabase project exactly.
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID        NOT NULL REFERENCES public.tenants(id)   ON DELETE CASCADE,
    user_id   UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
    role      TEXT        NOT NULL,
    status    TEXT        NOT NULL DEFAULT 'active',   -- active | inactive | suspended
    joined_at TIMESTAMPTZ          DEFAULT now(),
    created_at TIMESTAMPTZ         DEFAULT now(),
    updated_at TIMESTAMPTZ         DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_id   ON public.tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_id ON public.tenant_memberships(tenant_id);
