#!/usr/bin/env bash
# =============================================================================
# validate-migrations.sh
# EduSync LMS — Migration Validation Script
#
# Checks that all SQL migration files in supabase/migrations/ meet EduSync's
# schema change rules (from CLAUDE.md and ADR-002):
#
# 1. Every new CREATE TABLE must have:
#    a. ENABLE ROW LEVEL SECURITY
#    b. At least one CREATE POLICY
# 2. Every new policy must reference tenant_id
# 3. No migration may DROP or DISABLE RLS on an existing table
# 4. No migration may contain hardcoded UUIDs for user data
#
# Usage:
#   ./scripts/validate-migrations.sh                    # validate all
#   ./scripts/validate-migrations.sh --changed-only     # validate only git-staged files
#   ./scripts/validate-migrations.sh path/to/file.sql   # validate a single file
#
# Exit codes:
#   0 — all checks passed
#   1 — one or more violations found
# =============================================================================

set -uo pipefail

MIGRATIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/migrations"
ERRORS=0
WARNINGS=0
FILES_CHECKED=0

# ── Color output ─────────────────────────────────────────────────────────────
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

error()   { echo -e "${RED}[ERROR]${NC}   $1"; ((ERRORS++)); }
warn()    { echo -e "${YELLOW}[WARN]${NC}    $1"; ((WARNINGS++)); }
ok()      { echo -e "${GREEN}[OK]${NC}      $1"; }
info()    { echo -e "${BLUE}[INFO]${NC}    $1"; }

