#!/usr/bin/env bash
# Lint guard for edusync-api/migrations/ numbering.
# - Allows the known exception {010, 011} which are intentionally empty.
# - Allows duplicate 037_* (historical, see docs/handoff/MIGRATION_037_DUPLICATE.md).
# - Errors on any OTHER duplicate prefix.
# - Errors on gaps OTHER than the allow-listed ones.
set -euo pipefail

MIG_DIR="${1:-edusync-api/migrations}"
ALLOW_GAPS="010 011"
ALLOW_DUPS="037"

if [ ! -d "$MIG_DIR" ]; then
  echo "ERROR: migrations dir not found: $MIG_DIR" >&2
  exit 2
fi

shopt -s nullglob
FILES=( "$MIG_DIR"/*.sql )
shopt -u nullglob
if [ "${#FILES[@]}" -eq 0 ]; then
  echo "ERROR: no .sql files in $MIG_DIR" >&2
  exit 2
fi

# Extract numeric prefixes (zero-padded, 3 digits)
PREFIXES=()
for f in "${FILES[@]}"; do
  base=$(basename "$f")
  pre=$(echo "$base" | grep -oE '^[0-9]{3}' || true)
  if [ -z "$pre" ]; then
    echo "ERROR: migration without 3-digit prefix: $base" >&2
    exit 1
  fi
  PREFIXES+=("$pre")
done

UNIQ_PREFIXES=$(printf '%s\n' "${PREFIXES[@]}" | sort -u)
DUP_PREFIXES=$(printf '%s\n' "${PREFIXES[@]}" | sort | uniq -d)

# Check duplicates
for d in $DUP_PREFIXES; do
  if echo " $ALLOW_DUPS " | grep -q " $d "; then
    continue
  fi
  echo "ERROR: duplicate migration prefix: $d" >&2
  ls "$MIG_DIR/${d}_"*.sql >&2 || true
  exit 1
done

# Check gaps
MIN=$(printf '%s\n' "${UNIQ_PREFIXES}" | head -1 | sed 's/^0*//')
MAX=$(printf '%s\n' "${UNIQ_PREFIXES}" | tail -1 | sed 's/^0*//')
MIN=${MIN:-1}
for (( i=MIN; i<=MAX; i++ )); do
  zp=$(printf '%03d' "$i")
  if printf '%s\n' "${UNIQ_PREFIXES}" | grep -q "^$zp$"; then
    continue
  fi
  if echo " $ALLOW_GAPS " | grep -q " $zp "; then
    continue
  fi
  echo "ERROR: missing migration prefix: $zp (use the next free prefix at the tail)" >&2
  exit 1
done

echo "OK: migration sequence valid (${#FILES[@]} files, prefixes ${MIN}..${MAX}, exceptions: gaps=$ALLOW_GAPS dups=$ALLOW_DUPS)"
