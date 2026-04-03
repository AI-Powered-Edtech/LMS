-- =============================================================
-- EduSync LMS — Migration: Add Retry Mechanism to Quiz Submission Queue
-- Tanggal: 2026-04-03
-- Konteks:
--   Menambahkan mekanisme retry dengan exponential backoff ke tabel
--   quiz_submission_queue agar pemrosesan submission yang gagal dapat
--   dicoba ulang secara otomatis tanpa kehilangan data.
--
-- Perubahan:
--   S1: Tambah kolom retry ke quiz_submission_queue
--       - retry_count    : jumlah percobaan yang sudah dilakukan
--       - next_retry_at  : waktu earliest untuk percobaan berikutnya
--       - last_error     : pesan error terakhir (untuk debugging)
--       - error_detail   : detail error dalam format JSONB
--   S2: Index baru idx_queue_retry_eligible untuk polling efisien
--   S3: CREATE OR REPLACE FUNCTION v1_checkout_submission_queue
--       - Filter hanya item yang eligible: PENDING + retry_count < 3 + next_retry_at terpenuhi
--       - Gunakan FOR UPDATE SKIP LOCKED untuk konkurensi aman
--       - Return: ticket_id, attempt_id, tenant_id, retry_count
--   S4: Helper function v1_schedule_retry_submission
--       - Set status kembali ke PENDING dengan backoff delay
--       - Increment retry_count, catat last_error dan error_detail
--   S5: Helper function v1_mark_dead_letter
--       - Set status ke FAILED (terminal) setelah melebihi max retry
--
-- Dependency:
--   Tabel quiz_submission_queue harus sudah ada (dibuat oleh
--   migration sebelumnya — lihat 20260402000002_quiz_pause_feature.sql
--   atau migration engine quiz yang relevan)
--
-- Reference:
--   20260403000016_fix_quiz_status_rpc_normalize.sql (pola SECURITY DEFINER)
--   grade-quiz-attempt Edge Function (consumer queue)
-- =============================================================

-- =============================================================
-- SECTION 1: Tambah kolom retry ke quiz_submission_queue
-- =============================================================
-- Kolom-kolom ini idempotent (ADD COLUMN IF NOT EXISTS) sehingga
-- aman dijalankan ulang jika migration pernah diinterupsi.

ALTER TABLE public.quiz_submission_queue
  ADD COLUMN IF NOT EXISTS retry_count   integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error    text,
  ADD COLUMN IF NOT EXISTS error_detail  jsonb;

COMMENT ON COLUMN public.quiz_submission_queue.retry_count IS
  'Jumlah percobaan pemrosesan yang sudah dilakukan. Max 3 sebelum dead-letter.';

COMMENT ON COLUMN public.quiz_submission_queue.next_retry_at IS
  'Waktu paling awal item ini boleh di-checkout kembali. NULL = dapat diproses segera.';

COMMENT ON COLUMN public.quiz_submission_queue.last_error IS
  'Pesan error dari percobaan terakhir yang gagal. NULL jika belum pernah gagal.';

COMMENT ON COLUMN public.quiz_submission_queue.error_detail IS
  'Detail error terstruktur dalam JSONB: { attempt, at, ... }';

-- =============================================================
-- SECTION 2: Index untuk retry queue polling
-- =============================================================
-- Index partial ini mempercepat query polling yang hanya butuh
-- item dengan status PENDING/FAILED yang belum melewati max retry
-- dan sudah melewati waktu next_retry_at.

CREATE INDEX IF NOT EXISTS idx_queue_retry_eligible
  ON public.quiz_submission_queue (next_retry_at)
  WHERE status IN ('PENDING', 'FAILED') AND retry_count < 3;

-- =============================================================
-- SECTION 3: Update v1_checkout_submission_queue
-- =============================================================
-- Fungsi ini di-checkout oleh Edge Function grade-quiz-attempt
-- menggunakan service role key. Tidak memerlukan auth.uid() karena
-- dipanggil server-side, namun tetap menggunakan SECURITY DEFINER
-- dan SET search_path untuk mencegah search_path hijacking.
--
-- Perubahan dari versi sebelumnya:
--   - Filter tambahan: (next_retry_at IS NULL OR next_retry_at <= NOW())
--   - Filter tambahan: retry_count < 3 (max retry hardcoded di query)
--   - Return tambahan: retry_count (dibutuhkan consumer untuk logika backoff)

