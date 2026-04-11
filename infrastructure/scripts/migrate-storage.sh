#!/usr/bin/env bash
# =============================================================================
# EduSync Storage Migration — Supabase Storage → S3/R2/MinIO
# =============================================================================
#
# Migrates all files from Supabase Storage to an S3-compatible backend using
# rclone.  Both remotes must be pre-configured in your rclone config
# (rclone config).
#
# Prerequisites:
#   - rclone >= 1.66  (brew install rclone  /  apt install rclone)
#   - rclone remote named "supabase" pointing to Supabase Storage S3 endpoint
#   - rclone remote named "s3" pointing to your target (R2 or MinIO)
#
# Usage:
#   export SUPABASE_URL="https://xxxx.supabase.co"
#   export SUPABASE_ANON_KEY="eyJ..."
#   export S3_ENDPOINT="http://localhost:9000"
#   bash infrastructure/scripts/migrate-storage.sh
#
# Dry run (no files written):
#   DRY_RUN=1 bash infrastructure/scripts/migrate-storage.sh
# =============================================================================

set -euo pipefail

# ── Required env vars ─────────────────────────────────────────────────────────
: "${SUPABASE_URL:?Wajib diisi: SUPABASE_URL}"
: "${SUPABASE_ANON_KEY:?Wajib diisi: SUPABASE_ANON_KEY}"
: "${S3_ENDPOINT:?Wajib diisi: S3_ENDPOINT}"

S3_BUCKET="${S3_BUCKET:-edusync}"
DRY_RUN="${DRY_RUN:-0}"
RCLONE_FLAGS="--progress --checksum --transfers=8 --checkers=16"

if [[ "${DRY_RUN}" == "1" ]]; then
    RCLONE_FLAGS="${RCLONE_FLAGS} --dry-run"
    echo "⚠️  Mode dry-run aktif — tidak ada file yang akan diubah."
fi

# Bucket list mirrors ALLOWED_BUCKETS in storage/url.rs
BUCKETS=(
    "course-images"
    "assignment-submissions"
    "video-captions"
    "certificates"
    "course-videos"
    "course-files"
    "avatars"
)

LOG_FILE="/tmp/edusync-migration-$(date +%Y%m%d-%H%M%S).log"

echo "=== EduSync Storage Migration ==="
echo "Waktu mulai : $(date)"
echo "Sumber      : ${SUPABASE_URL} (Supabase Storage)"
echo "Tujuan      : ${S3_ENDPOINT}/${S3_BUCKET}"
echo "Log         : ${LOG_FILE}"
echo ""

TOTAL_OK=0
TOTAL_FAIL=0

for bucket in "${BUCKETS[@]}"; do
    echo "--- Migrasi bucket: ${bucket} ---"

    src="supabase:${bucket}"
    dst="s3:${S3_BUCKET}/${bucket}"

    if rclone copy \
            ${RCLONE_FLAGS} \
            "${src}" \
            "${dst}" \
            2>&1 | tee -a "${LOG_FILE}"; then
        echo "✓ Selesai: ${bucket}"
        ((TOTAL_OK += 1))
    else
        echo "✗ Gagal : ${bucket} (lihat log: ${LOG_FILE})"
        ((TOTAL_FAIL += 1))
    fi

    echo ""
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo "=== Ringkasan Migrasi ==="
echo "Bucket berhasil : ${TOTAL_OK}/${#BUCKETS[@]}"
echo "Bucket gagal    : ${TOTAL_FAIL}/${#BUCKETS[@]}"
echo "Waktu selesai   : $(date)"
echo "Log tersimpan   : ${LOG_FILE}"

if [[ "${TOTAL_FAIL}" -gt 0 ]]; then
    echo ""
    echo "❌ Ada bucket yang gagal dimigrasi. Periksa log untuk detail."
    exit 1
fi

echo ""
echo "✅ Semua bucket berhasil dimigrasi."
echo "Jalankan infrastructure/scripts/verify-migration.sh untuk verifikasi."
