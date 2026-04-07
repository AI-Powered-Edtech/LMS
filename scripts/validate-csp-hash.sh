#!/usr/bin/env bash
# =============================================================================
# EduSync LMS — CSP Hash Validator
# =============================================================================
# Validates that the SHA256 hash of the inline bootstrap script in index.html
# matches the hash declared in all deployment config files.
#
# The bootstrap script (font swap + dark-mode class) runs before React mounts.
# If its content changes but the hash is not updated, CSP will block execution
# and the app will break at the loading screen.
#
# Usage:
#   bash scripts/validate-csp-hash.sh          # Run locally
#   # In CI: add as a step before build/deploy
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

INDEX_HTML="$PROJECT_DIR/index.html"
VITE_CONFIG="$PROJECT_DIR/vite.config.ts"
VERCEL_JSON="$PROJECT_DIR/vercel.json"
PUBLIC_HEADERS="$PROJECT_DIR/public/_headers"
NGINX_CONF="$PROJECT_DIR/docker/nginx.conf"

# ── Step 1: Extract the bootstrap inline script from index.html ──────────────
# The script is the second <script> tag (the first is type="module" at the end).
# We extract the content between <script> and </script> for the inline one.

BOOTSTRAP_SCRIPT=$(grep -oP '(?<=<script>).*?(?=</script>)' "$INDEX_HTML" | grep -v 'type=' | head -1)

if [ -z "$BOOTSTRAP_SCRIPT" ]; then
  echo -e "${RED}ERROR: Could not extract bootstrap script from index.html${NC}"
  exit 1
fi

# ── Step 2: Compute SHA256 hash (base64 → CSP format) ───────────────────────
# CSP uses base64-encoded SHA256. We compute it from the exact script content.
HASH=$(printf '%s' "$BOOTSTRAP_SCRIPT" | openssl dgst -sha256 -binary | openssl base64 -A)
EXPECTED_HASH="sha256-${HASH}"

echo -e "${YELLOW}Computed CSP hash: ${EXPECTED_HASH}${NC}"

# ── Step 3: Extract declared hash from each config file ──────────────────────
extract_hash_from_file() {
  local file="$1"
  local pattern="sha256-[A-Za-z0-9+/=]\{1,\}"
  grep -o "$pattern" "$file" | head -1
}

declare -A FILES=(
  ["index.html"]="$INDEX_HTML"
  ["vite.config.ts"]="$VITE_CONFIG"
  ["vercel.json"]="$VERCEL_JSON"
  ["public/_headers"]="$PUBLIC_HEADERS"
  ["docker/nginx.conf"]="$NGINX_CONF"
)

ERRORS=0

for name in "${!FILES[@]}"; do
  file="${FILES[$name]}"
  if [ ! -f "$file" ]; then
    echo -e "${RED}MISSING: $name (file not found)${NC}"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  declared_hash=$(extract_hash_from_file "$file")

  if [ -z "$declared_hash" ]; then
    echo -e "${RED}MISSING: $name (no sha256 hash found)${NC}"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  if [ "$declared_hash" != "$EXPECTED_HASH" ]; then
    echo -e "${RED}MISMATCH: $name${NC}"
    echo -e "  Expected: ${EXPECTED_HASH}"
    echo -e "  Found:    ${declared_hash}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}OK: $name${NC}"
  fi
done

# ── Step 4: Report ───────────────────────────────────────────────────────────
echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}CSP hash validation FAILED with $ERRORS error(s).${NC}"
  echo -e "${YELLOW}If you changed the bootstrap script in index.html, update the${NC}"
  echo -e "${YELLOW}hash in all deployment config files. Run:${NC}"
  echo ""
  echo -e "  printf '%s' '<SCRIPT_CONTENT>' | openssl dgst -sha256 -binary | openssl base64 -A"
  echo ""
  echo -e "${YELLOW}Then replace the old hash with the new 'sha256-...' value in:${NC}"
  echo -e "  - vite.config.ts (indexBootstrapScriptHash constant)"
  echo -e "  - vercel.json (Content-Security-Policy header value)"
  echo -e "  - public/_headers (Content-Security-Policy header)"
  echo -e "  - docker/nginx.conf (add_header Content-Security-Policy)"
  exit 1
else
  echo -e "${GREEN}All CSP hashes match. OK.${NC}"
  exit 0
fi