CREATE OR REPLACE FUNCTION public.v1_checkout_submission_queue()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
BEGIN
  -- Ambil satu item paling lama yang eligible untuk diproses:
  --   1. Status PENDING (belum diproses atau siap di-retry)
  --   2. Belum pernah di-schedule retry, ATAU waktu retry sudah tiba
  --   3. Belum mencapai batas maksimal retry (< 3)
  -- FOR UPDATE SKIP LOCKED: lewati baris yang sedang di-lock oleh
  -- worker lain sehingga multiple worker dapat berjalan paralel
  -- tanpa contention.
  SELECT id, attempt_id, tenant_id, retry_count
    INTO v_ticket
    FROM public.quiz_submission_queue
   WHERE status = 'PENDING'
     AND (next_retry_at IS NULL OR next_retry_at <= NOW())
     AND retry_count < 3
   ORDER BY submitted_at ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  -- Tidak ada item yang perlu diproses saat ini
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Tandai item sebagai sedang diproses agar tidak di-checkout
  -- oleh worker lain sebelum kita selesai
  UPDATE public.quiz_submission_queue
     SET status = 'PROCESSING'
   WHERE id = v_ticket.id;

  RETURN jsonb_build_object(
    'ticket_id',   v_ticket.id,
    'attempt_id',  v_ticket.attempt_id,
    'tenant_id',   v_ticket.tenant_id,
    'retry_count', v_ticket.retry_count
  );
END;
$$;

-- =============================================================
-- SECTION 4: Helper function untuk schedule retry
-- =============================================================
-- Dipanggil oleh Edge Function grade-quiz-attempt ketika terjadi
-- error yang bersifat transient (network timeout, DB lock, dll).
-- Mengimplementasikan exponential backoff via parameter p_backoff_ms.
--
-- Pattern penggunaan dari Edge Function:
--   await supabase.rpc('v1_schedule_retry_submission', {
--     p_ticket_id:   ticketId,
--     p_retry_count: retryCount + 1,
--     p_error_msg:   error.message,
--     p_backoff_ms:  30000 * Math.pow(2, retryCount)  -- 30s, 60s, 120s
--   })

CREATE OR REPLACE FUNCTION public.v1_schedule_retry_submission(
  p_ticket_id   uuid,
  p_retry_count integer,
  p_error_msg   text,
  p_backoff_ms  integer DEFAULT 30000
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.quiz_submission_queue
     SET status        = 'PENDING',
         retry_count   = p_retry_count,
         -- Hitung waktu retry berikutnya: sekarang + backoff dalam milidetik
         next_retry_at = NOW() + (p_backoff_ms * INTERVAL '1 millisecond'),
         last_error    = p_error_msg,
         error_detail  = jsonb_build_object(
                           'attempt', p_retry_count,
                           'at',      NOW(),
                           'msg',     p_error_msg
                         )
   WHERE id = p_ticket_id;
END;
$$;

-- =============================================================
-- SECTION 5: Helper function untuk mark dead letter
-- =============================================================
-- Dipanggil oleh Edge Function grade-quiz-attempt ketika:
--   a) retry_count sudah mencapai batas maksimal (>= 3), ATAU
--   b) terjadi error yang bersifat permanent (data corruption, dll)
--
-- Item yang di-mark FAILED tidak akan di-checkout kembali karena
-- index idx_queue_retry_eligible tidak mencakup retry_count >= 3.
-- Perlu investigasi manual atau mekanisme DLQ terpisah.

CREATE OR REPLACE FUNCTION public.v1_mark_dead_letter(
  p_ticket_id uuid,
  p_error_msg text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.quiz_submission_queue
     SET status       = 'FAILED',
         last_error   = p_error_msg,
         error_detail = jsonb_build_object(
                          'terminal', true,
                          'at',       NOW(),
                          'msg',      p_error_msg
                        )
   WHERE id = p_ticket_id;
END;
$$;

-- =============================================================
-- VERIFICATION (jalankan manual setelah migration)
-- =============================================================

-- 1. Verifikasi kolom baru sudah ditambahkan:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'quiz_submission_queue'
--   AND column_name  IN ('retry_count', 'next_retry_at', 'last_error', 'error_detail')
-- ORDER BY column_name;

-- 2. Verifikasi index partial terbuat:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'quiz_submission_queue'
--   AND indexname = 'idx_queue_retry_eligible';

-- 3. Verifikasi fungsi terdaftar dengan SECURITY DEFINER:
-- SELECT proname, prosecdef
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.proname IN (
--     'v1_checkout_submission_queue',
--     'v1_schedule_retry_submission',
--     'v1_mark_dead_letter'
--   )
-- ORDER BY proname;
-- (prosecdef harus TRUE untuk semua fungsi di atas)

-- 4. Smoke test checkout (tidak ada efek samping jika queue kosong):
-- SELECT v1_checkout_submission_queue();
-- (Harus return NULL jika queue kosong)
