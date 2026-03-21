-- =============================================================
-- EduSync LMS — Migration 003: Notifications System
-- Tanggal: 2026-03-22
-- =============================================================
-- Membuat tabel notifications dan notification_preferences beserta
-- RLS policies, indexes, dan RPC helpers untuk sistem notifikasi.
-- =============================================================

-- ── Notifications ─────────────────────────────────────────────────────────
-- Menyimpan setiap notifikasi yang dikirim ke pengguna. Tabel ini dibaca
-- secara real-time oleh frontend via Supabase Realtime subscription.
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  user_id     UUID        NOT NULL,
  -- Tipe notifikasi: menentukan icon, warna, dan routing klik
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  is_read     BOOLEAN     NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  -- Flag untuk email digest (diset oleh send-email-digest edge function)
  email_sent  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_notification_type CHECK (
    type IN (
      'grade_posted',
      'assignment_due',
      'quiz_available',
      'announcement',
      'course_enrolled',
      'badge_earned',
      'discussion_reply',
      'system'
    )
  )
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Index utama: user melihat notifikasi terbaru yang belum dibaca
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

-- Index untuk email digest: cari notifikasi belum terkirim per tenant
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user
  ON notifications(tenant_id, user_id);

-- Partial index: hanya notifikasi belum dibaca (paling sering di-query)
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- ── Notification Preferences ───────────────────────────────────────────────
-- Preferensi notifikasi per pengguna: channel, quiet hours, tipe yang
-- dinonaktifkan, dan Web Push subscription.
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL,
  user_id             UUID        NOT NULL UNIQUE,
  email_enabled       BOOLEAN     NOT NULL DEFAULT true,
  push_enabled        BOOLEAN     NOT NULL DEFAULT false,
  -- Jam tenang: notifikasi tidak dikirim di luar jam ini
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,
  -- Tipe yang dinonaktifkan oleh user (array text)
  disabled_types      TEXT[]      NOT NULL DEFAULT '{}',
  -- Web Push PushSubscription object (endpoint + keys)
  push_subscription   JSONB,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notification_prefs_tenant_user
  ON notification_preferences(tenant_id, user_id);

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- notifications: pengguna hanya melihat notifikasi milik sendiri
CREATE POLICY "users_view_own_notifications"
  ON notifications FOR SELECT
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND user_id = auth.uid()
  );

-- notifications: pengguna boleh update (mark as read) notifikasi sendiri
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND user_id = auth.uid()
  );

-- notifications: hanya service role yang bisa INSERT (via RPC atau edge function)
-- Frontend tidak boleh insert langsung — notifikasi dibuat melalui trigger/RPC
CREATE POLICY "service_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_my_tenant_id())
  );

-- notification_preferences: pengguna mengelola preferensi sendiri
CREATE POLICY "users_manage_own_preferences"
  ON notification_preferences FOR ALL
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND user_id = auth.uid()
  );

-- ── RPC: Tandai notifikasi sebagai sudah dibaca ───────────────────────────
-- Menerima daftar notification_id dan menandainya read sekaligus.
-- Hanya memproses notifikasi milik caller; ID asing diabaikan dengan aman.
-- Mengembalikan jumlah baris yang diperbarui.
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_user_id         UUID,
  p_notification_ids UUID[]
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  -- Pastikan hanya bisa menandai notifikasi milik sendiri
  IF auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Akses ditolak: hanya dapat menandai notifikasi milik sendiri';
  END IF;

  UPDATE notifications
  SET
    is_read = true,
    read_at = now()
  WHERE user_id   = p_user_id
    AND id        = ANY(p_notification_ids)
    AND is_read   = false;  -- Hanya update yang belum dibaca (efisiensi)

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ── RPC: Buat notifikasi baru ─────────────────────────────────────────────
-- Dipanggil oleh trigger database, edge functions, atau RPC lain.
-- Menghormati notification_preferences: lewati jika tipe dinonaktifkan user.
-- Mengembalikan UUID notifikasi yang dibuat, atau NULL jika dilewati.
CREATE OR REPLACE FUNCTION create_notification(
  p_tenant_id UUID,
  p_user_id   UUID,
  p_type      TEXT,
  p_title     TEXT,
  p_body      TEXT,
  p_metadata  JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notification_id UUID;
  v_disabled_types  TEXT[];
BEGIN
  -- Cek apakah tipe ini dinonaktifkan oleh user
  SELECT disabled_types INTO v_disabled_types
  FROM notification_preferences
  WHERE user_id   = p_user_id
    AND tenant_id = p_tenant_id;

  -- Jika tipe ada di daftar dinonaktifkan, lewati pembuatan notifikasi
  IF v_disabled_types IS NOT NULL AND p_type = ANY(v_disabled_types) THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (
    tenant_id,
    user_id,
    type,
    title,
    body,
    metadata
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_type,
    p_title,
    p_body,
    COALESCE(p_metadata, '{}')
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ── RPC: Jumlah notifikasi belum dibaca ──────────────────────────────────
-- Helper ringan untuk notification bell badge.
CREATE OR REPLACE FUNCTION get_unread_notification_count(
  p_user_id UUID
) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Akses ditolak';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM notifications
  WHERE user_id = p_user_id
    AND is_read = false;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ── Trigger: Tandai read_at saat is_read diubah jadi true ────────────────
CREATE OR REPLACE FUNCTION trg_set_notification_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_notification_read_at ON notifications;
CREATE TRIGGER set_notification_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_set_notification_read_at();
