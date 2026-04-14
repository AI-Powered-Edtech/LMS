#!/usr/bin/env bash
# ============================================================
# EduSync LMS — Push Security & Bugfix Migrations
# Tanggal: 2026-04-03
# 
# Script ini meng-apply 14 migrasi baru ke remote Supabase project.
# Project: omfnkoufjqjqilswldtz
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT_REF="omfnkoufjqjqilswldtz"

echo "============================================"
echo "EduSync LMS — Migration Push"
echo "Project: $PROJECT_REF"
echo "============================================"

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "ERROR: Supabase CLI tidak terinstall."
    echo "Install dengan: npm install -g supabase"
    exit 1
fi

# Check if linked
if [ ! -f "supabase/.temp/project-ref" ]; then
    echo "ERROR: Project belum di-link."
    echo "Jalankan: supabase link --project-ref $PROJECT_REF"
    exit 1
fi

# Step 1: Show current migration status
echo ""
echo "[1/4] Checking migration status..."
supabase migration list 2>&1 || {
    echo "ERROR: Gagal membaca migration list. Pastikan Anda sudah login."
    echo "Jalankan: supabase login"
    exit 1
}

# Step 2: Dry run
echo ""
echo "[2/4] Dry-run (preview changes)..."
supabase db push --dry-run 2>&1 || {
    echo "WARNING: Dry-run gagal. Melanjutkan ke push langsung..."
}

# Step 3: Push migrations
echo ""
echo "[3/4] Pushing migrations..."
supabase db push 2>&1

# Step 4: Verify
echo ""
echo "[4/4] Verifying migrations..."
supabase migration list 2>&1

echo ""
echo "============================================"
echo "Migration push selesai!"
echo "============================================"
echo ""
echo "Verifikasi manual yang disarankan:"
echo "  1. SELECT count(*) FROM pg_indexes WHERE tablename = 'quiz_attempts_v2' AND indexname = 'idx_quiz_attempts_v2_status_upper';"
echo "  2. SELECT cleanup_stale_quiz_attempts();"
echo "  3. SELECT get_student_progress_bundle('<student_uuid>');"
echo "  4. Verifikasi RLS attendance: SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'attendance_records';"
echo "  5. Verifikasi OTP hash: SELECT column_name FROM information_schema.columns WHERE table_name = 'parent_otp_codes' AND column_name = 'otp_hash';"
