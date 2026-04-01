-- =============================================================
-- EduSync LMS — Migration 004: Tenant Onboarding
-- Tanggal: 2026-03-22
-- =============================================================
-- Membuat tabel tenant_invitations dan onboarding_progress beserta
-- RLS policies, indexes, dan RPC validate_invitation.
-- =============================================================

-- ── Tenant Invitations ────────────────────────────────────────────────────
-- Admin tenant mengundang guru atau staf baru via email. Token berumur 7 hari
-- dan hanya bisa digunakan sekali (accepted_at diset saat dipakai).
CREATE TABLE IF NOT EXISTS tenant_invitations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  email       TEXT        NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'teacher',
  status      TEXT        NOT NULL DEFAULT 'pending',
  -- Token unik yang dikirim via email; bukan sequential agar tidak bisa ditebak
  token       UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  invited_by  UUID        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_invitation_role CHECK (lower(role) IN ('teacher', 'admin', 'student')),
  CONSTRAINT chk_invitation_status CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  -- Email harus valid (format dasar)
  CONSTRAINT chk_invitation_email CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

ALTER TABLE tenant_invitations ENABLE ROW LEVEL SECURITY;

-- Index untuk pencarian undangan berdasarkan tenant + email (admin view)
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_email
  ON tenant_invitations(tenant_id, email);

-- Index untuk lookup token saat user mengklik link undangan
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_invitations_token
  ON tenant_invitations(token);

-- Partial index: undangan aktif (belum expired, belum accepted)
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_active
  ON tenant_invitations(tenant_id, email)
  WHERE accepted_at IS NULL;

-- ── Onboarding Progress ───────────────────────────────────────────────────
-- Melacak langkah-langkah onboarding yang sudah diselesaikan setiap pengguna.
-- steps_completed adalah JSONB map: { "profile_complete": true, "first_course": true, ... }
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL,
  user_id         UUID        NOT NULL UNIQUE,
  -- Map langkah onboarding ke boolean; fleksibel untuk menambah langkah baru
  steps_completed JSONB       NOT NULL DEFAULT '{}',
  -- Diset saat semua langkah wajib selesai
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_tenant_user
  ON onboarding_progress(tenant_id, user_id);

-- ── RLS Policies ────────────────────────────────────────────────────────────

-- tenant_invitations: admin mengelola semua undangan dalam tenant mereka
CREATE POLICY "admins_manage_invitations"
  ON tenant_invitations FOR ALL
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'ADMIN'
    )
  );

-- tenant_invitations: siapapun boleh membaca token undangan yang masih aktif untuk validasi
-- (token bersifat seperti password sementara; tanpa akses ini, validate_invitation
-- tidak bisa diakses oleh user yang belum login)
-- Hanya undangan berstatus 'pending' yang dapat dibaca — undangan revoked atau expired tidak boleh terekspos.
CREATE POLICY "public_read_valid_invitation"
  ON tenant_invitations FOR SELECT
  USING (
    status = 'pending'
    AND accepted_at IS NULL
    AND expires_at > now()
  );

-- onboarding_progress: pengguna mengelola progress onboarding sendiri
CREATE POLICY "users_manage_own_onboarding"
  ON onboarding_progress FOR ALL
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND user_id = auth.uid()
  );

-- onboarding_progress: admin dapat membaca progress semua pengguna dalam tenant
CREATE POLICY "admins_view_onboarding_progress"
  ON onboarding_progress FOR SELECT
  USING (
    tenant_id = (SELECT get_my_tenant_id())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'ADMIN'
    )
  );

-- ── RPC: Validasi token undangan ─────────────────────────────────────────
-- Dipanggil saat user mengklik link undangan sebelum mendaftar.
-- Mengembalikan detail undangan atau objek error.
-- Tidak memerlukan autentikasi (user belum punya akun saat klik link).
CREATE OR REPLACE FUNCTION validate_invitation(
  p_token UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation tenant_invitations%ROWTYPE;
  v_result     JSONB;
BEGIN
  -- Cari undangan berdasarkan token
  SELECT * INTO v_invitation
  FROM tenant_invitations
  WHERE token = p_token;

  -- Token tidak ditemukan
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid',   false,
      'error',   'Token undangan tidak ditemukan',
      'code',    'INVITATION_NOT_FOUND'
    );
  END IF;

  -- Undangan sudah digunakan
  IF v_invitation.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid',       false,
      'error',       'Undangan sudah pernah digunakan',
      'code',        'INVITATION_ALREADY_ACCEPTED',
      'accepted_at', v_invitation.accepted_at
    );
  END IF;

  -- Undangan sudah kadaluarsa
  IF v_invitation.expires_at <= now() THEN
    RETURN jsonb_build_object(
      'valid',      false,
      'error',      'Undangan sudah kadaluarsa',
      'code',       'INVITATION_EXPIRED',
      'expired_at', v_invitation.expires_at
    );
  END IF;

  -- Undangan valid
  RETURN jsonb_build_object(
    'valid',      true,
    'id',         v_invitation.id,
    'tenant_id',  v_invitation.tenant_id,
    'email',      v_invitation.email,
    'role',       v_invitation.role,
    'expires_at', v_invitation.expires_at,
    'invited_by', v_invitation.invited_by
  );
END;
$$;

-- ── RPC: Tandai undangan sebagai diterima ─────────────────────────────────
-- Dipanggil setelah user berhasil mendaftar menggunakan token undangan.
CREATE OR REPLACE FUNCTION accept_invitation(
  p_token UUID
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_validation JSONB;
  v_invitation tenant_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan untuk menerima undangan';
  END IF;

  -- Validasi dulu
  v_validation := validate_invitation(p_token);
  IF NOT (v_validation->>'valid')::BOOLEAN THEN
    RETURN v_validation;
  END IF;

  -- Tandai sebagai diterima
  UPDATE tenant_invitations
  SET accepted_at = now()
  WHERE token = p_token
  RETURNING * INTO v_invitation;

  RETURN jsonb_build_object(
    'success',   true,
    'tenant_id', v_invitation.tenant_id,
    'role',      v_invitation.role
  );
END;
$$;

-- ── RPC: Buat / perbarui langkah onboarding ──────────────────────────────
-- Upsert satu langkah ke steps_completed. Frontend memanggil ini setiap kali
-- user menyelesaikan satu langkah onboarding.
CREATE OR REPLACE FUNCTION complete_onboarding_step(
  p_step_name TEXT,
  p_metadata  JSONB DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_progress  onboarding_progress%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autentikasi diperlukan';
  END IF;

  v_tenant_id := (SELECT get_my_tenant_id());

  -- Upsert progress record
  INSERT INTO onboarding_progress (tenant_id, user_id, steps_completed)
  VALUES (
    v_tenant_id,
    auth.uid(),
    jsonb_build_object(p_step_name, jsonb_build_object('done', true, 'at', now(), 'meta', p_metadata))
  )
  ON CONFLICT (user_id) DO UPDATE SET
    steps_completed = onboarding_progress.steps_completed ||
      jsonb_build_object(p_step_name, jsonb_build_object('done', true, 'at', now(), 'meta', p_metadata));

  SELECT * INTO v_progress
  FROM onboarding_progress
  WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'success',         true,
    'steps_completed', v_progress.steps_completed,
    'completed_at',    v_progress.completed_at
  );
END;
$$;
