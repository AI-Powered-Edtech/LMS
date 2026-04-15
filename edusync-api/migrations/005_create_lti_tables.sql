-- Migration 005: LTI 1.3 Integration Tables
-- Creates tables for LTI platform registration, nonces, and user links.

-- ── Platform registrations ────────────────────────────────────────────────────
-- Stores configuration for each LTI 1.3 platform (LMS) that can launch into EduSync.
CREATE TABLE IF NOT EXISTS lti_platform_registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issuer          TEXT NOT NULL UNIQUE,
    client_id       TEXT NOT NULL,
    deployment_id   TEXT NOT NULL DEFAULT '',
    key_set_url     TEXT NOT NULL,
    token_url       TEXT NOT NULL,
    auth_endpoint   TEXT NOT NULL,
    jwks_url        TEXT,
    platform_name   TEXT NOT NULL,
    tenant_id       UUID NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lti_platform_registrations_issuer
    ON lti_platform_registrations(issuer);

-- ── Nonces for replay prevention (service_role only) ─────────────────────────
-- Short-lived nonces that prevent LTI id_token replay attacks.
CREATE TABLE IF NOT EXISTS lti_nonces (
    nonce           TEXT PRIMARY KEY,
    platform_id     UUID NOT NULL REFERENCES lti_platform_registrations(id) ON DELETE CASCADE,
    state           TEXT,
    tenant_id       UUID NOT NULL,
    redirect_uri    TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lti_nonces_expires
    ON lti_nonces(expires_at);

ALTER TABLE lti_nonces ENABLE ROW LEVEL SECURITY;
-- RLS: deny all authenticated access — only service_role bypasses this.
CREATE POLICY "lti_nonces_deny_all" ON lti_nonces
    USING (false);

-- ── User links between LTI and EduSync ───────────────────────────────────────
-- Maps (platform_id, platform_sub) → EduSync user.
CREATE TABLE IF NOT EXISTS lti_user_links (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform_id     UUID NOT NULL REFERENCES lti_platform_registrations(id) ON DELETE CASCADE,
    platform_sub    TEXT NOT NULL,
    tenant_id       UUID NOT NULL,
    last_seen_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (platform_id, platform_sub, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_lti_user_links_user
    ON lti_user_links(user_id);

CREATE INDEX IF NOT EXISTS idx_lti_user_links_tenant
    ON lti_user_links(tenant_id);

ALTER TABLE lti_user_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lti_user_links_tenant_isolation" ON lti_user_links
    USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
