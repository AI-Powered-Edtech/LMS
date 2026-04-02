-- =============================================================
-- EduSync LMS — Migration: Fix Quiz Status Case Mismatch & Cleanup
-- Tanggal: 2026-04-03
-- Fixes:
--   C1: get_student_progress_bundle — status IN ('submitted','graded') mismatch
--       + JWT role check diganti dengan query ke user_roles table
--   C2: cleanup_stale_quiz_attempts — status = 'in_progress' case mismatch
-- Reference: 090_quiz_engine_hardening.sql (Section 7 & 8)
--            20260401000001_fix_quiz_rpc_role_check.sql (pola user_roles)
-- =============================================================

-- =============================================================
-- SECTION 1: Expression Index untuk performa query UPPER(status)
-- =============================================================
-- FIXED: Tambahkan index pada UPPER(status) agar query yang menggunakan
-- UPPER(a.status) IN (...) tidak melakukan full partition scan.
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_v2_status_upper
    ON public.quiz_attempts_v2 (UPPER(status));

-- =============================================================
-- SECTION 2: Fix get_student_progress_bundle
-- =============================================================
-- FIXED C1a: status IN ('submitted', 'graded') → UPPER(a.status) IN ('SUBMITTED', 'GRADED')
--            Data di quiz_attempts_v2 di-backfill dengan UPPER(status::text) dari 090_quiz_engine_hardening.sql
--            sehingga nilai aktual adalah 'SUBMITTED', 'GRADED'. Lowercase check tidak akan match.
-- FIXED C1b: (auth.jwt() ->> 'role') NOT IN ('teacher', 'admin')
--            → diganti query ke user_roles table (pola dari 20260401000001_fix_quiz_rpc_role_check.sql)
--            JWT role claim bisa tidak tersedia tergantung konfigurasi Supabase Auth,
--            sedangkan user_roles adalah source of truth yang reliable.

CREATE OR REPLACE FUNCTION public.get_student_progress_bundle(p_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id     UUID;
    v_result        JSONB;
    v_is_privileged BOOLEAN := FALSE;
BEGIN
    v_tenant_id := get_my_tenant_id();

    -- FIXED C1b: Ganti JWT role check dengan query ke user_roles table.
    -- Cek apakah caller adalah teacher atau admin dalam tenant yang sama.
    -- Ini lebih reliable daripada membaca claim dari JWT yang mungkin tidak ada.
    IF auth.uid() <> p_student_id THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = v_tenant_id
              AND UPPER(ur.role::text) IN ('TEACHER', 'ADMIN')
        ) INTO v_is_privileged;

        IF NOT v_is_privileged THEN
            RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0002';
        END IF;
    END IF;

    SELECT jsonb_build_object(
        'profile', (
            SELECT jsonb_build_object('id', id, 'full_name', full_name, 'avatar_url', avatar_url)
            FROM public.profiles WHERE id = p_student_id
        ),
        'total_xp', (
            SELECT COALESCE(SUM(points), 0) FROM public.user_points
            WHERE user_id = p_student_id AND tenant_id = v_tenant_id
        ),
        'completed_lessons_count', (
            SELECT COUNT(*) FROM public.lesson_progress
            WHERE user_id = p_student_id AND completed = true AND tenant_id = v_tenant_id
        ),
        -- Return key as 'quiz_attempts' (canonical name, reads from V2)
        'quiz_attempts', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT a.id, a.quiz_id, a.score, COALESCE(a.submitted_at, a.started_at) AS created_at
                FROM public.quiz_attempts_v2 a
                WHERE a.student_id = p_student_id AND a.tenant_id = v_tenant_id
                  -- FIXED C1a: Gunakan UPPER() agar match dengan data yang disimpan uppercase
                  -- (di-backfill dari 090_quiz_engine_hardening.sql dengan UPPER(status::text))
                  AND UPPER(a.status) IN ('SUBMITTED', 'GRADED')
                ORDER BY COALESCE(a.submitted_at, a.started_at) DESC
            ) d
        ),
        'achievements', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT ub.id, ub.earned_at, b.name, b.icon
                FROM public.user_badges ub
                JOIN public.badges b ON b.id = ub.badge_id
                WHERE ub.user_id = p_student_id
                ORDER BY ub.earned_at DESC
            ) d
        ),
        'course_progress', (
            SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
                SELECT cp.id, cp.course_id, cp.total_lessons, cp.completed_lessons, cp.percentage,
                       cp.last_activity_type, cp.last_activity_at, c.title
                FROM public.course_progress cp
                JOIN public.courses c ON c.id = cp.course_id
                WHERE cp.user_id = p_student_id
                ORDER BY cp.last_activity_at DESC NULLS LAST
            ) d
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- =============================================================
-- SECTION 3: Fix cleanup_stale_quiz_attempts
-- =============================================================
-- FIXED C2: status = 'in_progress' (lowercase) tidak akan match data uppercase 'IN_PROGRESS'.
--           Semua status comparison diganti menggunakan UPPER() untuk konsistensi,
--           dan status output yang ditulis tetap uppercase agar konsisten dengan data yang ada.

CREATE OR REPLACE FUNCTION public.cleanup_stale_quiz_attempts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_expired_count   INTEGER;
    v_abandoned_count INTEGER;
BEGIN
    -- FIXED C2a: status = 'in_progress' → UPPER(status) = 'IN_PROGRESS'
    -- Mark expired IN_PROGRESS attempts yang tidak pernah di-submit
    UPDATE public.quiz_attempts_v2
    SET status = 'EXPIRED',
        submitted_at = expires_at
    WHERE UPPER(status) = 'IN_PROGRESS'
      AND expires_at < NOW() - INTERVAL '5 minutes';

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;

    -- FIXED C2b: status = 'in_progress' → UPPER(status) = 'IN_PROGRESS'
    -- Mark attempts yang stale > 48h tanpa heartbeat sebagai ABANDONED
    UPDATE public.quiz_attempts_v2
    SET status = 'ABANDONED'
    WHERE UPPER(status) = 'IN_PROGRESS'
      AND last_heartbeat_at < NOW() - INTERVAL '48 hours';

    GET DIAGNOSTICS v_abandoned_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'expired', v_expired_count,
        'abandoned', v_abandoned_count,
        'processed_at', NOW()
    );
END;
$$;

-- =============================================================
-- VERIFICATION (jalankan manual setelah migration)
-- =============================================================

-- 1. Verifikasi index expression terbuat:
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'quiz_attempts_v2' AND indexname = 'idx_quiz_attempts_v2_status_upper';

-- 2. Verifikasi fungsi get_student_progress_bundle tidak lagi pakai JWT claim:
-- SELECT prosrc FROM pg_proc
--   WHERE proname = 'get_student_progress_bundle' AND pronamespace = 'public'::regnamespace;

-- 3. Smoke test get_student_progress_bundle (ganti dengan UUID siswa yang ada):
-- SELECT get_student_progress_bundle('<student_uuid>');

-- 4. Smoke test cleanup_stale_quiz_attempts:
-- SELECT cleanup_stale_quiz_attempts();
