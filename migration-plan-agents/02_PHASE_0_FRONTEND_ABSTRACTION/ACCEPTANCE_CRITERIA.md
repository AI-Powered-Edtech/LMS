# Phase 0 Acceptance Criteria

**Verification checklist for Phase 0 completion**

---

## 1. getApiClient() Callable from Hooks AND Service Files

### Criteria

- [ ] `getApiClient()` returns `ApiClient` interface
- [ ] Works in React hooks (via import)
- [ ] Works in service files (plain functions, not hooks)
- [ ] Module-level singleton pattern, NOT React Context

### Verification

```bash
# 1. getApiClient() export exists
grep -q "export function getApiClient" src/services/api/apiClient.ts && echo "PASS: getApiClient exported" || echo "FAIL: getApiClient not found"

# 2. Singleton pattern (not React Context)
grep -q "useContext" src/services/api/apiClient.ts && echo "FAIL: uses React Context" || echo "PASS: no React Context"

# 3. At least one service file uses getApiClient()
grep -rq "getApiClient" src/features/courses/api/ && echo "PASS: courseService uses getApiClient" || echo "FAIL: courseService not refactored"

# 4. Build passes with abstraction layer
pnpm typecheck && echo "PASS: typecheck" || echo "FAIL: typecheck"
```

### Evidence

- `src/services/api/apiClient.ts` exports `getApiClient()`
- Pattern used in `courseService.ts` and other refactored files
- No `useContext` usage in abstraction layer

---

## 2. Full Vertical Slice Courses Verified

### Criteria

- [ ] Course list page works
- [ ] Course detail page works
- [ ] Create course flow works
- [ ] Edit course flow works
- [ ] Course status changes persist
- [ ] Course modules display correctly

### Verification

Manual test or E2E test:

```bash
# Login as teacher
# Navigate to course management
# Create new course
# Edit course title/description
# Add module
# Publish course
# Verify course appears in student view
```

### Evidence

- `src/features/courses/` uses only `getApiClient()`
- No direct Supabase imports in courses feature
- `courseService.ts` refactored (Task 0A-8)

---

## 3. Zero Supabase Imports in features/, contexts/, utils/, components/

### Criteria

- [ ] `src/features/**` — 0 direct imports from `@/services/supabase/client`
- [ ] `src/contexts/**` — 0 direct imports from `@/services/supabase/client`
- [ ] `src/utils/**` — 0 direct imports from `@/services/supabase/client`
- [ ] `src/components/**` — 0 direct imports from `@/services/supabase/client`

### Verification

```bash
# Check features/
echo "=== features/ ==="
grep -rn "from '@/services/supabase/client'" src/features/ || echo "✅ Clean"

# Check contexts/
echo "=== contexts/ ==="
grep -rn "from '@/services/supabase/client'" src/contexts/ || echo "✅ Clean"

# Check utils/
echo "=== utils/ ==="
grep -rn "from '@/services/supabase/client'" src/utils/ || echo "✅ Clean"

# Check components/
echo "=== components/ ==="
grep -rn "from '@/services/supabase/client'" src/components/ || echo "✅ Clean"
```

### Expected Results

```
=== features/ ===
✅ Clean (0 results)

=== contexts/ ===
✅ Clean (0 results)

=== utils/ ===
✅ Clean (0 results)

=== components/ ===
✅ Clean (0 results)
```

### Permitted Locations

Supabase imports ARE allowed in:

- `src/services/api/supabaseApiClient.ts` (abstraction implementation)
- `src/services/auth/supabaseAuthProvider.ts` (auth abstraction)
- `src/services/realtime/supabaseRealtimeProvider.ts` (realtime abstraction)
- `src/services/storage/supabaseStorageProvider.ts` (storage abstraction)

---

## 4. CI Guard Active

### Criteria

- [ ] ESLint `no-restricted-imports` rule exists
- [ ] Rule blocks `@/services/supabase/client` import
- [ ] Rule set to `error` level (not `warn`)
- [ ] Violations cause CI failure

### Verification

```bash
# 1. Verify ESLint rule exists and is at error level
grep -A5 "no-restricted-imports" eslint.config.js | grep -q "'error'" && echo "PASS: CI Guard at error level" || echo "FAIL: CI Guard not at error level (check if still at warn)"

# 2. Verify abstraction layer is exempt from the rule
pnpm lint src/services/api/supabaseApiClient.ts 2>&1 | grep -q "error" && echo "FAIL: abstraction layer not exempted" || echo "PASS: abstraction layer exempted"

# 3. Verify no violations exist in feature code
pnpm lint src/features/ 2>&1 | grep -i "restricted" && echo "FAIL: restricted import violations found" || echo "PASS: no restricted import violations"
```

