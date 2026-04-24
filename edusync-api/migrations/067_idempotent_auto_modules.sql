-- 067_idempotent_auto_modules.sql
-- U04 follow-up: make auto_add_modules_for_tenant trigger idempotent so
-- reset-dev-school.sh can re-run without UNIQUE violation on re-insert.
-- Root cause: BEFORE INSERT trigger fires even when outer INSERT has
-- ON CONFLICT DO NOTHING; previous trigger body INSERTed unconditionally.

CREATE OR REPLACE FUNCTION public.auto_add_modules_for_tenant() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.tenant_modules (tenant_id, module_id, is_enabled)
  SELECT NEW.id, m.id, CASE WHEN m.is_core THEN true ELSE m.api_enabled_default END
  FROM public.modules m
  ON CONFLICT (tenant_id, module_id) DO NOTHING;
  RETURN NEW;
END;
$$;
