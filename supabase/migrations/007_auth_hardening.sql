-- =============================================================
-- EduSync LMS — Migration 007: Auth Hardening
-- Tanggal: 2026-03-22
-- =============================================================
-- Audit log semua event autentikasi dan mekanisme rate limiting
-- untuk login attempts (5 percobaan → lock 15 menit).
-- =============================================================

-- ── Auth Audit Log ───────────────────────────────────────────────────────
-- Rekaman append-only semua event auth: login, logout, token refresh,
-- password reset, dll. Digunakan untuk security monitoring dan compliance.
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  event       TEXT        NOT NULL,
  user_id     UUID,       -- NULL untuk event pra-autentikasi (login gagal)
  email       TEXT,
  ip_address  TEXT,
  user_agent  TEXT,
  success     BOOLEAN     NOT NULL DEFAULT true,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_auth_event CHECK (
    event IN (
      'login',
      'logout',
      'login_failed',
      'password_reset_requested',
      'password_reset_completed',
      'token_refreshed',
      'account_locked',
      'account_unlocked',
      'invitation_accepted',
      'signup'
    )
  )
);

ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Index untuk security review: event per user
CREATE INDEX IF NOT EXISTS idx_auth_audit_user_time
  ON auth_audit_log(user_id, created_at DESC);

-- Index untuk analisis pola serangan: email tertentu dalam waktu singkat
CREATE INDEX IF NOT EXISTS idx_auth_audit_email_time
  ON auth_audit_log(email, created_at DESC);

-- Index untuk alert: hanya event gagal — lebih kecil, lebih cepat
CREATE INDEX IF NOT EXISTS idx_auth_audit_failures
  ON auth_audit_log(email, created_at DESC)
  WHERE success = false;

-- ── Login Attempts (Rate Limiting) ────────────────────────────────────────
-- Melacak percobaan login per email. Setelah MAX_ATTEMPTS kali gagal,
-- akun dikunci selama LOCK_DURATION. Hanya bisa di-reset oleh service role
-- (Edge Function atau admin).
CREATE TABLE IF NOT EXISTS login_attempts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT        NOT NULL UNIQUE,
  attempts        INT         NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ
);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Hanya service role yang boleh akses tabel ini
-- (bukan via JWT — tidak ada policy TO authenticated)
CREATE POLICY "service_role_only_login_attempts"
  ON login_attempts FOR ALL
  USING (false);  -- Semua akses diblokir kecuali service role (bypass RLS)

-- Index untuk cek cepat apakah email sedang terkunci
CREATE INDEX IF NOT EXISTS idx_login_attempts_email
  ON login_attempts(email, last_attempt_at);

-- ── RLS Policies untuk auth_audit_log ────────────────────────────────────

-- Admin dapat membaca log audit dalam tenant mereka
-- (user_id harus dicocokkan ke tenant via user_roles)
CREATE POLICY "admins_read_audit_log"
  ON auth_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id   = auth.uid()
        AND tenant_id = (SELECT get_my_tenant_id())
        AND role      = 'ADMIN'
    )
  );

-- Insert hanya melalui RPC record_login_attempt (SECURITY DEFINER)
-- Tidak ada policy INSERT untuk authenticated users
CREATE POLICY "service_insert_audit_log"
  ON auth_audit_log FOR INSERT
  WITH CHECK (true);  -- SECURITY DEFINER RPC yang mengatur siapa yang bisa insert

-- ── Konstanta Rate Limiting ───────────────────────────────────────────────
-- MAX_ATTEMPTS = 5: lebih dari ini akun dikunci
-- LOCK_DURATION = 15 menit
-- Nilai ini dikode keras di fungsi; ubah di satu tempat jika perlu diubah.

