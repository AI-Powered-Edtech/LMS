#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# EduSync LMS — TWA (Trusted Web Activity) bootstrap helper
#
# Guides a human through Bubblewrap-based TWA setup so the PWA can be wrapped
# as an Android App Bundle (AAB) and published to the Play Store.
#
# This script INTENTIONALLY does not execute `bubblewrap init` on your behalf.
# Bubblewrap is interactive (package name, app name, signing key, icons, ...)
# and you should review every prompt. We only verify prerequisites, ensure the
# Bubblewrap CLI is installed, and print the exact command to run next.
#
# Env vars:
#   EDUSYNC_DOMAIN   Fully qualified domain serving the PWA manifest.
#                    Default: app.edusync.id
#
# Usage:
#   ./scripts/twa-bootstrap.sh
#   EDUSYNC_DOMAIN=staging.edusync.id ./scripts/twa-bootstrap.sh
# ---------------------------------------------------------------------------

DOMAIN="${EDUSYNC_DOMAIN:-app.edusync.id}"
MANIFEST_URL="https://${DOMAIN}/manifest.webmanifest"

# ANSI helpers (plain fallback when not a TTY)
if [ -t 1 ]; then
  C_RED=$'\033[0;31m'
  C_GREEN=$'\033[0;32m'
  C_YELLOW=$'\033[0;33m'
  C_BLUE=$'\033[0;34m'
  C_BOLD=$'\033[1m'
  C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_BOLD=""; C_RESET=""
fi

info()  { printf '%s[i]%s %s\n' "${C_BLUE}"   "${C_RESET}" "$*"; }
ok()    { printf '%s[ok]%s %s\n' "${C_GREEN}" "${C_RESET}" "$*"; }
warn()  { printf '%s[!]%s %s\n' "${C_YELLOW}" "${C_RESET}" "$*"; }
fail() {
  printf '%s[x]%s %s\n' "${C_RED}" "${C_RESET}" "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 \
    || fail "Missing required command: $1. Install it and re-run this script."
}

# --- Prereq checks ---------------------------------------------------------

check_node() {
  require_cmd node
  local raw major
  raw="$(node --version)"              # e.g. v20.11.1
  major="${raw#v}"; major="${major%%.*}"
  if [ "${major}" -lt 20 ]; then
    fail "Node.js 20+ required (found ${raw}). Install from https://nodejs.org/"
  fi
  ok "Node.js ${raw}"
}

check_jdk() {
  require_cmd java
  # `java -version` prints to stderr. Versions look like:
  #   openjdk version "17.0.10" 2024-01-16
  #   java version "21.0.2" 2024-01-16 LTS
  local version_line major
  version_line="$(java -version 2>&1 | head -n 1)"
  major="$(printf '%s' "${version_line}" \
    | sed -nE 's/.*version "([0-9]+)(\.[0-9]+)*.*/\1/p')"
  if [ -z "${major}" ]; then
    fail "Could not parse Java version from: ${version_line}"
  fi
  if [ "${major}" -lt 17 ]; then
    fail "JDK 17+ required (found ${version_line}). Install e.g. Temurin 17."
  fi
  ok "JDK ${version_line}"
}

check_android_sdk() {
  if [ -z "${ANDROID_HOME:-}" ]; then
    fail "ANDROID_HOME is not set. Install the Android SDK / command-line tools and export ANDROID_HOME (typically ~/Android/Sdk)."
  fi
  if [ ! -d "${ANDROID_HOME}" ]; then
    fail "ANDROID_HOME points to '${ANDROID_HOME}' but that directory does not exist."
  fi
  ok "ANDROID_HOME=${ANDROID_HOME}"
}

ensure_bubblewrap() {
  if command -v bubblewrap >/dev/null 2>&1; then
    ok "Bubblewrap CLI: $(bubblewrap --version 2>/dev/null || echo installed)"
    return
  fi
  warn "Bubblewrap CLI not found. Installing @bubblewrap/cli globally via npm..."
  if ! npm install -g @bubblewrap/cli; then
    fail "npm install -g @bubblewrap/cli failed. Fix npm permissions or install manually."
  fi
  ok "Bubblewrap CLI installed"
}

# --- Main ------------------------------------------------------------------

printf '%s== EduSync LMS — TWA bootstrap ==%s\n' "${C_BOLD}" "${C_RESET}"
info "Target manifest: ${MANIFEST_URL}"
echo

info "Checking prerequisites..."
check_node
check_jdk
check_android_sdk
ensure_bubblewrap
echo

cat <<EOF
${C_BOLD}Next steps (run these yourself — Bubblewrap is interactive):${C_RESET}

  1. Create and enter a dedicated output directory:
       mkdir -p ~/edusync-twa && cd ~/edusync-twa

  2. Initialise the TWA project from the PWA manifest:
       bubblewrap init --manifest=${MANIFEST_URL}

     Recommended answers to the prompts:
       - Application ID / package name: ${C_BOLD}id.edusync.lms${C_RESET}
       - Application name:              ${C_BOLD}EduSync LMS${C_RESET}
       - Launcher name:                 EduSync
       - Display mode:                  standalone
       - Orientation:                   default (or portrait)
       - Status bar color / theme:      accept defaults from manifest
       - Signing key:                   ${C_BOLD}generate a new keystore${C_RESET}
                                       (store keystore + passwords in 1Password / Vault;
                                        losing the key = cannot ship future updates)

  3. Build the release artifact (produces app-release.aab):
       bubblewrap build

  4. Upload ${C_BOLD}app-release.aab${C_RESET} to Play Console > Internal testing track.

  5. In Play Console > Setup > App signing, copy the
     ${C_BOLD}SHA-256 certificate fingerprint${C_RESET} of the app signing key.

  6. In this repo, copy the assetlinks template and fill it in:
       cp public/.well-known/assetlinks.json.template \\
          public/.well-known/assetlinks.json
       # then replace {{APP_PACKAGE}} with id.edusync.lms
       # and      {{SHA256_FINGERPRINT}} with the value from step 5.

  7. Deploy the frontend so that
       https://${DOMAIN}/.well-known/assetlinks.json
     is served over HTTPS with Content-Type: application/json.

  8. Verify digital asset links are reachable:
       curl -fsSL https://${DOMAIN}/.well-known/assetlinks.json

  9. On an Android device, tap a link to ${DOMAIN} — it should open in the
     installed TWA (no browser address bar). If you see the URL bar at the top,
     assetlinks verification failed — see docs/TWA.md for troubleshooting.

See ${C_BOLD}docs/TWA.md${C_RESET} for the full playbook, signing-key hygiene,
and maintenance guidance.
EOF
