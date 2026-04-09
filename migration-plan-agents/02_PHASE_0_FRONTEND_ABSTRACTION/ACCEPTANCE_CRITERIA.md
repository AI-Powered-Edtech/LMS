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
# Test in service file (not a hook)
cat > /tmp/test-service.ts << 'EOF'
import { getApiClient } from '@/services/api'
export async function test() {
  const db = getApiClient()
  return db.from('courses').select('*')
}
EOF

# Test in hook
cat > /tmp/test-hook.ts << 'EOF'
import { getApiClient } from '@/services/api'
export function useTest() {
  const db = getApiClient()
  return db.from('courses').select('*')
}
EOF

pnpm typecheck /tmp/test-service.ts /tmp/test-hook.ts
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
# Test that rule catches violations
cat > /tmp/violation.ts << 'EOF'
import { supabase } from '@/services/supabase/client'
EOF

pnpm lint /tmp/violation.ts 2>&1 | grep -i "restricted\|error"
# Expected: Error about restricted imports

# Verify abstraction layer is exempt
pnpm lint src/services/api/supabaseApiClient.ts
# Expected: No errors (exempted by path)

# Verify CI config
grep -A5 "no-restricted-imports" eslint.config.js
# Expected: Level is 'error'
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

```bash
#!/bin/bash
set -e

echo "=== Phase 0 Acceptance Verification ==="
echo ""

echo "1. getApiClient() exists and callable"
grep -q "export function getApiClient" src/services/api/apiClient.ts && echo "   ✅ getApiClient exported" || echo "   ❌ Missing"
echo ""

echo "2. Supabase imports in features/"
FEATURES_COUNT=$(grep -rn "from '@/services/supabase/client'" src/features/ 2>/dev/null | wc -l)
echo "   Found: $FEATURES_COUNT imports"
[ "$FEATURES_COUNT" -eq "0" ] && echo "   ✅ Clean" || echo "   ❌ Has violations"
echo ""

echo "3. Supabase imports in contexts/"
CONTEXTS_COUNT=$(grep -rn "from '@/services/supabase/client'" src/contexts/ 2>/dev/null | wc -l)
echo "   Found: $CONTEXTS_COUNT imports"
[ "$CONTEXTS_COUNT" -eq "0" ] && echo "   ✅ Clean" || echo "   ❌ Has violations"
echo ""

echo "4. Supabase imports in utils/"
UTILS_COUNT=$(grep -rn "from '@/services/supabase/client'" src/utils/ 2>/dev/null | wc -l)
echo "   Found: $UTILS_COUNT imports"
[ "$UTILS_COUNT" -eq "0" ] && echo "   ✅ Clean" || echo "   ❌ Has violations"
echo ""

echo "5. Supabase imports in components/"
COMPONENTS_COUNT=$(grep -rn "from '@/services/supabase/client'" src/components/ 2>/dev/null | wc -l)
echo "   Found: $COMPONENTS_COUNT imports"
[ "$COMPONENTS_COUNT" -eq "0" ] && echo "   ✅ Clean" || echo "   ❌ Has violations"
echo ""

echo "6. ESLint CI Guard"
grep -q "'error'" eslint.config.js && echo "   ✅ CI Guard at error level" || echo "   ❌ CI Guard not set"
echo ""

echo "7. Build"
pnpm build > /dev/null 2>&1 && echo "   ✅ Build succeeds" || echo "   ❌ Build fails"
echo ""

echo "=== Summary ==="
TOTAL=$((FEATURES_COUNT + CONTEXTS_COUNT + UTILS_COUNT + COMPONENTS_COUNT))
echo "Total violations: $TOTAL"
[ "$TOTAL" -eq "0" ] && echo "✅ PHASE 0 COMPLETE" || echo "❌ PHASE 0 INCOMPLETE"
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
