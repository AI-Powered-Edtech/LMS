-- =============================================================
-- EduSync LMS — Migration: Fix Quiz Status Case & Normalize RPCs
-- Tanggal: 2026-04-03
-- Konteks:
--   Tabel quiz_attempts_v2 menyimpan kolom `status` dengan nilai mixed-case.
--   Migrasi sebelumnya (090_quiz_engine_hardening.sql) menyimpan status sebagai
--   UPPERCASE ('IN_PROGRESS', 'SUBMITTED', dll), sedangkan fungsi terbaru
--   (20260402000002_quiz_pause_feature.sql) sudah menulis lowercase ('in_progress').
--   Hal ini menyebabkan inkonsistensi data dan bug pada RPC yang melakukan
--   exact-match WHERE status = 'in_progress' atau 'IN_PROGRESS'.
--
-- Fixes:
--   B1: Backfill — normalize semua status UPPERCASE ke lowercase di quiz_attempts_v2
--   R1: CREATE OR REPLACE FUNCTION record_cheating_signal — gunakan UPPER(status) untuk
--       WHERE clause agar bekerja terlepas dari case yang tersimpan di DB
--   R2: CREATE OR REPLACE FUNCTION record_quiz_heartbeat  — sama, toleran terhadap case
--
-- TIDAK diubah:
--   pause_quiz_attempt  (20260402000002_quiz_pause_feature.sql) — sudah benar lowercase
--   resume_quiz_attempt (20260402000002_quiz_pause_feature.sql) — tidak terpengaruh
--
-- Reference:
--   090_quiz_engine_hardening.sql (definisi awal tabel + RPC)
--   20260402000002_quiz_pause_feature.sql (pause/resume — sudah benar)
--   20260403000001_fix_quiz_status_case_cleanup.sql (UPPER index + cleanup RPC)
-- =============================================================

-- =============================================================
-- SECTION 1: Backfill — Normalize status UPPERCASE → lowercase
-- =============================================================
-- Standarisasi nilai status ke lowercase agar semua RPC baru yang
-- menulis lowercase ('in_progress') dan yang membaca dengan exact-match
-- memiliki data yang konsisten.
-- Perintah ini idempotent: baris yang sudah lowercase tidak terpengaruh.

UPDATE public.quiz_attempts_v2 SET status = 'graded'      WHERE status = 'GRADED';
UPDATE public.quiz_attempts_v2 SET status = 'submitted'   WHERE status = 'SUBMITTED';
UPDATE public.quiz_attempts_v2 SET status = 'in_progress' WHERE status = 'IN_PROGRESS';
UPDATE public.quiz_attempts_v2 SET status = 'abandoned'   WHERE status = 'ABANDONED';
UPDATE public.quiz_attempts_v2 SET status = 'expired'     WHERE status = 'EXPIRED';

-- =============================================================
-- SECTION 2: Fix RPC record_cheating_signal
-- =============================================================
-- Bug: implementasi sebelumnya menggunakan WHERE status = 'IN_PROGRESS' (exact match)
--      yang tidak cocok setelah backfill (atau sebelum backfill jika data sudah lowercase).
-- Fix: gunakan UPPER(status) = 'IN_PROGRESS' agar toleran terhadap kedua case.
--      Ini konsisten dengan pola yang digunakan di cleanup_stale_quiz_attempts
--      (lihat 20260403000001_fix_quiz_status_case_cleanup.sql).
--
-- Logika sinyal:
--   - Semua sinyal di-append ke array JSONB cheating_signals
--   - TAB_SWITCH    → increment tab_switch_count
--   - WINDOW_BLUR   → increment focus_loss_count

