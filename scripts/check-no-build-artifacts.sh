#!/usr/bin/env bash
# Fails CI if node_modules/ or target/ ever appear in git tracked files.
set -euo pipefail

BAD=$(git ls-files | grep -E '^(node_modules|target|.next|dist)/' || true)
if [ -n "$BAD" ]; then
  echo "ERROR: build artifacts committed to repo:" >&2
  echo "$BAD" | head -20 >&2
  echo "..." >&2
  echo "Run: git rm -rf --cached <path>; commit; ensure .gitignore covers it." >&2
  exit 1
fi
echo "OK: no build artifacts in git ls-files"
