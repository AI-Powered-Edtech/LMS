#!/usr/bin/env bash
# Prune remote branches that are fully merged into origin/main.
# By default DRY RUN: just lists what would be deleted.
# Pass --apply to actually delete (requires push permission).
#
# Usage:
#   scripts/prune-merged-branches.sh           # dry run
#   scripts/prune-merged-branches.sh --apply   # delete
set -euo pipefail

APPLY=0
if [ "${1:-}" = "--apply" ]; then
  APPLY=1
fi

KEEP_REGEX='^origin/(HEAD|main|master|develop|staging|production|release/.*)$'

git fetch --prune origin >/dev/null 2>&1

MERGED=$(git branch -r --merged origin/main \
  | sed 's|^[ *]*||' \
  | grep -vE "$KEEP_REGEX" \
  | grep -vE '^origin/HEAD' \
  || true)

if [ -z "$MERGED" ]; then
  echo "OK: no merged branches to prune"
  exit 0
fi

echo "Branches reachable from origin/main and eligible for pruning:"
echo "$MERGED" | sed 's|^|  |'
COUNT=$(echo "$MERGED" | wc -l)
echo "Total: $COUNT"

if [ "$APPLY" -eq 0 ]; then
  echo
  echo "DRY RUN. Re-run with --apply to delete."
  exit 0
fi

echo
echo "Deleting $COUNT remote branches (origin)..."
FAILED=0
while IFS= read -r ref; do
  bn=${ref#origin/}
  if git push origin --delete "$bn" 2>&1 | tail -1; then
    : ok
  else
    FAILED=$((FAILED+1))
  fi
done <<< "$MERGED"
echo "done. failed=$FAILED"
exit $FAILED
