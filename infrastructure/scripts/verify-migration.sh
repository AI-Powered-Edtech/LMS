#!/usr/bin/env bash
# =============================================================================
# EduSync Storage Migration Verifier
# =============================================================================
#
# Compares object counts and checksums between Supabase Storage and the target
# S3 backend to confirm the migration completed correctly.
#
# Prerequisites: same as migrate-storage.sh (rclone with both remotes)
#
# Usage:
#   bash infrastructure/scripts/verify-migration.sh
# =============================================================================

set -euo pipefail

: "${S3_BUCKET:-edusync}"
S3_BUCKET="${S3_BUCKET:-edusync}"

BUCKETS=(
    "course-images"
    "assignment-submissions"
    "video-captions"
    "certificates"
    "course-videos"
    "course-files"
    "avatars"
)

echo "=== EduSync Storage Verification ==="
echo "Waktu mulai: $(date)"
echo ""

ALL_OK=true

for bucket in "${BUCKETS[@]}"; do
    echo "--- Memverifikasi bucket: ${bucket} ---"

    src="supabase:${bucket}"
    dst="s3:${S3_BUCKET}/${bucket}"

    # Count objects in each remote.
    src_count=$(rclone ls "${src}" 2>/dev/null | wc -l || echo 0)
    dst_count=$(rclone ls "${dst}" 2>/dev/null | wc -l || echo 0)

    echo "  Sumber (Supabase): ${src_count} objek"
    echo "  Tujuan (S3)      : ${dst_count} objek"

    if [[ "${src_count}" -ne "${dst_count}" ]]; then
        echo "  ❌ TIDAK COCOK: selisih $((src_count - dst_count)) objek"
        ALL_OK=false
    else
        # Run a checksum comparison.
        if rclone check "${src}" "${dst}" --checksum 2>&1; then
            echo "  ✓ Checksum cocok"
        else
            echo "  ❌ Checksum TIDAK cocok — ada file yang berbeda atau hilang"
            ALL_OK=false
        fi
    fi

    echo ""
done

echo "=== Hasil Verifikasi ==="
if [[ "${ALL_OK}" == "true" ]]; then
    echo "✅ Semua bucket terverifikasi. Migrasi berhasil."
    exit 0
else
    echo "❌ Ada perbedaan yang ditemukan. Jalankan migrate-storage.sh kembali."
    exit 1
fi
