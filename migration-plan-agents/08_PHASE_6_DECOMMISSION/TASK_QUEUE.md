# TASK QUEUE — Phase 6: Decommission

**Weeks 67-72 | ~50 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — pakai `pnpm`
3. Jalankan verify commands setelah setiap task
4. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
5. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di synthesized plan
6. Jika ketemu coupling tak terduga → **BLOCKED**, bukan improvisasi
7. **Rollback rule:** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 6X-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>`

## Effort Estimate

| Wave | Tasks                        | Jam   | Parallelism |
| ---- | ---------------------------- | ----- | ----------- |
| 6A   | Remove Supabase Dependencies | 10-15 | Parallel    |
| 6B   | Remove Edge Functions        | 10-15 | Serial      |
| 6C   | Database Cleanup             | 10-15 | Serial      |
| 6D   | Final Testing                | 15-20 | Serial      |

## Dependency Map

```
6A-0: Final Audit (BLOCKING)
  │
  ├── 6A-1: Remove @supabase/supabase-js
  │     │
  │     ├── 6A-2: Remove abstraction implementations
  │     │
  │     └── 6A-3: Remove Supabase config
  │           │
  │           └── 6B-0: Remove Edge Functions
  │                 │
  │                 ├── 6B-1: Delete functions directory
  │                 │
  │                 └── 6B-2: Update nginx (if needed)
  │                       │
  │                       └── 6C-0: Database Cleanup
  │                             │
  │                             ├── 6C-1: Remove RLS policies
  │                             │
  │                             ├── 6C-2: Migrate DB hosting (if needed)
  │                             │
  │                             └── 6C-3: Update Sentry
  │                                   │
  │                                   └── 6D-0: Final Testing
  │                                         │
  │                                         ├── 6D-1: E2E test suite
  │                                         │
  │                                         ├── 6D-2: Load test (k6)
  │                                         │
  │                                         └── 6D-3: PWA update
```

## Tasks

### 6A: Remove Supabase Dependencies

#### Task 6A-0: Final Audit

```
TASK ID:       6A-0
OWNER TYPE:    Backend Agent
GOAL:          Final audit of Supabase dependencies
EDIT ONLY:     docs/DECOMMISSION_AUDIT.md (new)
DEPENDENCY:    Phase 5 complete
```

**Audit commands:**

```bash
# 1. Find all Supabase imports in source code
echo "=== Supabase Imports ==="
grep -rn "@supabase\|from.*supabase\|require.*supabase" src/ --include="*.ts" --include="*.tsx"

# 2. Find all Supabase config files
echo "=== Supabase Config Files ==="
find . -name "supabase*" -o -name ".supabase" | grep -v node_modules | grep -v .git

# 3. Find all Supabase environment variables
echo "=== Supabase Env Vars ==="
grep -rn "SUPABASE" .env* vite-env.d.ts src/ --include="*.ts" --include="*.tsx" --include="*.env*"

# 4. Find Supabase in package.json
echo "=== Supabase Packages ==="
grep -n "supabase" package.json

# 5. Summary
echo ""
echo "=== Audit Summary ==="
IMPORT_COUNT=$(grep -rn "@supabase\|from.*supabase" src/ --include="*.ts" --include="*.tsx" | wc -l)
CONFIG_COUNT=$(find . -name "supabase*" -o -name ".supabase" | grep -v node_modules | grep -v .git | wc -l)
ENV_COUNT=$(grep -rn "SUPABASE" .env* 2>/dev/null | wc -l)
PKG_COUNT=$(grep -c "supabase" package.json)
echo "Imports: $IMPORT_COUNT"
echo "Config files: $CONFIG_COUNT"
echo "Env vars: $ENV_COUNT"
echo "Package refs: $PKG_COUNT"
TOTAL=$((IMPORT_COUNT + CONFIG_COUNT + ENV_COUNT + PKG_COUNT))
[ "$TOTAL" -gt 0 ] && echo "STATUS: $TOTAL references found — must be removed before proceeding" || echo "STATUS: Clean — no Supabase references"
```

**Verify:**

```bash
grep -rn "@supabase" src/ --include="*.ts" --include="*.tsx" | grep -v "test\|spec\|__test__" \
  && echo "FAIL: Supabase imports remain in production code" || echo "PASS: No Supabase imports in production code"
