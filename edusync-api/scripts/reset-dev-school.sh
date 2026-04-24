#!/usr/bin/env bash
# reset-dev-school.sh — purge + reseed SMA Nusantara Dev tenant
#
# Per Fase 0.5 exit criteria: must complete in <30s. Achieved by:
#   1. Single-statement purge via dev_seed_purge() function defined in dev_seed.sql
#   2. Re-applying dev_seed.sql which is idempotent (ON CONFLICT guards everywhere)
#
# Usage:
#   DATABASE_URL=postgres://... ./edusync-api/scripts/reset-dev-school.sh
#
# Environment:
#   DATABASE_URL          required — Postgres connection string
#   DEV_SEED_PATH         optional — path to dev_seed.sql (default: relative to script)
#   SKIP_PURGE            optional — set to 1 to skip the purge phase (re-seed only)

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not set" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_PATH="${DEV_SEED_PATH:-$SCRIPT_DIR/../schema/dev_seed.sql}"

if [[ ! -f "$SEED_PATH" ]]; then
  echo "ERROR: dev_seed.sql not found at $SEED_PATH" >&2
  exit 2
fi

start_ts=$(date +%s)

if [[ "${SKIP_PURGE:-}" != "1" ]]; then
  echo "→ Purging existing SMA Nusantara Dev tenant (if any) ..."
  # dev_seed_purge() exists only after dev_seed.sql has been applied at least once.
  # On a fresh DB, this fails harmlessly; suppress and continue.
  psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -c "SELECT public.dev_seed_purge();" \
    > /dev/null 2>&1 || echo "  (purge skipped — first run, function not yet defined)"
fi

echo "→ Applying dev_seed.sql ..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SEED_PATH"

elapsed=$(( $(date +%s) - start_ts ))
echo
echo "✓ Reset complete in ${elapsed}s"

if (( elapsed > 30 )); then
  echo "WARN: reset exceeded 30s (Fase 0.5 exit criteria target). Investigate." >&2
fi

cat <<'EOF'

Personas siap login (semua password = "password123"):
  admin@nusantara.dev                kepsek@nusantara.dev
  wakasek.kurikulum@nusantara.dev    wakasek.kesiswaan@nusantara.dev
  tu@nusantara.dev                   bk@nusantara.dev
  wali.x-ipa-1@nusantara.dev         wali.x-ipa-2@nusantara.dev
  wali.x-ips-1@nusantara.dev         wali.xi-ipa-1@nusantara.dev
  guru.matematika@nusantara.dev      guru.bahasa-indonesia@nusantara.dev
  guru.bahasa-inggris@nusantara.dev  guru.fisika@nusantara.dev
  guru.biologi@nusantara.dev         guru.pkn@nusantara.dev
  siswa001..siswa120@nusantara.dev   ortu001..ortu120@nusantara.dev

Detail di docs/dev-school-accounts.md
EOF
