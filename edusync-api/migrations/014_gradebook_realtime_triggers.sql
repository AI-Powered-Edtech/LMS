-- Migration: 014_gradebook_realtime_triggers.sql
-- Purpose: Add realtime triggers for gradebook tables to enable live updates via WebSocket

-- Add trigger for gradebook_entries table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'gradebook_entries'
    ) THEN
        DROP TRIGGER IF EXISTS notify_gradebook_entries ON public.gradebook_entries;
        CREATE TRIGGER notify_gradebook_entries
            AFTER INSERT OR UPDATE OR DELETE ON public.gradebook_entries
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();

        RAISE NOTICE 'Created trigger notify_gradebook_entries';
    ELSE
        RAISE NOTICE 'Table gradebook_entries does not exist, skipping trigger creation';
    END IF;
END;
$$;

-- Add trigger for gradebook_settings table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'gradebook_settings'
    ) THEN
        DROP TRIGGER IF EXISTS notify_gradebook_settings ON public.gradebook_settings;
        CREATE TRIGGER notify_gradebook_settings
            AFTER INSERT OR UPDATE OR DELETE ON public.gradebook_settings
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();

        RAISE NOTICE 'Created trigger notify_gradebook_settings';
    ELSE
        RAISE NOTICE 'Table gradebook_settings does not exist, skipping trigger creation';
    END IF;
END;
$$;

-- Add trigger for gradebook_columns table (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'gradebook_columns'
    ) THEN
        DROP TRIGGER IF EXISTS notify_gradebook_columns ON public.gradebook_columns;
        CREATE TRIGGER notify_gradebook_columns
            AFTER INSERT OR UPDATE OR DELETE ON public.gradebook_columns
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();

        RAISE NOTICE 'Created trigger notify_gradebook_columns';
    ELSE
        RAISE NOTICE 'Table gradebook_columns does not exist, skipping trigger creation';
    END IF;
END;
$$;

-- Comments
COMMENT ON TRIGGER notify_gradebook_entries ON public.gradebook_entries IS
  'Trigger untuk realtime updates saat nilai berubah';
COMMENT ON TRIGGER notify_gradebook_settings ON public.gradebook_settings IS
  'Trigger untuk realtime updates saat pengaturan gradebook berubah';
