-- =============================================================================
-- Migration 20260405000002: Enable Realtime for Parent-Teacher Messaging
-- Sprint 0.5 — Fix: tables were never added to supabase_realtime publication
-- =============================================================================
-- Previously in 20260402000010_parent_messages.sql, the ALTER PUBLICATION
-- statements were commented out, preventing Realtime subscriptions from
-- delivering messages in useMessages.ts hook.
-- =============================================================================

-- Add tables to supabase_realtime publication
DO $$
BEGIN
  -- Add parent_teacher_messages if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'parent_teacher_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_teacher_messages;
  END IF;

  -- Add parent_teacher_threads if not already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'parent_teacher_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_teacher_threads;
  END IF;
END;
$$;