---

## 5. All E2E Tests Pass

### Criteria

- [ ] `pnpm test:e2e` passes (or equivalent)
- [ ] Auth flow works (login, logout, session management)
- [ ] Course CRUD works
- [ ] Realtime features work (if applicable)
- [ ] Storage features work (if applicable)

### Verification

```bash
# Full test suite
pnpm typecheck && pnpm lint && pnpm test:ci && pnpm build

# If E2E tests exist
pnpm test:e2e
```

### Success Output

```
✅ pnpm typecheck — 0 errors
✅ pnpm lint — no errors
✅ pnpm test:ci — all tests pass
✅ pnpm build — success
```

---

## Additional Verification Commands

### Import Audit Script

Save as `scripts/phase0-audit.sh` and run with `bash scripts/phase0-audit.sh` from repo root.

```bash
#!/bin/bash
# Phase 0 Acceptance Verification Script
# Run from repo root: bash scripts/phase0-audit.sh

set -uo pipefail
PASS=0
FAIL=0

check() {
  local label="$1" result="$2"
  if [ "$result" = "0" ]; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Phase 0 Acceptance Verification ==="
echo ""

# 1. getApiClient() exists
echo "1. getApiClient() exported"
grep -q "export function getApiClient" src/services/api/apiClient.ts 2>/dev/null
check "getApiClient exported from src/services/api/apiClient.ts" "$?"

# 2-5. Zero direct Supabase imports in protected directories
for dir in features contexts utils components; do
  echo ""
  echo "2-5. Direct Supabase imports in $dir/"
  COUNT=$(grep -rn "from '@/services/supabase/client'" "src/$dir/" 2>/dev/null | wc -l)
  echo "     Found: $COUNT imports (target: 0)"
  if [ "$COUNT" -eq "0" ]; then
    check "$dir/ clean" "0"
  else
    check "$dir/ has $COUNT violations" "1"
    grep -rn "from '@/services/supabase/client'" "src/$dir/" 2>/dev/null | head -20
  fi
done

# 6. ESLint CI Guard at error level
echo ""
echo "6. ESLint CI Guard"
grep -q "no-restricted-imports" eslint.config.js 2>/dev/null
check "no-restricted-imports rule exists in eslint.config.js" "$?"

# 7. TypeScript compiles
echo ""
echo "7. TypeScript"
pnpm typecheck > /dev/null 2>&1
check "pnpm typecheck passes" "$?"

# 8. Build succeeds
echo ""
echo "8. Build"
pnpm build > /dev/null 2>&1
check "pnpm build succeeds" "$?"

# Summary
echo ""
echo "=== Summary ==="
echo "PASS: $PASS  FAIL: $FAIL"
if [ "$FAIL" -eq "0" ]; then
  echo "PHASE 0 COMPLETE"
  exit 0
else
  echo "PHASE 0 INCOMPLETE — fix $FAIL failing checks"
  exit 1
fi
```

---

## Sign-Off Checklist

Before declaring Phase 0 complete:

| #   | Criteria                    | Status | Evidence                  |
| --- | --------------------------- | ------ | ------------------------- |
| 1   | `getApiClient()` callable   | [ ]    | Verified in service files |
| 2   | Vertical slice courses      | [ ]    | Manual or E2E test        |
| 3   | Zero imports in features/   | [ ]    | grep audit clean          |
| 4   | Zero imports in contexts/   | [ ]    | grep audit clean          |
| 5   | Zero imports in utils/      | [ ]    | grep audit clean          |
| 6   | Zero imports in components/ | [ ]    | grep audit clean          |
| 7   | CI Guard active             | [ ]    | ESLint error level        |
| 8   | All E2E tests pass          | [ ]    | Test suite green          |

**All criteria must be ✅ before Phase 0 is considered complete.**

---

## Phase 0 vs Phase 1 Handoff

Phase 0 complete means:

- ✅ Frontend fully abstracted from Supabase
- ✅ VIL stubs in place (all throw "Not implemented")
- ✅ Feature flag `VITE_API_BACKEND=vil` can be toggled

Phase 1 starts with:

- 🆕 VIL backend implementation
- 🆕 Edge Functions replaced with VIL endpoints
- 🆕 Auth, Realtime, Storage VIL implementations filled in
