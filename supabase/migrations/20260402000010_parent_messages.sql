-- =============================================================================
-- Migration 20260402000010: Parent-Teacher Messaging
-- Wave 4 — Task 29.5: Message Teacher Feature
-- =============================================================================
-- Membuat tabel parent_teacher_threads dan parent_teacher_messages untuk
-- fitur pesan langsung antara orang tua dan guru.
-- Real-time via Supabase Realtime subscription.
-- =============================================================================

-- Thread percakapan parent-teacher
CREATE TABLE IF NOT EXISTS public.parent_teacher_threads (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               uuid        NOT NULL REFERENCES public.tenants(id),
  parent_id               uuid        NOT NULL REFERENCES auth.users(id),
  teacher_id              uuid        NOT NULL REFERENCES auth.users(id),
  student_id              uuid        NOT NULL REFERENCES public.profiles(id),
  subject                 text,
  last_message_at         timestamptz DEFAULT now(),
  parent_unread_count     integer     NOT NULL DEFAULT 0,
  teacher_unread_count    integer     NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, teacher_id, student_id, tenant_id)
);

-- Pesan dalam thread
CREATE TABLE IF NOT EXISTS public.parent_teacher_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid        NOT NULL REFERENCES public.parent_teacher_threads(id) ON DELETE CASCADE,
  tenant_id   uuid        NOT NULL REFERENCES public.tenants(id),
  sender_id   uuid        NOT NULL REFERENCES auth.users(id),
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Aktifkan RLS
ALTER TABLE public.parent_teacher_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_teacher_messages ENABLE ROW LEVEL SECURITY;

-- ── RLS: parent_teacher_threads ──────────────────────────────────────────────

-- Parent atau teacher bisa melihat thread mereka sendiri
CREATE POLICY "parent_own_threads" ON public.parent_teacher_threads
  FOR ALL USING (
    parent_id = auth.uid()
    OR teacher_id = auth.uid()
    OR (
      tenant_id = get_my_tenant_id()
      AND has_role('ADMIN'::public.app_role)
    )
  );

-- ── RLS: parent_teacher_messages ─────────────────────────────────────────────

-- Hanya participant thread yang bisa melihat/kirim pesan
CREATE POLICY "thread_messages_access" ON public.parent_teacher_messages
  FOR ALL USING (
    tenant_id = get_my_tenant_id()
    AND thread_id IN (
      SELECT id FROM public.parent_teacher_threads
      WHERE parent_id = auth.uid() OR teacher_id = auth.uid()
    )
  );

-- ── Triggers: auto_set_tenant_id ─────────────────────────────────────────────

CREATE TRIGGER auto_set_tenant_id_threads
  BEFORE INSERT ON public.parent_teacher_threads
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

CREATE TRIGGER auto_set_tenant_id_messages
  BEFORE INSERT ON public.parent_teacher_messages
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- ── Trigger: update last_message_at dan unread_count setelah insert pesan ────

CREATE OR REPLACE FUNCTION public.trg_update_thread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_parent_id   uuid;
  v_teacher_id  uuid;
BEGIN
  -- Ambil parent_id dan teacher_id dari thread
  SELECT parent_id, teacher_id
  INTO v_parent_id, v_teacher_id
  FROM public.parent_teacher_threads
  WHERE id = NEW.thread_id;

  -- Update last_message_at dan unread_count sesuai penerima
  IF NEW.sender_id = v_parent_id THEN
    -- Parent kirim → tambah unread guru
    UPDATE public.parent_teacher_threads
    SET
      last_message_at = NEW.created_at,
      teacher_unread_count = teacher_unread_count + 1
    WHERE id = NEW.thread_id;
  ELSE
    -- Guru kirim → tambah unread orang tua
    UPDATE public.parent_teacher_threads
    SET
      last_message_at = NEW.created_at,
      parent_unread_count = parent_unread_count + 1
    WHERE id = NEW.thread_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_thread_on_message
  AFTER INSERT ON public.parent_teacher_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_update_thread_on_message();

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_thread_parent
  ON public.parent_teacher_threads (parent_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_thread_teacher
  ON public.parent_teacher_threads (teacher_id, tenant_id);

CREATE INDEX IF NOT EXISTS idx_thread_last_message
  ON public.parent_teacher_threads (tenant_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON public.parent_teacher_messages (thread_id, created_at DESC);

-- ── Enable Realtime untuk tabel messages ─────────────────────────────────────
-- Catatan: Aktifkan via Supabase Dashboard → Database → Replication
-- atau jalankan perintah berikut jika supabase realtime enabled:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_teacher_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_teacher_threads;