```

---

#### Task 6A-1: Remove @supabase/supabase-js

```
TASK ID:       6A-1
OWNER TYPE:    Frontend Agent
GOAL:          Remove Supabase JS package from package.json
EDIT ONLY:     package.json, pnpm-lock.yaml
DEPENDENCY:    6A-0
```

**Commands:**

```bash
# Remove all Supabase packages
pnpm remove @supabase/supabase-js @supabase/gotrue-js @supabase/realtime-js @supabase/storage-js @supabase/functions-js @supabase/postgrest-js 2>/dev/null

# Verify removal from package.json
grep -n "supabase" package.json && echo "FAIL: supabase still in package.json" || echo "PASS: supabase removed from package.json"

# Verify lockfile updated
grep -c "supabase" pnpm-lock.yaml | xargs -I{} sh -c '[ {} -eq 0 ] && echo "PASS: lockfile clean" || echo "WARN: {} supabase refs in lockfile (transitive deps?)"'

# Install to regenerate lockfile
pnpm install

# Typecheck to verify no broken imports
pnpm typecheck 2>&1 | tail -5
echo "If typecheck passes, task is complete"
```

**Verify:**

```bash
pnpm install && pnpm typecheck 2>&1 | tail -1 && echo "PASS" || echo "FAIL"
```

---

#### Task 6A-2: Remove Abstraction Implementations

```
TASK ID:       6A-2
OWNER TYPE:    Frontend Agent
GOAL:          Remove Supabase API/Auth/Storage/Realtime providers
EDIT ONLY:     src/services/api/supabaseApiClient.ts (delete)
               src/services/auth/supabaseAuthProvider.ts (delete)
               src/services/storage/supabaseStorageProvider.ts (delete)
               src/services/realtime/supabaseRealtimeProvider.ts (delete)
DEPENDENCY:    6A-1
```

**Commands:**

```bash
# Delete Supabase provider files
rm -f src/services/api/supabaseApiClient.ts
rm -f src/services/auth/supabaseAuthProvider.ts
rm -f src/services/storage/supabaseStorageProvider.ts
rm -f src/services/realtime/supabaseRealtimeProvider.ts

# Verify files are gone
for FILE in \
  src/services/api/supabaseApiClient.ts \
  src/services/auth/supabaseAuthProvider.ts \
  src/services/storage/supabaseStorageProvider.ts \
  src/services/realtime/supabaseRealtimeProvider.ts; do
  [ -f "$FILE" ] && echo "FAIL: $FILE still exists" || echo "PASS: $FILE deleted"
done

# Verify VIL providers remain
for FILE in \
  src/services/api/vilApiClient.ts \
  src/services/auth/vilAuthProvider.ts \
  src/services/storage/vilStorageProvider.ts \
  src/services/realtime/vilRealtimeProvider.ts; do
  [ -f "$FILE" ] && echo "PASS: $FILE exists" || echo "FAIL: $FILE missing — do not delete VIL providers"
done

# Check no imports reference deleted files
grep -rn "supabaseApiClient\|supabaseAuthProvider\|supabaseStorageProvider\|supabaseRealtimeProvider" src/ --include="*.ts" --include="*.tsx" \
  && echo "FAIL: Dead imports found — update them to VIL providers" || echo "PASS: No dead imports"
```

**Verify:**

```bash
pnpm typecheck 2>&1 | tail -1 && echo "PASS: Build with VIL providers only" || echo "FAIL"
```

---

#### Task 6A-3: Remove Supabase Config

```
TASK ID:       6A-3
OWNER TYPE:    Frontend Agent
GOAL:          Remove Supabase environment variables and config
EDIT ONLY:     .env, .env.example, vite-env.d.ts
DEPENDENCY:    6A-2
```

**Commands:**

```bash
# Remove Supabase env vars from .env files
for ENVFILE in .env .env.local .env.production .env.staging .env.example; do
  if [ -f "$ENVFILE" ]; then
    grep -v "SUPABASE" "$ENVFILE" > "$ENVFILE.tmp" && mv "$ENVFILE.tmp" "$ENVFILE"
    echo "Cleaned $ENVFILE"
  fi
