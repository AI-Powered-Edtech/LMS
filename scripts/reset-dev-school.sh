#!/usr/bin/env bash
# ============================================================
# EduSync LMS — Reset Dev School (SMA Nusantara Dev)
# ============================================================
# Script ini digunakan untuk menghapus dan melakukan seeding ulang
# data tenant SMA Nusantara Dev.
# ============================================================

set -euo pipefail

# Konfigurasi Database
DB_URL="${DATABASE_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
SEED_FILE="edusync-api/schema/dev_seed.sql"

echo "============================================"
echo "Resetting SMA Nusantara Dev School Data"
echo "============================================"

# Pastikan psql tersedia
if ! command -v psql &> /dev/null; then
    echo "ERROR: psql tidak terinstall. Pastikan psql tersedia di PATH Anda."
    exit 1
fi

if [ ! -f "$SEED_FILE" ]; then
    echo "ERROR: File seed tidak ditemukan di $SEED_FILE"
    exit 1
fi

echo "[1/2] Menghapus data SMA Nusantara Dev yang sudah ada..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "
BEGIN;
DELETE FROM public.user_roles WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'sma-nusantara-dev');
DELETE FROM public.profiles WHERE tenant_id IN (SELECT id FROM public.tenants WHERE slug = 'sma-nusantara-dev');
DELETE FROM public.tenants WHERE slug = 'sma-nusantara-dev';
DELETE FROM public.users WHERE email LIKE '%@nusantara.dev';
COMMIT;
"

echo "[2/2] Menjalankan seeding dari $SEED_FILE..."
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SEED_FILE"

echo "============================================"
echo "Reset Dev School selesai!"
echo "============================================"
