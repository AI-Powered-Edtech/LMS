-- Migration: 825_seed_default_tenant.sql
-- Seeds the default fallback tenant UUID used by the handle_new_user() trigger.
-- The trigger (001_migration.sql) falls back to '00000000-0000-0000-0000-000000000001'
-- when no tenant_id is provided in signup metadata. Without this row, new user
-- registration on a fresh Supabase project fails with an FK violation.

INSERT INTO public.tenants (id, name, slug, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default',
  'default',
  true
)
ON CONFLICT (id) DO NOTHING;
