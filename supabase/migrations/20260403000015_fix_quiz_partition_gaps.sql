-- =============================================================
-- EduSync LMS — Migration: Fix Quiz Attempts V2 Partition Gaps
-- Tanggal: 2026-04-03
-- Konteks:
--   Tabel quiz_attempts_v2 menggunakan PARTITION BY RANGE (started_at).
--   Partisi yang sudah ada: ..., 2026_04 (s/d 2026-05-01), 2026_07 (dari 2026-07-01)
--   Gap yang ditemukan: range 2026-05-01 s/d 2026-07-01 belum memiliki partisi.
--   Tanpa partisi ini, INSERT untuk started_at di rentang Mei–Juni 2026 akan gagal
--   dengan error "no partition of relation found for row".
--
-- Fixes:
--   P1: Buat partisi quiz_attempts_v2_2026_05 (2026-05-01 s/d 2026-06-01)
--   P2: Buat partisi quiz_attempts_v2_2026_06 (2026-06-01 s/d 2026-07-01)
--   P3: Daftarkan pg_cron job untuk auto-provision partisi ke depan (jika tersedia)
--
-- Reference:
--   090_quiz_engine_hardening.sql (definisi tabel partitioned)
--   20260403000001_fix_quiz_status_case_cleanup.sql
-- =============================================================

-- =============================================================
-- SECTION 1: Partisi untuk Mei 2026
-- =============================================================
-- Range: [2026-05-01, 2026-06-01)
-- Menutupi seluruh bulan Mei 2026 UTC.
CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2_2026_05
    PARTITION OF public.quiz_attempts_v2
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- =============================================================
-- SECTION 2: Partisi untuk Juni 2026
-- =============================================================
-- Range: [2026-06-01, 2026-07-01)
-- Menutupi seluruh bulan Juni 2026 UTC.
CREATE TABLE IF NOT EXISTS public.quiz_attempts_v2_2026_06
    PARTITION OF public.quiz_attempts_v2
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- =============================================================
-- SECTION 3: Registrasi pg_cron untuk auto-provision partisi
-- =============================================================
-- Jika fungsi ensure_quiz_attempt_partition tersedia (dibuat oleh
-- 090_quiz_engine_hardening.sql atau migrasi sebelumnya), daftarkan
-- cron job untuk menjalankannya setiap tanggal 25 per bulan.
-- Job ini akan memastikan partisi untuk ~40 hari ke depan selalu ada
-- sebelum data masuk, mencegah gap partisi di masa depan.
--
-- Jika pg_cron extension tidak aktif atau fungsi tidak ada,
-- blok DO ini akan lewati pendaftaran secara aman (NO-OP).
DO $$
BEGIN
    -- Cek apakah fungsi ensure_quiz_attempt_partition ada
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'ensure_quiz_attempt_partition'
    ) THEN
        -- Cek apakah pg_cron extension tersedia
        IF EXISTS (
            SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
        ) THEN
            -- Hapus job lama jika sudah terdaftar (idempotent)
            PERFORM cron.unschedule('provision-quiz-attempt-partitions');

            -- Daftarkan ulang: jalankan setiap tanggal 25 pukul 00:00 UTC
            PERFORM cron.schedule(
                'provision-quiz-attempt-partitions',
                '0 0 25 * *',
                $$SELECT ensure_quiz_attempt_partition(NOW() + INTERVAL '40 days')$$
            );

            RAISE NOTICE 'pg_cron job "provision-quiz-attempt-partitions" berhasil didaftarkan.';
        ELSE
            RAISE NOTICE 'pg_cron extension tidak aktif — lewati pendaftaran cron job.';
        END IF;
    ELSE
        RAISE NOTICE 'Fungsi ensure_quiz_attempt_partition tidak ditemukan — lewati pendaftaran cron job.';
    END IF;
END;
$$;

-- =============================================================
-- VERIFICATION (jalankan manual setelah migration)
-- =============================================================

-- 1. Verifikasi partisi baru terdaftar:
-- SELECT relname, pg_get_expr(relpartbound, oid) AS bounds
-- FROM pg_class
-- WHERE relname LIKE 'quiz_attempts_v2_2026_%'
-- ORDER BY relname;

-- 2. Verifikasi tidak ada gap di range Mei–Juni 2026:
-- INSERT INTO public.quiz_attempts_v2 (id, tenant_id, quiz_id, student_id, started_at, status)
-- VALUES (gen_random_uuid(), '<tenant_id>', '<quiz_id>', auth.uid(), '2026-05-15 10:00:00+00', 'in_progress');
-- (Harus sukses tanpa error "no partition found")

-- 3. Verifikasi cron job (jika pg_cron aktif):
-- SELECT jobname, schedule, command FROM cron.job
-- WHERE jobname = 'provision-quiz-attempt-partitions';