done

# Remove Supabase type declarations from vite-env.d.ts
if [ -f "vite-env.d.ts" ]; then
  grep -v "SUPABASE" vite-env.d.ts > vite-env.d.ts.tmp && mv vite-env.d.ts.tmp vite-env.d.ts
  echo "Cleaned vite-env.d.ts"
fi

# Remove supabase client initialization file if it exists
rm -f src/lib/supabase.ts src/lib/supabaseClient.ts src/config/supabase.ts

# Delete supabase config directory if present
rm -rf supabase/config.toml supabase/.temp
```

**Verify:**

```bash
grep -rn "SUPABASE" .env* vite-env.d.ts 2>/dev/null && echo "FAIL: SUPABASE refs remain" || echo "PASS: All SUPABASE env vars removed"

# Verify VIL env vars are present
grep -q "VITE_API_URL" .env && echo "PASS: VIL API URL present" || echo "FAIL: Missing VITE_API_URL"
grep -q "VITE_WS_URL" .env && echo "PASS: VIL WS URL present" || echo "FAIL: Missing VITE_WS_URL"
```

---

### 6B: Remove Edge Functions

#### Task 6B-0: Delete Functions Directory

```
TASK ID:       6B-0
OWNER TYPE:    Backend Agent
GOAL:          Remove supabase/functions directory
EDIT ONLY:     supabase/functions/ (delete entire directory)
DEPENDENCY:    6A-3
```

**Commands:**

```bash
# List all Edge Functions being deleted (for audit trail)
echo "=== Deleting Edge Functions ==="
ls -1 supabase/functions/ 2>/dev/null || echo "Directory already removed"

# Delete all Edge Function directories
rm -rf supabase/functions/ai-grade-essay \
       supabase/functions/ai-tutor \
       supabase/functions/generate-ai-content \
       supabase/functions/generate-pdf \
       supabase/functions/grade-quiz-attempt \
       supabase/functions/health-check \
       supabase/functions/load-quiz-data \
       supabase/functions/process-progress-events \
       supabase/functions/progress-events \
       supabase/functions/send-email-digest \
       supabase/functions/send-push \
       supabase/functions/lti-jwks \
       supabase/functions/lti-oidc-login \
       supabase/functions/lti-launch \
       supabase/functions/scorm-extract \
       supabase/functions/generate-executive-report \
       supabase/functions/generate-parent-report \
       supabase/functions/bulk-import-users \
       supabase/functions/check-rate-limit \
       supabase/functions/send-parent-digest \
       supabase/functions/send-parent-otp \
       supabase/functions/whatsapp-webhook

# Remove the functions directory itself if empty
rmdir supabase/functions/ 2>/dev/null || rm -rf supabase/functions/

# Remove entire supabase directory if empty
rmdir supabase/ 2>/dev/null || true
```

**Verify:**

```bash
ls supabase/functions/ 2>&1 | grep -q "No such file or directory" \
  && echo "PASS: supabase/functions/ deleted" || echo "FAIL: supabase/functions/ still exists"

# Also check no code references the functions
grep -rn "supabase/functions\|edge-function\|functions/v1" src/ --include="*.ts" --include="*.tsx" \
  && echo "FAIL: Code still references Edge Functions" || echo "PASS: No Edge Function references in code"
```

---

#### Task 6B-1: Update Nginx

```
TASK ID:       6B-1
OWNER TYPE:    DevOps Agent
GOAL:          Remove Supabase Edge Function routes
EDIT ONLY:     nginx.conf
DEPENDENCY:    6B-0
```

**Commands:**

```bash
# Show current Supabase routes in nginx
grep -n "supabase\|functions/v1\|edge-function" nginx.conf

# Remove Supabase-related location blocks
# The exact lines depend on your nginx.conf structure.
# Remove blocks like:
#   location /functions/v1/ {
#       proxy_pass https://YOUR_PROJECT.supabase.co/functions/v1/;
#   }

