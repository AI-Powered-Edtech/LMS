#!/bin/bash
# Import Supabase export into Docker PostgreSQL
# Usage: ./infrastructure/scripts/import-to-docker.sh [path-to-export.sql]
#
# Prasyarat:
#   - Docker PostgreSQL sudah running: cd edusync-api && docker compose up -d postgres
#   - File export dari export-from-supabase.sh tersedia

set -euo pipefail

EXPORT_FILE="${1:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-edusync_local_pass}"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="edusync"
DB_USER="postgres"

if [ -z "$EXPORT_FILE" ]; then
  echo "Penggunaan: $0 <path-to-export.sql>"
  echo "Contoh   : $0 infrastructure/backup/supabase-export-20260411-120000.sql"
  exit 1
fi

if [ ! -f "$EXPORT_FILE" ]; then
  echo "Error: File tidak ditemukan: $EXPORT_FILE"
  exit 1
fi

echo "=== Import data ke Docker PostgreSQL ==="
echo "File  : $EXPORT_FILE"
echo "Target: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""

# Wait for PostgreSQL to be ready
echo "Menunggu PostgreSQL siap..."
until PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  echo "  ... belum siap, tunggu 2 detik"
  sleep 2
done
echo "PostgreSQL siap."
echo ""

echo "⚠️  PERINGATAN: Ini akan menimpa semua data yang ada di database lokal!"
echo "   Database: $DB_NAME di $DB_HOST:$DB_PORT"
read -rp "Lanjutkan? (ketik 'ya' untuk konfirmasi): " confirm
if [ "$confirm" != "ya" ]; then
  echo "Dibatalkan."
  exit 0
fi

# Import — suppress noisy but harmless NOTICE/WARNING/SET lines
echo ""
echo "Mengimport data (ini mungkin memakan waktu beberapa menit)..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f "$EXPORT_FILE" \
  2>&1 | grep -Ev "^(NOTICE|WARNING|SET|--|$)" || true

# Run drop-rls to remove Supabase RLS policies
echo ""
echo "Menghapus RLS policies (tidak diperlukan di luar Supabase)..."
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f edusync-api/schema/drop-rls.sql \
  2>&1 | grep -Ev "^(NOTICE|WARNING|SET|--|$)" || true

echo ""
echo "=== Import selesai! ==="
echo ""
echo "Verifikasi:"
echo "  ./infrastructure/scripts/verify-db.sh"
echo "  psql -h localhost -U postgres -d edusync -c '\\dt public.*'"
