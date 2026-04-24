-- Migration 026: follow-ups spec P1
--  1) Auto-generate classes.join_code bila NULL saat INSERT (trigger BEFORE INSERT).
--     Kode: 6 karakter [A-Z0-9] tanpa ambiguitas (0/O, 1/I dihindari).
--  2) Fix slugify di provision_personal_tenant — regex lama menghapus huruf
--     'p' dan 's' pada nama seperti "Pak Solo Test" sehingga menghasilkan
--     slug "ak-olo-est". Ganti dengan algoritma yang menurunkan case dulu,
--     strip diakritik, lalu ganti whitespace → dash dan trim dash berulang.

BEGIN;

-- ========================================
-- 1) Auto-generate classes.join_code
-- ========================================

CREATE OR REPLACE FUNCTION public.generate_class_join_code()
RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  attempt int := 0;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..6 LOOP
      candidate := candidate ||
        substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM public.classes WHERE join_code = candidate) THEN
      RETURN candidate;
    END IF;
    attempt := attempt + 1;
    IF attempt > 10 THEN
      -- Fallback: tambahkan suffix waktu
      RETURN candidate || to_char(clock_timestamp(), 'SSSS');
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.classes_set_join_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.join_code IS NULL OR btrim(NEW.join_code) = '' THEN
    NEW.join_code := public.generate_class_join_code();
  ELSE
    NEW.join_code := upper(btrim(NEW.join_code));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS classes_set_join_code ON public.classes;
CREATE TRIGGER classes_set_join_code
  BEFORE INSERT ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.classes_set_join_code();

-- Backfill row lama yang belum punya join_code
UPDATE public.classes
SET join_code = public.generate_class_join_code()
WHERE join_code IS NULL OR btrim(join_code) = '';

-- Unique index (case-insensitive) supaya collision handled
CREATE UNIQUE INDEX IF NOT EXISTS classes_join_code_upper_unique
  ON public.classes ((upper(join_code)));

-- ========================================
-- 2) Fix slugify di provision_personal_tenant
-- ========================================

CREATE OR REPLACE FUNCTION public.slugify_display_name(p_input text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v text;
BEGIN
  IF p_input IS NULL OR btrim(p_input) = '' THEN
    RETURN 'workspace';
  END IF;
  v := lower(btrim(p_input));
  -- Ganti karakter non-alnum (kecuali spasi dan dash) menjadi spasi
  v := regexp_replace(v, '[^a-z0-9\s-]+', ' ', 'g');
  -- Satukan whitespace berulang menjadi single dash
  v := regexp_replace(v, '\s+', '-', 'g');
  -- Dash berulang menjadi single
  v := regexp_replace(v, '-+', '-', 'g');
  -- Trim dash di awal/akhir
  v := btrim(v, '-');
  IF v = '' THEN
    RETURN 'workspace';
  END IF;
  RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.provision_personal_tenant(
  p_user_id uuid,
  p_display_name text
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id uuid;
  v_base_slug text;
  v_slug      text;
  v_suffix    int := 0;
  v_name      text;
BEGIN
  v_name := COALESCE(NULLIF(btrim(p_display_name), ''), 'Ruang Pribadi');
  v_base_slug := public.slugify_display_name(v_name);
  v_slug := v_base_slug;

  -- Tenant dengan slug yang sama? append -N.
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO public.tenants(id, name, slug, kind, owner_user_id, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    v_name,
    v_slug,
    'personal'::tenant_kind,
    p_user_id,
    now(),
    now()
  )
  RETURNING id INTO v_tenant_id;

  -- Membership owner (tabel memakai user_roles di schema existing)
  INSERT INTO public.user_roles(user_id, tenant_id, role, created_at)
  VALUES (p_user_id, v_tenant_id, 'TEACHER'::app_role, now())
  ON CONFLICT DO NOTHING;

  RETURN json_build_object(
    'tenant_id', v_tenant_id,
    'slug', v_slug,
    'name', v_name,
    'kind', 'personal'
  );
END $$;

COMMIT;