# After editing, validate:
sudo nginx -t 2>&1
```

**Verify:**

```bash
sudo nginx -t 2>&1 | grep -q "syntax is ok" && echo "PASS: nginx config valid" || echo "FAIL: nginx config broken"
grep -q "functions/v1" nginx.conf && echo "FAIL: Edge Function routes still in nginx" || echo "PASS: Edge Function routes removed"
```

---

### 6C: Database Cleanup

#### Task 6C-0: Remove RLS Policies

```
TASK ID:       6C-0
OWNER TYPE:    Backend Agent
GOAL:          Remove RLS policies (replaced by VIL middleware)
EDIT ONLY:     migrations/ (new migration file)
DEPENDENCY:    6B-1
```

**Migration file `migrations/YYYYMMDD_remove_rls_policies.sql`:**

```sql
-- Phase 6: Remove RLS policies (replaced by VIL TenantGuard + RbacGuard)
-- IMPORTANT: Only run after VIL middleware is verified working

-- Export existing policies for rollback reference
-- Run this SELECT first and save output:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Disable RLS on all public tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'Disabled RLS on: %', tbl.tablename;
  END LOOP;
END $$;

-- Drop all RLS policies on public tables
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    RAISE NOTICE 'Dropped policy: % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END $$;
```

**Run:**

```bash
# First, export existing policies for rollback reference
psql "$DATABASE_URL" -c "
  SELECT schemaname, tablename, policyname, cmd
  FROM pg_policies WHERE schemaname = 'public'
  ORDER BY tablename, policyname
" > /tmp/rls-policies-backup.txt
echo "Backed up $(wc -l < /tmp/rls-policies-backup.txt) policy records"

# Apply migration
psql "$DATABASE_URL" -f migrations/YYYYMMDD_remove_rls_policies.sql
```

**Verify:**

```bash
POLICY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_policies WHERE schemaname = 'public'")
[ "$POLICY_COUNT" -eq 0 ] && echo "PASS: All RLS policies removed (count=$POLICY_COUNT)" || echo "FAIL: $POLICY_COUNT policies remain"
```

---

#### Task 6C-1: Migrate Database Hosting (if needed)

```
TASK ID:       6C-1
OWNER TYPE:    DevOps Agent
GOAL:          Move PostgreSQL from Supabase to independent host
EDIT ONLY:     Infrastructure config
DEPENDENCY:    6C-0
```

**Optional — only if moving off Supabase-hosted PostgreSQL:**

```bash
# Export from Supabase
pg_dump "$SUPABASE_DATABASE_URL" \
  --no-owner --no-acl --clean --if-exists \
  -F custom -f edusync-db-export.dump

echo "Export size: $(du -h edusync-db-export.dump | cut -f1)"

# Import to new host (Cloud SQL / RDS / self-hosted)
pg_restore -d "$NEW_DATABASE_URL" \
  --no-owner --no-acl --clean --if-exists \
  edusync-db-export.dump

# Update VIL backend to use new DB
# Edit: edusync-api/.env
# DATABASE_URL=postgresql://user:pass@new-host:5432/edusync

# Verify connection
psql "$NEW_DATABASE_URL" -c "SELECT count(*) FROM courses"
```

**Verify:**

```bash
# Compare row counts between old and new DB
for TABLE in courses enrollments users profiles lessons quiz_questions; do
  OLD=$(psql "$SUPABASE_DATABASE_URL" -t -c "SELECT count(*) FROM $TABLE")
  NEW=$(psql "$NEW_DATABASE_URL" -t -c "SELECT count(*) FROM $TABLE")
  [ "$OLD" = "$NEW" ] && echo "PASS: $TABLE — $OLD rows match" || echo "FAIL: $TABLE — old=$OLD new=$NEW"
