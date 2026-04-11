#!/bin/bash
# Verify database after migration to Docker PostgreSQL

set -euo pipefail

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-edusync_local_pass}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-edusync}"

PSQL="PGPASSWORD=$POSTGRES_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"

echo "=== Verifikasi Database: $DB_NAME di $DB_HOST:$DB_PORT ==="
echo ""

echo "--- Jumlah tabel per schema ---"
eval "$PSQL" -c "
SELECT
  schemaname,
  COUNT(*) AS table_count
FROM pg_tables
WHERE schemaname IN ('public', 'auth')
GROUP BY schemaname
ORDER BY schemaname;
"

echo ""
echo "--- RLS Policies (harusnya 0 setelah migration) ---"
eval "$PSQL" -c "
SELECT COUNT(*) AS remaining_rls_policies
FROM pg_policies
WHERE schemaname = 'public';
"

echo ""
echo "--- Extensions terpasang ---"
eval "$PSQL" -c "
SELECT extname, extversion
FROM pg_extension
ORDER BY extname;
"

echo ""
echo "--- auth.users (sample) ---"
eval "$PSQL" -c "
SELECT id, email, role, created_at
FROM auth.users
LIMIT 5;
"

echo ""
echo "--- Ukuran database ---"
eval "$PSQL" -c "
SELECT pg_size_pretty(pg_database_size('$DB_NAME')) AS database_size;
"

echo ""
echo "=== Verifikasi selesai ==="