CREATE OR REPLACE FUNCTION public.record_cheating_signal(
    p_attempt_id  uuid,
    p_signal_type text,
    p_metadata    jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_signal_entry jsonb;
BEGIN
    -- Auth guard
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Bangun entri sinyal baru dengan timestamp
    v_signal_entry := jsonb_build_object(
        'type',       p_signal_type,
        'metadata',   p_metadata,
        'recorded_at', NOW()
    );

    -- Update attempt: append sinyal, increment counter relevan jika ada
    UPDATE public.quiz_attempts_v2
    SET
        -- Append sinyal ke array JSONB (inisialisasi ke '[]' jika NULL)
        cheating_signals   = COALESCE(cheating_signals, '[]'::jsonb) || v_signal_entry,

        -- Increment tab_switch_count hanya untuk sinyal TAB_SWITCH
        tab_switch_count   = CASE
                                 WHEN p_signal_type = 'TAB_SWITCH'
                                 THEN COALESCE(tab_switch_count, 0) + 1
                                 ELSE COALESCE(tab_switch_count, 0)
                             END,

        -- Increment focus_loss_count hanya untuk sinyal WINDOW_BLUR
        focus_loss_count   = CASE
                                 WHEN p_signal_type = 'WINDOW_BLUR'
                                 THEN COALESCE(focus_loss_count, 0) + 1
                                 ELSE COALESCE(focus_loss_count, 0)
                             END
    WHERE id         = p_attempt_id
      AND student_id = auth.uid()
      -- FIXED: gunakan UPPER() agar toleran terhadap mixed-case status yang tersimpan
      AND UPPER(status) = 'IN_PROGRESS';

    -- Tidak raise error jika NOT FOUND — attempt mungkin sudah expired/submitted;
    -- sinyal yang datang terlambat diabaikan secara senyap (graceful degradation).
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_cheating_signal(uuid, text, jsonb) TO authenticated;

-- =============================================================
-- SECTION 3: Fix RPC record_quiz_heartbeat
-- =============================================================
-- Bug: implementasi sebelumnya menggunakan WHERE status = 'IN_PROGRESS' (exact match).
-- Fix: gunakan UPPER(status) = 'IN_PROGRESS' agar toleran terhadap kedua case.
--
-- Returns:
--   TRUE  — attempt ditemukan dan last_heartbeat_at berhasil di-update
--   FALSE — attempt tidak ditemukan (sudah expired, submitted, atau bukan milik user ini)

CREATE OR REPLACE FUNCTION public.record_quiz_heartbeat(
    p_attempt_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Auth guard
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Update last_heartbeat_at pada attempt yang masih in-progress milik user ini
    UPDATE public.quiz_attempts_v2
    SET last_heartbeat_at = NOW()
    WHERE id         = p_attempt_id
      AND student_id = auth.uid()
      -- FIXED: gunakan UPPER() agar toleran terhadap mixed-case status yang tersimpan
      AND UPPER(status) = 'IN_PROGRESS';

    -- Kembalikan TRUE jika tepat 1 baris ter-update, FALSE jika tidak ada
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_quiz_heartbeat(uuid) TO authenticated;

-- =============================================================
-- VERIFICATION (jalankan manual setelah migration)
-- =============================================================

-- 1. Verifikasi tidak ada lagi status uppercase setelah backfill:
-- SELECT DISTINCT status FROM public.quiz_attempts_v2 ORDER BY status;
-- (Hasil yang diharapkan: hanya lowercase — 'in_progress', 'submitted', 'graded', dll)

-- 2. Verifikasi fungsi record_cheating_signal terdaftar dengan benar:
-- SELECT proname, prosecdef, provolatile
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'record_cheating_signal';

-- 3. Verifikasi fungsi record_quiz_heartbeat terdaftar dengan benar:
-- SELECT proname, prosecdef, provolatile
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public' AND p.proname = 'record_quiz_heartbeat';

-- 4. Smoke test heartbeat (ganti dengan attempt UUID yang valid dan in-progress):
-- SELECT record_quiz_heartbeat('<attempt_uuid>');
-- (Harus return TRUE jika attempt ditemukan, FALSE jika tidak)

-- 5. Konfirmasi pause_quiz_attempt tidak dimodifikasi (sudah benar lowercase):
-- SELECT prosrc FROM pg_proc
-- WHERE proname = 'pause_quiz_attempt' AND pronamespace = 'public'::regnamespace;
-- (Harus tetap menggunakan status = 'in_progress')