done
```

---

#### Task 6C-2: Update Sentry

```
TASK ID:       6C-2
OWNER TYPE:    Backend Agent
GOAL:          Update Sentry config for VIL-only
EDIT ONLY:     edusync-api/.env, sentry config
DEPENDENCY:    6C-0
```

**Commands:**

```bash
# Remove Supabase-specific Sentry tags from frontend
grep -rn "Sentry.*supabase\|sentry.*supabase" src/ --include="*.ts" --include="*.tsx"

# Update Sentry environment in VIL backend
# Edit edusync-api/.env:
# SENTRY_DSN=https://xxx@sentry.io/yyy
# SENTRY_ENVIRONMENT=production
# SENTRY_RELEASE=vil-1.0.0

# Remove old Supabase Sentry project references
grep -rn "SENTRY" .env* edusync-api/.env 2>/dev/null
```

**Verify:**

```bash
# Trigger a test error and check it appears in Sentry
curl -s -X POST "https://api.edusync.dev/api/v1/debug/sentry-test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'
echo "Check Sentry dashboard for test error within 60 seconds"

# Verify no Supabase-specific Sentry tags remain
grep -rn "supabase" src/ --include="*.ts" --include="*.tsx" | grep -i sentry \
  && echo "FAIL: Supabase Sentry refs remain" || echo "PASS: Sentry clean"
```

---

### 6D: Final Testing

#### Task 6D-0: E2E Test Suite

```
TASK ID:       6D-0
OWNER TYPE:    QA Agent
GOAL:          Run full E2E test suite
EDIT ONLY:     None
DEPENDENCY:    6C-2
```

**Commands:**

```bash
# Full Supabase reference check before testing
echo "=== Pre-test Supabase reference check ==="
grep -rn "@supabase" src/ package.json && echo "FAIL: supabase refs remain" || echo "PASS: No supabase refs"

# Run E2E tests
pnpm test:e2e 2>&1 | tee /tmp/e2e-results.txt

# Check results
FAILED=$(grep -c "FAIL\|failed" /tmp/e2e-results.txt || true)
[ "$FAILED" -eq 0 ] && echo "PASS: All E2E tests passed" || echo "FAIL: $FAILED test failures"
```

**Verify:**

```bash
pnpm test:e2e 2>&1 | tail -5
```

---

#### Task 6D-1: Load Test (k6)

```
TASK ID:       6D-1
OWNER TYPE:    QA Agent
GOAL:          Run k6 load tests
EDIT ONLY:     tests/load/production.js (new if not exists)
DEPENDENCY:    6D-0
```

**k6 load test script `tests/load/production.js`:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'teacher@edusync.dev',
    password: 'password123',
  }), { headers: { 'Content-Type': 'application/json' } });

  const token = JSON.parse(loginRes.body).token;
  return { token };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  // GET /courses
  const coursesRes = http.get(`${BASE_URL}/api/v1/courses`, { headers });
  check(coursesRes, {
    'courses status 200': (r) => r.status === 200,
    'courses has data': (r) => JSON.parse(r.body).length > 0,
  });

  // GET /enrollments
  const enrollRes = http.get(`${BASE_URL}/api/v1/enrollments`, { headers });
  check(enrollRes, {
    'enrollments status 200': (r) => r.status === 200,
  });

  // GET /profile
  const profileRes = http.get(`${BASE_URL}/api/v1/profile`, { headers });
  check(profileRes, {
    'profile status 200': (r) => r.status === 200,
  });

  sleep(1);
}
```

**Run:**

```bash
# Install k6 if not present
which k6 || (curl -s https://github.com/grafana/k6/releases/download/v0.49.0/k6-v0.49.0-linux-amd64.tar.gz | tar xz && sudo mv k6-v0.49.0-linux-amd64/k6 /usr/local/bin/)

# Run load test
k6 run tests/load/production.js 2>&1 | tee /tmp/k6-results.txt

# Check pass/fail
grep -q "thresholds.*FAIL" /tmp/k6-results.txt && echo "FAIL: Load test thresholds breached" || echo "PASS: Load test passed"
```

**Pass Criteria:**

- p95 latency < 500ms
- Error rate < 0.1%
- No memory leaks

**Verify:**

```bash
k6 run tests/load/production.js 2>&1 | grep -E "http_req_duration|http_req_failed|checks"
```

