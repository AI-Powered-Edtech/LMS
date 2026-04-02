-- =============================================================================
-- Migration 20260402000009: Parent Digest Settings
-- Wave 4 — Task 29.4: Daily Digest Notification
-- =============================================================================
-- Tabel konfigurasi digest harian per orang tua.
-- Edge Function send-parent-digest dipanggil pg_cron setiap hari jam 17:00 WIB.
-- =============================================================================

-- Tabel konfigurasi digest per parent
CREATE TABLE IF NOT EXISTS public.parent_digest_settings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id       uuid        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  digest_enabled  boolean     NOT NULL DEFAULT true,
  digest_time     time        NOT NULL DEFAULT '17:00',
  channel         text        NOT NULL DEFAULT 'inapp'
                              CHECK (channel IN ('inapp', 'whatsapp', 'email')),
  last_sent_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_id, tenant_id)
);

ALTER TABLE public.parent_digest_settings ENABLE ROW LEVEL SECURITY;

-- Orang tua hanya bisa melihat dan mengelola pengaturan digest milik sendiri
CREATE POLICY "parent_own_digest_settings" ON public.parent_digest_settings
  FOR ALL USING (parent_id = auth.uid());

-- Admin bisa melihat semua settings dalam tenant
CREATE POLICY "admin_view_digest_settings" ON public.parent_digest_settings
  FOR SELECT USING (
    tenant_id = get_my_tenant_id()
    AND has_role('ADMIN'::public.app_role)
  );

-- Auto-set tenant_id via existing trigger function
CREATE TRIGGER auto_set_tenant_id_parent_digest
  BEFORE INSERT ON public.parent_digest_settings
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_tenant_id();

-- Index untuk Edge Function: cari parent yang digest_enabled = true per tenant
CREATE INDEX IF NOT EXISTS idx_parent_digest_tenant_enabled
  ON public.parent_digest_settings (tenant_id, digest_enabled, digest_time)
  WHERE digest_enabled = true;

CREATE INDEX IF NOT EXISTS idx_parent_digest_parent_id
  ON public.parent_digest_settings (parent_id, tenant_id);

-- =============================================================================
-- Perluas constraint type pada tabel notifications untuk mendukung
-- tipe notifikasi digest harian orang tua.
-- notifications.type sebelumnya hanya ada 8 tipe (migrasi 003).
-- =============================================================================

-- Hapus constraint lama dan ganti dengan yang baru (termasuk parent_daily_digest)
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notification_type;

ALTER TABLE public.notifications
  ADD CONSTRAINT chk_notification_type CHECK (
    type IN (
      'grade_posted',
      'assignment_due',
      'quiz_available',
      'announcement',
      'course_enrolled',
      'badge_earned',
      'discussion_reply',
      'system',
      'parent_daily_digest',
      'parent_message'
    )
  );
