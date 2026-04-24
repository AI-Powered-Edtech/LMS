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

# Pick psql runner: prefer host `psql` if available, otherwise exec through
# the Postgres container named by $PG_CONTAINER (defaults to `lms-db-1`).
# This keeps CI (host psql) and local dev (Docker compose) both working.
if command -v psql > /dev/null; then
  PSQL_EXEC=(psql "$DATABASE_URL")
else
  CONTAINER="${PG_CONTAINER:-lms-db-1}"
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: neither host psql nor container '${CONTAINER}' available" >&2
    exit 2
  fi
  PSQL_EXEC=(docker exec -i "$CONTAINER" psql -U postgres -d postgres)
fi

run_sql() { "${PSQL_EXEC[@]}" "$@"; }
run_sql_file() { "${PSQL_EXEC[@]}" "$@" < "$1"; shift; }

start_ts=$(date +%s)

if [[ "${SKIP_PURGE:-}" != "1" ]]; then
  echo "→ Purging existing SMA Nusantara Dev tenant (if any) ..."
  "${PSQL_EXEC[@]}" -v ON_ERROR_STOP=0 -c "SELECT public.dev_seed_purge();" \
    > /dev/null 2>&1 || echo "  (purge skipped — first run, function not yet defined)"
fi

echo "→ Applying dev_seed.sql ..."
"${PSQL_EXEC[@]}" -v ON_ERROR_STOP=1 < "$SEED_PATH" > /tmp/dev_seed.log
tail -3 /tmp/dev_seed.log

echo "→ Verifying post-reset invariants ..."
COUNTS=$("${PSQL_EXEC[@]}" -t -A -F ' ' -c "
SELECT
  (SELECT COUNT(*) FROM public.tenants WHERE slug='sma-nusantara-dev'),
  (SELECT COUNT(*) FROM public.profiles p
     JOIN public.tenants t ON t.id = p.tenant_id
    WHERE t.slug='sma-nusantara-dev' AND p.email LIKE 'siswa%@nusantara.dev'),
  (SELECT COUNT(*) FROM public.user_roles ur
     JOIN public.tenants t ON t.id = ur.tenant_id
    WHERE t.slug='sma-nusantara-dev')
;")
read -r tenant_n siswa_n roles_n <<< "$COUNTS"

fail=0
if [[ "$tenant_n" != "1" ]]; then echo "ASSERT FAIL: tenant count = $tenant_n (expected 1)" >&2; fail=1; fi
if [[ "$siswa_n" -lt "100" ]]; then echo "ASSERT FAIL: siswa count = $siswa_n (expected ≥100)" >&2; fail=1; fi
if [[ "$roles_n" -lt "10" ]]; then echo "ASSERT FAIL: user_roles count = $roles_n (expected ≥10)" >&2; fail=1; fi

elapsed=$(( $(date +%s) - start_ts ))
echo
if (( fail == 1 )); then
  echo "✗ Reset VERIFY FAILED after ${elapsed}s" >&2
  exit 1
fi
echo "✓ Reset complete in ${elapsed}s  (tenant=$tenant_n siswa=$siswa_n roles=$roles_n)"

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