---

#### Task 6D-2: PWA Service Worker Update

```
TASK ID:       6D-2
OWNER TYPE:    Frontend Agent
GOAL:          Update PWA service worker for VIL-only
EDIT ONLY:     public/sw.js (or vite-plugin-pwa config)
DEPENDENCY:    6D-0
```

**Commands:**

```bash
# Find PWA config
grep -rn "supabase" public/sw.js vite.config.ts 2>/dev/null | head -20

# Remove Supabase URLs from caching rules
# In sw.js or VitePWA config, remove:
#   - *.supabase.co from runtime caching
#   - /functions/v1/* from network-first routes
#   - Supabase Storage URLs from cache patterns

# Update API endpoint patterns to VIL
# BEFORE: urlPattern: /^https:\/\/.*\.supabase\.co/
# AFTER:  urlPattern: /^https:\/\/api\.edusync\.dev/
```

**Verify:**

```bash
# Check no Supabase references in PWA config
grep -rn "supabase" public/sw.js vite.config.ts 2>/dev/null | grep -i "pwa\|cache\|worker" \
  && echo "FAIL: Supabase refs in PWA config" || echo "PASS: PWA config clean"

# Build and check service worker
pnpm build
grep -q "supabase" dist/sw.js 2>/dev/null && echo "FAIL: supabase in built SW" || echo "PASS: Built SW clean"

# Final clean build verification
pnpm typecheck && pnpm lint && pnpm build && echo "CLEAN BUILD" || echo "BUILD FAILED"
```

---

## Final Comprehensive Verification

Run this after all Phase 6 tasks are complete:

```bash
#!/bin/bash
echo "=== Phase 6 Final Verification ==="
PASS=true

# 1. No Supabase packages
grep -q "supabase" package.json && { echo "FAIL: supabase in package.json"; PASS=false; } || echo "PASS: No supabase packages"

# 2. No Supabase imports
grep -rn "@supabase" src/ --include="*.ts" --include="*.tsx" && { echo "FAIL: @supabase imports remain"; PASS=false; } || echo "PASS: No @supabase imports"

# 3. No Supabase env vars
grep -rn "SUPABASE" .env* 2>/dev/null && { echo "FAIL: SUPABASE env vars remain"; PASS=false; } || echo "PASS: No SUPABASE env vars"

# 4. Edge Functions deleted
[ -d "supabase/functions" ] && { echo "FAIL: supabase/functions/ still exists"; PASS=false; } || echo "PASS: Edge Functions deleted"

# 5. Clean build
pnpm typecheck && pnpm lint && pnpm build && echo "PASS: Clean build" || { echo "FAIL: Build broken"; PASS=false; }

# 6. Tests pass
pnpm test:e2e 2>&1 | tail -1

echo ""
$PASS && echo "=== ALL CHECKS PASSED — PROJECT COMPLETE ===" || echo "=== SOME CHECKS FAILED — FIX BEFORE SIGN-OFF ==="
```

---

## Output Deliverables

After Phase 6:

- [ ] @supabase/supabase-js removed from package.json
- [ ] Supabase abstraction implementations removed
- [ ] Edge Functions directory deleted
- [ ] RLS policies removed
- [ ] Sentry updated for VIL-only
- [ ] All E2E tests pass
- [ ] Load tests pass
- [ ] PWA updated

## NO ROLLBACK

**Phase 6 is final. No rollback possible.**

If critical issues found after Phase 6:

1. Emergency fix in VIL backend
2. Hotfix deployment
3. No return to Supabase

---

## Gate Criteria

- [ ] Zero Supabase imports in production code
- [ ] All E2E tests pass
- [ ] Load tests pass with p95 < 500ms
- [ ] PWA works offline
- [ ] All features verified working

## Final Sign-Off

| Criteria                   | Status |
| -------------------------- | ------ |
| Zero Supabase dependencies | [ ]    |
| All E2E tests pass         | [ ]    |
| Load tests pass            | [ ]    |
| PWA works                  | [ ]    |
| Documentation complete     | [ ]    |

**PROJECT COMPLETE**