# ── File selection ────────────────────────────────────────────────────────────
get_files() {
  if [[ $# -gt 0 && "$1" == "--changed-only" ]]; then
    # Only files staged in git
    git diff --cached --name-only --diff-filter=ACM | grep "supabase/migrations/.*\.sql$" | grep -v "_archive/"
  elif [[ $# -gt 0 && -f "$1" ]]; then
    echo "$1"
  else
    # All non-archived migration files
    find "$MIGRATIONS_DIR" -maxdepth 1 -name "*.sql" | sort
  fi
}

# ── Per-file checks ───────────────────────────────────────────────────────────
check_file() {
  local file="$1"
  local filename
  filename="$(basename "$file")"
  local file_errors=0

  ((FILES_CHECKED++))

  # ── Check 1: No DISABLE ROW LEVEL SECURITY ──────────────────────────────
  if grep -qiE "DISABLE ROW LEVEL SECURITY" "$file"; then
    error "$filename: Contains DISABLE ROW LEVEL SECURITY — never disable RLS (ADR-002)"
    ((file_errors++))
  fi

  # ── Check 2: No ALTER TABLE ... DISABLE TRIGGER ─────────────────────────
  if grep -qiE "DISABLE TRIGGER" "$file"; then
    warn "$filename: Contains DISABLE TRIGGER — verify this is intentional"
  fi

  # ── Check 3: CREATE TABLE → must have ENABLE ROW LEVEL SECURITY ─────────
  # Extract table names from CREATE TABLE statements (skip IF NOT EXISTS variants too)
  local tables
  tables=$(grep -oiE "CREATE TABLE (IF NOT EXISTS )?[a-z_\.]+" "$file" \
           | grep -oiE "[a-z_]+$" \
           | tr '[:upper:]' '[:lower:]' \
           || true)

  for table in $tables; do
    # Skip internal/system tables and known non-tenant tables
    case "$table" in
      schema_migrations|supabase_migrations|spatial_ref_sys|extensions) continue ;;
    esac

    if ! grep -qiE "ENABLE ROW LEVEL SECURITY" "$file"; then
      error "$filename: CREATE TABLE '$table' found but ENABLE ROW LEVEL SECURITY not found in this file"
      info  "  → Every new table must have: ALTER TABLE $table ENABLE ROW LEVEL SECURITY;"
      ((file_errors++))
    fi

    if ! grep -qiE "CREATE POLICY" "$file"; then
      error "$filename: CREATE TABLE '$table' found but no CREATE POLICY found in this file"
      info  "  → Every new table needs at least a SELECT policy with tenant_id isolation"
      ((file_errors++))
    fi
  done

  # ── Check 4: Policies must reference tenant_id ───────────────────────────
  # (Only check files that define policies)
  if grep -qiE "CREATE POLICY" "$file"; then
    local policy_block
    policy_block=$(grep -A5 -iE "CREATE POLICY" "$file" || true)
    if ! echo "$policy_block" | grep -qiE "tenant_id"; then
      warn "$filename: CREATE POLICY found but no tenant_id reference nearby — verify tenant isolation"
    fi
  fi

  # ── Check 5: No hardcoded production-looking UUIDs ──────────────────────
  # Allow fixed dev UUIDs (00000000-0000-0000-0000-...) but flag random UUIDs
  # that look like real data embedded in migrations (not seed files)
  local basename_lower
  basename_lower=$(echo "$filename" | tr '[:upper:]' '[:lower:]')
  if [[ "$basename_lower" != *"seed"* ]]; then
    # Count non-zero UUIDs (potential hardcoded data)
    local uuid_count
    uuid_count=$(grep -cioE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" "$file" \
                 | grep -v "^0$" || echo "0")
    local non_dev_uuids
    non_dev_uuids=$(grep -oiE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" "$file" \
                    | grep -ivE "^00000000-" || true)
    local non_dev_count
    non_dev_count=$(echo "$non_dev_uuids" | grep -c "[0-9a-f]" 2>/dev/null || true)
    non_dev_count="${non_dev_count:-0}"
    # Take only the first line if grep -c returns multiple lines
    non_dev_count=$(echo "$non_dev_count" | head -1)

    if [[ "$non_dev_count" -gt 5 ]]; then
      warn "$filename: Found $non_dev_count non-dev UUIDs — migrations should not contain hardcoded data (use seed files instead)"
    fi
  fi

  # ── Check 6: RPC Security Checks ─────────────────────────────────────────
  # Find all CREATE FUNCTION or CREATE OR REPLACE FUNCTION statements
  # We will just check the whole file for SET search_path and auth.uid() if it contains a function definition.
  # For a more robust check, we check if the file contains CREATE FUNCTION.
  if grep -qiE "CREATE (OR REPLACE )?FUNCTION" "$file"; then
    
    # Skip baseline as it was patched via ALTER FUNCTION in later migrations
    if [[ "$filename" != "000_baseline.sql" && "$filename" != "001_performance_indexes.sql" ]]; then
      # Check for SET search_path
      if ! grep -qiE "SET search_path" "$file"; then
        error "$filename: CREATE FUNCTION found but no 'SET search_path' found in this file"
        info  "  → Every new RPC must use SET search_path TO 'public' to prevent search path injection (SECURITY.md)"
        ((file_errors++))
      fi

      # Check for SECURITY DEFINER (optional, but if present, search_path is absolutely critical)
      if grep -qiE "SECURITY DEFINER" "$file"; then
        if ! grep -qiE "SET search_path" "$file"; then
          error "$filename: SECURITY DEFINER function found without SET search_path"
          ((file_errors++))
        fi
      fi
    fi

    # Check for auth.uid() or get_my_tenant_id() as a proxy for tenant/auth validation
    if ! grep -qiE "(auth\.uid\(\)|get_my_tenant_id\(\))" "$file"; then
      warn "$filename: CREATE FUNCTION found but no 'auth.uid()' or 'get_my_tenant_id()' check found in this file. Verify RPC auth/tenant validation."
    fi

  fi

  # ── Check 7: Filename format ─────────────────────────────────────────────
  if ! echo "$filename" | grep -qE "^[0-9]{3,}_[a-z0-9_]+\.sql$"; then
    warn "$filename: Filename should match pattern NNN_description.sql (e.g., 100_add_courses_table.sql)"
  fi

  if [[ $file_errors -eq 0 ]]; then
    ok "$filename"
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo "EduSync Migration Validator"
  echo "==========================="
  echo ""

  local files
  mapfile -t files < <(get_files "$@")

  if [[ ${#files[@]} -eq 0 ]]; then
    info "No migration files found to validate."
    exit 0
  fi

  for file in "${files[@]}"; do
    if [[ -f "$file" ]]; then
      check_file "$file"
    fi
  done

  echo ""
  echo "==========================="
  echo "Files checked : $FILES_CHECKED"
  echo "Errors        : $ERRORS"
  echo "Warnings      : $WARNINGS"
  echo ""

  if [[ $ERRORS -gt 0 ]]; then
    echo -e "${RED}FAILED — $ERRORS error(s) found. Fix before merging.${NC}"
    exit 1
  else
    echo -e "${GREEN}PASSED — All migration checks passed.${NC}"
    exit 0
  fi
}

main "$@"
