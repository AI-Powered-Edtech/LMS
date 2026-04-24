-- P3 backlog migration
-- 1. tenants.settings JSONB (house `required_approvals` per tenant, extensible)
-- 2. Add REVIEWER value ke enum app_role supaya user_roles bisa store REVIEWER.
-- 3. Relax user_roles UNIQUE (user_id, role) → (user_id, role, tenant_id) agar
--    user yang sama bisa memegang role yang sama di banyak tenant (multi-tenant).
-- 4. Backfill slug tenant lama (contoh: 'ak-olo-est' → 'pak-solo-test-<short_id>').

-- NOTE: ALTER TYPE ... ADD VALUE must run outside any transaction block when
-- the value is then used in the same transaction. We split the enum change
-- into its own implicit-commit statement up front.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'REVIEWER';

-- ── 1. tenants.settings ──────────────────────────────────────────────────────
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tenants.settings IS
    'Per-tenant feature config. Keys: required_approvals:int (default 2), reviewer_role:text (default "admin").';

-- ── 3. user_roles unique tweak ───────────────────────────────────────────────
ALTER TABLE public.user_roles
    DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_tenant_id_key
    UNIQUE (user_id, role, tenant_id);

-- ── 4. backfill slug tenant lama ─────────────────────────────────────────────
-- Slug 'ak-olo-est' hilang awalan 'p'. Regenerate dari name, namun bentrok
-- dengan 'pak-solo-test' yang sudah ada → append short id.
UPDATE public.tenants
   SET slug = 'pak-solo-test-' || SUBSTRING(id::text FROM 1 FOR 6)
 WHERE slug = 'ak-olo-est';

-- ── 5. helper function untuk membaca required_approvals ─────────────────────
CREATE OR REPLACE FUNCTION public.tenant_required_approvals(p_tenant_id UUID)
RETURNS INT
LANGUAGE sql STABLE
AS $$
    SELECT GREATEST(1, COALESCE((settings ->> 'required_approvals')::int, 2))
      FROM public.tenants
     WHERE id = p_tenant_id;
$$;