-- ── RPC: Rekam percobaan login dan cek/terapkan lock ─────────────────────
-- Dipanggil oleh Edge Function auth-hook atau frontend setelah setiap percobaan.
-- Mengembalikan JSONB: { locked, locked_until, attempts }
-- Dipanggil dengan service_role dari sisi server — tidak boleh dari client.
CREATE OR REPLACE FUNCTION record_login_attempt(
  p_email   TEXT,
  p_success BOOLEAN
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  c_max_attempts   CONSTANT INT := 5;
  c_lock_duration  CONSTANT INTERVAL := INTERVAL '15 minutes';
  v_rec            login_attempts%ROWTYPE;
  v_new_attempts   INT;
  v_locked_until   TIMESTAMPTZ;
BEGIN
  -- Upsert record untuk email ini
  INSERT INTO login_attempts (email, attempts, last_attempt_at)
  VALUES (p_email, 0, now())
  ON CONFLICT (email) DO NOTHING;

  SELECT * INTO v_rec
  FROM login_attempts
  WHERE email = p_email
  FOR UPDATE;  -- Lock row untuk update konkuren yang aman

  IF p_success THEN
    -- Login berhasil: reset counter dan hapus lock
    UPDATE login_attempts
    SET attempts        = 0,
        locked_until    = NULL,
        last_attempt_at = now()
    WHERE email = p_email;

    -- Catat di audit log
    INSERT INTO auth_audit_log (event, email, success, metadata)
    VALUES ('login', p_email, true, jsonb_build_object('reset_attempts', v_rec.attempts));

    RETURN jsonb_build_object(
      'locked',       false,
      'locked_until', NULL,
      'attempts',     0
    );
  ELSE
    -- Login gagal: tambah counter
    v_new_attempts := v_rec.attempts + 1;
    v_locked_until := CASE
      WHEN v_new_attempts >= c_max_attempts
      THEN now() + c_lock_duration
      ELSE NULL
    END;

    UPDATE login_attempts
    SET attempts        = v_new_attempts,
        locked_until    = COALESCE(v_locked_until, v_rec.locked_until),
        last_attempt_at = now()
    WHERE email = p_email;

    -- Catat di audit log
    INSERT INTO auth_audit_log (event, email, success, metadata)
    VALUES (
      CASE WHEN v_new_attempts >= c_max_attempts THEN 'account_locked' ELSE 'login_failed' END,
      p_email,
      false,
      jsonb_build_object(
        'attempts',  v_new_attempts,
        'max',       c_max_attempts
      )
    );

    RETURN jsonb_build_object(
      'locked',       v_new_attempts >= c_max_attempts,
      'locked_until', COALESCE(v_locked_until, v_rec.locked_until),
      'attempts',     v_new_attempts
    );
  END IF;
END;
$$;

-- ── RPC: Periksa apakah email sedang terkunci ────────────────────────────
-- Dipanggil sebelum memproses login untuk short-circuit lebih awal.
-- Mengembalikan true jika akun sedang dalam periode lock.
-- Secara otomatis membersihkan lock yang sudah kadaluarsa.
CREATE OR REPLACE FUNCTION check_login_locked(
  p_email TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_rec login_attempts%ROWTYPE;
BEGIN
  SELECT * INTO v_rec
  FROM login_attempts
  WHERE email = p_email;

  -- Email belum pernah mencoba login
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Lock ada tapi sudah kadaluarsa: bersihkan dan reset
  IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= now() THEN
    UPDATE login_attempts
    SET attempts     = 0,
        locked_until = NULL
    WHERE email = p_email;

    -- Catat unlock di audit log
    INSERT INTO auth_audit_log (event, email, success, metadata)
    VALUES (
      'account_unlocked',
      p_email,
      true,
      jsonb_build_object('auto_unlock', true, 'was_locked_until', v_rec.locked_until)
    );

    RETURN false;
  END IF;

  -- Masih dalam periode lock
  RETURN v_rec.locked_until IS NOT NULL AND v_rec.locked_until > now();
END;
$$;

-- ── RPC: Rekam event audit secara umum ───────────────────────────────────
-- Dipakai untuk mencatat event non-login: logout, password reset, signup.
-- Dipanggil dari Edge Functions dengan service_role.
CREATE OR REPLACE FUNCTION record_auth_event(
  p_event      TEXT,
  p_user_id    UUID,
  p_email      TEXT,
  p_success    BOOLEAN,
  p_ip_address TEXT    DEFAULT NULL,
  p_user_agent TEXT    DEFAULT NULL,
  p_metadata   JSONB   DEFAULT '{}'
) RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO auth_audit_log (
    event, user_id, email, ip_address, user_agent, success, metadata
  ) VALUES (
    p_event,
    p_user_id,
    p_email,
    p_ip_address,
    p_user_agent,
    p_success,
    COALESCE(p_metadata, '{}')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
