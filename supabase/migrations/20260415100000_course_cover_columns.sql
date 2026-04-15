ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cover_url text;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cover_storage_object_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'storage_objects'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public'
        AND rel.relname = 'courses'
        AND con.conname = 'courses_cover_storage_object_id_fkey'
    ) THEN
      ALTER TABLE public.courses
        ADD CONSTRAINT courses_cover_storage_object_id_fkey
        FOREIGN KEY (cover_storage_object_id)
        REFERENCES public.storage_objects(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END
$$;
