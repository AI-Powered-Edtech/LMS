#!/bin/bash
# Export data from Supabase before migration
# Run this ONCE with your Supabase database credentials
#
# Dapatkan credentials dari:
#   Supabase Dashboard → Project Settings → Database → Connection info
#
# Usage:
#   export SUPABASE_DB_HOST=db.omfnkoufjqjqilswldtz.supabase.co
#   export SUPABASE_DB_PASSWORD=<your-db-password>
#   ./infrastructure/scripts/export-from-supabase.sh

set -euo pipefail

SUPABASE_DB_HOST="${SUPABASE_DB_HOST:?Set SUPABASE_DB_HOST, e.g. db.omfnkoufjqjqilswldtz.supabase.co}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:?Set SUPABASE_DB_PASSWORD (Supabase Dashboard > Settings > Database)}"
SUPABASE_DB_PORT="${SUPABASE_DB_PORT:-5432}"

OUTFILE="infrastructure/backup/supabase-export-$(date +%Y%m%d-%H%M%S).sql"
mkdir -p infrastructure/backup

echo "=== Export data dari Supabase ==="
echo "Host   : $SUPABASE_DB_HOST"
echo "Output : $OUTFILE"
echo ""

# Export schema + data (public + auth schemas only, skip Supabase internals)
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump \
  --host="$SUPABASE_DB_HOST" \
  --port="$SUPABASE_DB_PORT" \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --schema=auth \
  --no-owner \
  --no-acl \
  --no-privileges \
  --format=plain \
  --file="$OUTFILE"

LINE_COUNT=$(wc -l < "$OUTFILE")
echo ""
echo "=== Export selesai: $OUTFILE ($LINE_COUNT baris) ==="
echo ""
echo "Langkah berikutnya:"
echo "  1. cd edusync-api && docker compose up -d postgres pgbouncer"
echo "  2. ./infrastructure/scripts/import-to-docker.sh $OUTFILE"
echo "  3. ./infrastructure/scripts/verify-db.sh"
