-- =============================================================
-- EduSync LMS — Migration 005: Feature Flags
-- Tanggal: 2026-03-22
-- =============================================================
-- Sistem feature flag untuk toggleable features per tenant.
-- Mendukung: global on/off, tenant whitelist, rollout persentase.
-- =============================================================

-- ── Feature Flags ─────────────────────────────────────────────────────────
-- Satu baris per flag. Feature flag bersifat global; tenant_ids adalah
-- whitelist tenant yang mendapat akses meskipun enabled=false, atau yang
-- dikecualikan jika rollout_percentage < 100.
CREATE TABLE IF NOT EXISTS feature_flags (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name           TEXT    NOT NULL UNIQUE,
  enabled             BOOLEAN NOT NULL DEFAULT false,
  -- Daftar tenant yang selalu mendapat akses (override rollout_percentage)
  tenant_ids          UUID[]  NOT NULL DEFAULT '{}',
  -- 0-100: persentase tenant yang mendapat akses saat enabled=true
  rollout_percentage  INT     NOT NULL DEFAULT 0,
  metadata            JSONB   NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_rollout_percentage CHECK (rollout_percentage BETWEEN 0 AND 100)
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Index untuk lookup cepat berdasarkan nama flag
CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_flag_name
  ON feature_flags(flag_name);

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- Semua pengguna terautentikasi boleh membaca flags (frontend perlu ini)
CREATE POLICY "authenticated_users_read_flags"
  ON feature_flags FOR SELECT
  TO authenticated
  USING (true);

-- Hanya admin yang boleh mengubah flags
-- Catatan: admin di sini berarti admin di tenant mana pun (super-admin)
-- Untuk keamanan lebih ketat, tambahkan tabel super_admins
CREATE POLICY "admins_manage_flags"
  ON feature_flags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND role      = 'admin'
    )
  );

-- ── Seed: Flag awal ───────────────────────────────────────────────────────
-- Menggunakan INSERT ... ON CONFLICT DO NOTHING agar migration aman di-rerun.
INSERT INTO feature_flags (flag_name, enabled, tenant_ids, rollout_percentage, metadata)
VALUES
  (
    'offline_quiz',
    false,
    '{}',
    10,
    '{"description": "Quiz dapat dikerjakan dalam mode offline dengan sync otomatis", "category": "learning"}'
  ),
  (
    'push_notifications',
    false,
    '{}',
    0,
    '{"description": "Web Push notifications untuk notifikasi real-time", "category": "engagement", "requires": "VAPID_PUBLIC_KEY"}'
  ),
  (
    'ai_tutor_v2',
    false,
    '{}',
    0,
    '{"description": "AI Tutor generasi kedua dengan konteks percakapan lebih panjang", "category": "ai", "requires": "OPENAI_API_KEY"}'
  ),
  (
    'gradebook_export_pdf',
    true,
    '{}',
    100,
    '{"description": "Export gradebook ke PDF dengan template sekolah", "category": "gradebook"}'
  ),
  (
    'bulk_operations',
    true,
    '{}',
    100,
    '{"description": "Operasi massal pada siswa, kursus, dan tugas", "category": "admin"}'
  ),
  (
    'discussion_threads',
    true,
    '{}',
    100,
    '{"description": "Forum diskusi berjenjang (thread) dalam kursus", "category": "social"}'
  ),
  (
    'certificate_generator',
    true,
    '{}',
    100,
    '{"description": "Generate sertifikat penyelesaian kursus otomatis", "category": "achievement"}'
  ),
  (
    'analytics_dashboard_v2',
    false,
    '{}',
    25,
    '{"description": "Dashboard analitik generasi kedua dengan lebih banyak visualisasi", "category": "analytics"}'
  )
ON CONFLICT (flag_name) DO NOTHING;

-- ── RPC: Periksa apakah fitur aktif untuk tenant ─────────────────────────
-- Logika:
--   1. Jika flag tidak ditemukan → false
--   2. Jika tenant ada di whitelist tenant_ids → true
--   3. Jika enabled = false → false
--   4. Jika rollout_percentage = 100 → true
--   5. Jika rollout_percentage = 0 → false
--   6. Sinon: deterministic hash dari (flag_name, tenant_id) mod 100 < rollout_percentage
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_flag_name TEXT,
  p_tenant_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_flag            feature_flags%ROWTYPE;
  v_hash_value      INT;
BEGIN
  SELECT * INTO v_flag
  FROM feature_flags
  WHERE flag_name = p_flag_name;

  -- Flag tidak ada → disabled
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Tenant dalam whitelist → selalu aktif
  IF p_tenant_id = ANY(v_flag.tenant_ids) THEN
    RETURN true;
  END IF;

  -- Flag dimatikan global
  IF NOT v_flag.enabled THEN
    RETURN false;
  END IF;

  -- Rollout penuh
  IF v_flag.rollout_percentage = 100 THEN
    RETURN true;
  END IF;

  -- Tidak ada rollout
  IF v_flag.rollout_percentage = 0 THEN
    RETURN false;
  END IF;

  -- Rollout parsial: hash deterministik untuk konsistensi per tenant
  -- Menggunakan hashtext agar tenant yang sama selalu dapat hasil yang sama
  v_hash_value := ABS(hashtext(p_flag_name || p_tenant_id::TEXT)) % 100;
  RETURN v_hash_value < v_flag.rollout_percentage;
END;
$$;

-- ── RPC: Ambil semua flag beserta status untuk tenant tertentu ────────────
-- Dipakai oleh frontend saat inisialisasi untuk muat semua flags sekaligus,
-- menghindari N+1 panggilan is_feature_enabled.
CREATE OR REPLACE FUNCTION get_feature_flags_for_tenant(
  p_tenant_id UUID
) RETURNS TABLE (
  flag_name  TEXT,
  is_enabled BOOLEAN,
  metadata   JSONB
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ff.flag_name,
    is_feature_enabled(ff.flag_name, p_tenant_id) AS is_enabled,
    ff.metadata
  FROM feature_flags ff
  ORDER BY ff.flag_name;
END;
$$;

-- ── Trigger: updated_at otomatis ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_feature_flags_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS feature_flags_updated_at ON feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION trg_feature_flags_updated_at();
