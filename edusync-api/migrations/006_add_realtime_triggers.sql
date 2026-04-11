-- Migration 006: Realtime triggers for WebSocket notification forwarding
-- Phase 4A: EduSync Realtime subsystem
--
-- Creates a generic trigger function `notify_change()` that fires
-- pg_notify whenever rows are inserted, updated, or deleted on the
-- tables that drive real-time features.
--
-- Payload format sent over pg_notify:
-- {
--   "table":     "<table_name>",
--   "event":     "INSERT" | "UPDATE" | "DELETE",
--   "tenant_id": "<uuid or null>",
--   "record":    { <new row for INSERT/UPDATE, old row for DELETE> },
--   "old":       { <old row for UPDATE, null otherwise> }
-- }
--
-- PostgreSQL channels:
--   notify_notifications  → WS: notifications:{user_id}
--   notify_messages       → WS: messages:{room_id}
--   notify_discussions    → WS: discussions:tenant:{tenant_id}
--   notify_classroom      → WS: classroom:{class_id}
--   notify_builder        → WS: builder:{course_id}
--
-- NOTE: pg_notify payload is capped at 8000 bytes by PostgreSQL.
-- Large JSONB columns in the NEW row may cause a silent truncation;
-- to avoid this we select only the columns that realtime clients need.
-- For simplicity this migration uses to_jsonb(NEW) and relies on the
-- Rust handler to tolerate partially truncated payloads gracefully.

-- ── Generic notify function ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.notify_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _payload  jsonb;
    _channel  text;
    _payload_text text;
BEGIN
    -- Build a compact payload.
    _payload := jsonb_build_object(
        'table',     TG_TABLE_NAME,
        'event',     TG_OP,
        'tenant_id', COALESCE(
                         (NEW.tenant_id)::text,
                         (OLD.tenant_id)::text
                     ),
        'record',    CASE TG_OP
                         WHEN 'DELETE' THEN to_jsonb(OLD)
                         ELSE to_jsonb(NEW)
                     END,
        'old',       CASE TG_OP
                         WHEN 'UPDATE' THEN to_jsonb(OLD)
                         ELSE NULL
                     END
    );

    _channel := 'notify_' || TG_TABLE_NAME;
    _payload_text := _payload::text;

    -- PostgreSQL truncates pg_notify payloads at 8000 bytes.
    -- Log a warning if we're close to the limit so ops can detect it.
    IF length(_payload_text) > 7500 THEN
        RAISE WARNING 'notify_change: payload untuk channel % mendekati batas 8000 byte (% byte)',
            _channel, length(_payload_text);
    END IF;

    -- Fire the notification; failures are non-fatal.
    BEGIN
        PERFORM pg_notify(_channel, _payload_text);
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'notify_change: pg_notify gagal untuk channel %: %', _channel, SQLERRM;
    END;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.notify_change() IS
    'Generic AFTER trigger function that fires pg_notify for WebSocket forwarding (Phase 4A).';

-- ── notifications table ────────────────────────────────────────────────────────
-- Channel: notify_notifications → WS: notifications:{record.user_id}

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        RAISE NOTICE 'Tabel notifications tidak ditemukan — trigger notify_notifications dilewati';
    ELSE
        -- Drop if already exists (idempotent re-run).
        DROP TRIGGER IF EXISTS notify_notifications ON public.notifications;
        CREATE TRIGGER notify_notifications
            AFTER INSERT OR UPDATE ON public.notifications
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();
        RAISE NOTICE 'Trigger notify_notifications dibuat pada tabel notifications';
    END IF;
END;
$$;

-- ── messages table ─────────────────────────────────────────────────────────────
-- Channel: notify_messages → WS: messages:{record.room_id}

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'messages'
    ) THEN
        RAISE NOTICE 'Tabel messages tidak ditemukan — trigger notify_messages dilewati';
    ELSE
        DROP TRIGGER IF EXISTS notify_messages ON public.messages;
        CREATE TRIGGER notify_messages
            AFTER INSERT OR UPDATE ON public.messages
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();
        RAISE NOTICE 'Trigger notify_messages dibuat pada tabel messages';
    END IF;
END;
$$;

-- ── discussions table ──────────────────────────────────────────────────────────
-- Channel: notify_discussions → WS: discussions:tenant:{tenant_id}

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'discussions'
    ) THEN
        RAISE NOTICE 'Tabel discussions tidak ditemukan — trigger notify_discussions dilewati';
    ELSE
        DROP TRIGGER IF EXISTS notify_discussions ON public.discussions;
        CREATE TRIGGER notify_discussions
            AFTER INSERT OR UPDATE OR DELETE ON public.discussions
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();
        RAISE NOTICE 'Trigger notify_discussions dibuat pada tabel discussions';
    END IF;
END;
$$;

-- ── classroom trigger ──────────────────────────────────────────────────────────
-- Channel: notify_classroom → WS: classroom:{record.class_id or record.id}
-- Prefers classroom_activities, falls back to classes.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'classroom_activities'
    ) THEN
        DROP TRIGGER IF EXISTS notify_classroom ON public.classroom_activities;
        CREATE TRIGGER notify_classroom
            AFTER INSERT OR UPDATE ON public.classroom_activities
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();
        RAISE NOTICE 'Trigger notify_classroom dibuat pada tabel classroom_activities';
    ELSIF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'classes'
    ) THEN
        DROP TRIGGER IF EXISTS notify_classroom ON public.classes;
        CREATE TRIGGER notify_classroom
            AFTER INSERT OR UPDATE ON public.classes
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();
        RAISE NOTICE 'Trigger notify_classroom dibuat pada tabel classes';
    ELSE
        RAISE NOTICE 'Tabel classroom_activities maupun classes tidak ditemukan — trigger notify_classroom dilewati';
    END IF;
END;
$$;

-- ── courses table (builder collaboration) ─────────────────────────────────────
-- Channel: notify_builder → WS: builder:{record.id}

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'courses'
    ) THEN
        RAISE NOTICE 'Tabel courses tidak ditemukan — trigger notify_builder dilewati';
    ELSE
        DROP TRIGGER IF EXISTS notify_builder ON public.courses;
        CREATE TRIGGER notify_builder
            AFTER INSERT OR UPDATE ON public.courses
            FOR EACH ROW EXECUTE FUNCTION public.notify_change();
        RAISE NOTICE 'Trigger notify_builder dibuat pada tabel courses';
    END IF;
END;
$$;
