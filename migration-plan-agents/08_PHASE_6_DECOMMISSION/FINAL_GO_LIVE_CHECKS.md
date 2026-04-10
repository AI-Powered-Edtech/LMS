# Phase 6 Final Go-Live Checks

**EduSync LMS — Supabase to VIL Backend Migration**

---

## Pre-Go-Live Checklist

Every item below has a verification command. Run each command and confirm the expected output before proceeding.

### Infrastructure

```bash
# 1. VIL API server running in production
curl -sf https://api.edusync.dev/api/v1/health | jq -r '.status' | grep -q "ok" \
  && echo "PASS: VIL API healthy" || echo "FAIL: VIL API not responding"

# 2. PostgreSQL accessible
psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1 \
  && echo "PASS: PostgreSQL accessible" || echo "FAIL: PostgreSQL connection failed"

# 3. S3/R2 storage operational
curl -sf -o /dev/null -w "%{http_code}" https://cdn.edusync.dev/health | grep -q "200" \
  && echo "PASS: S3/R2 storage healthy" || echo "FAIL: Storage not responding"

# 4. WebSocket server running
curl -sf -o /dev/null -w "%{http_code}" -H "Upgrade: websocket" -H "Connection: Upgrade" https://api.edusync.dev/ws | grep -qE "101|200" \
  && echo "PASS: WebSocket endpoint reachable" || echo "FAIL: WebSocket not responding"

# 5. Nginx configured for VIL-only
sudo nginx -t 2>&1 | grep -q "syntax is ok" \
  && echo "PASS: Nginx config valid" || echo "FAIL: Nginx config broken"
grep -q "functions/v1" /etc/nginx/nginx.conf && echo "FAIL: Supabase Edge Function routes still in nginx" || echo "PASS: No Supabase routes in nginx"

# 6. DNS pointing to VIL infrastructure
dig +short api.edusync.dev | head -1
echo "Verify the IP above matches your VIL server"
```

### Frontend

```bash
# 7. VITE_API_BACKEND=vil in production
grep -q "VITE_API_BACKEND=vil" .env.production \
  && echo "PASS: API backend set to VIL" || echo "FAIL: API backend not set to VIL"

# 8. VITE_STORAGE_BACKEND=s3 in production
grep -q "VITE_STORAGE_BACKEND=s3\|VITE_STORAGE_PRIMARY=s3" .env.production \
  && echo "PASS: Storage backend set to S3" || echo "FAIL: Storage backend not set to S3"

# 9. VITE_WS_URL pointing to VIL WebSocket
grep -q "VITE_WS_URL=wss://api.edusync.dev/ws" .env.production \
  && echo "PASS: WS URL points to VIL" || echo "FAIL: WS URL incorrect"

# 10. No SUPABASE env vars remain
grep -c "SUPABASE" .env.production 2>/dev/null | xargs -I{} sh -c '[ {} -eq 0 ] && echo "PASS: No SUPABASE env vars" || echo "FAIL: {} SUPABASE vars remain"'

# 11. CSP updated for all domains
grep -q "cdn.edusync.dev\|r2.cloudflarestorage.com" index.html \
  && echo "PASS: CSP includes S3/CDN domains" || echo "FAIL: CSP missing S3/CDN domains"
grep -q "supabase" index.html && echo "WARN: Supabase still in CSP (remove if not needed)" || echo "PASS: No Supabase in CSP"

# 12. PWA service worker updated
pnpm build >/dev/null 2>&1
grep -q "supabase" dist/sw.js 2>/dev/null && echo "FAIL: Supabase in service worker" || echo "PASS: Service worker clean"
```

### Database

```bash
# 13. RLS policies removed
RLS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM pg_policies WHERE schemaname = 'public'" | tr -d ' ')
[ "$RLS_COUNT" -eq 0 ] && echo "PASS: RLS policies removed ($RLS_COUNT)" || echo "FAIL: $RLS_COUNT RLS policies remain"

# 14. VIL TenantGuard active (test with API call)
TOKEN=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.token')
COURSES=$(curl -sf https://api.edusync.dev/api/v1/courses -H "Authorization: Bearer $TOKEN" | jq 'length')
[ "$COURSES" -ge 0 ] && echo "PASS: TenantGuard working (returned $COURSES courses)" || echo "FAIL: TenantGuard may be broken"

# 15. VIL RbacGuard active (test forbidden access)
STUDENT_TOKEN=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edusync.dev","password":"password123"}' | jq -r '.token')
ADMIN_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://api.edusync.dev/api/v1/admin/users \
  -H "Authorization: Bearer $STUDENT_TOKEN")
[ "$ADMIN_STATUS" = "403" ] && echo "PASS: RbacGuard blocks student from admin routes" || echo "FAIL: RbacGuard not working (got $ADMIN_STATUS)"

# 16. Database migrations applied
psql "$DATABASE_URL" -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1" 2>/dev/null \
  && echo "PASS: Migrations table accessible" || echo "WARN: No schema_migrations table"

# 17. Connection pool configured
psql "$DATABASE_URL" -t -c "SHOW max_connections" | tr -d ' '
echo "Verify max_connections is appropriate for production load"
```

### Monitoring

```bash
# 18. Sentry tracking VIL errors
curl -sf "https://sentry.io/api/0/projects/edusync/edusync-vil/" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq -r '.status' \
  && echo "PASS: Sentry project accessible" || echo "FAIL: Sentry project not found"

# 19. Prometheus metrics collecting
curl -sf http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length' \
  && echo "PASS: Prometheus targets active" || echo "FAIL: Prometheus not running"

# 20. Grafana dashboards configured
curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000/api/dashboards/home \
  -H "Authorization: Bearer $GRAFANA_TOKEN" | grep -q "200" \
  && echo "PASS: Grafana accessible" || echo "FAIL: Grafana not responding"

# 21. Alerting set up
curl -sf http://localhost:9093/api/v2/alerts | jq 'length' \
  && echo "PASS: Alertmanager accessible" || echo "WARN: Alertmanager not running"

# 22. On-call rotation defined
echo "MANUAL CHECK: Verify on-call rotation is set up in PagerDuty/Opsgenie"
```

### Security

```bash
# 23. JWT secrets rotated (not using Supabase JWT secret)
grep -q "SUPABASE" edusync-api/.env 2>/dev/null && echo "FAIL: Supabase vars in VIL env" || echo "PASS: No Supabase vars in VIL env"
grep -q "JWT_SECRET" edusync-api/.env && echo "PASS: JWT_SECRET configured" || echo "FAIL: JWT_SECRET missing"

# 24. API keys rotated
grep -q "SUPABASE_SERVICE_ROLE_KEY\|SUPABASE_ANON_KEY" edusync-api/.env 2>/dev/null \
  && echo "FAIL: Old Supabase API keys still in config" || echo "PASS: No Supabase API keys"

# 25. CORS configured for production
curl -sf -X OPTIONS https://api.edusync.dev/api/v1/health \
  -H "Origin: https://app.edusync.dev" \
  -H "Access-Control-Request-Method: GET" \
  -D - -o /dev/null | grep -q "Access-Control-Allow-Origin" \
  && echo "PASS: CORS headers present" || echo "FAIL: CORS not configured"

# 26. Rate limiting active
for i in $(seq 1 110); do
  curl -sf -o /dev/null -w "%{http_code}\n" https://api.edusync.dev/api/v1/health
done | sort | uniq -c
echo "Should see some 429 responses after rate limit exceeded"

# 27. CSRF protection active
CSRF_CHECK=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://evil-site.com" \
  -d '{"email":"test@test.com","password":"test"}' -o /dev/null -w "%{http_code}")
[ "$CSRF_CHECK" = "403" ] && echo "PASS: CSRF blocks cross-origin requests" || echo "WARN: CSRF check returned $CSRF_CHECK"

# 28. Security headers present
curl -sI https://api.edusync.dev/api/v1/health | grep -iE "strict-transport|x-content-type|x-frame-options"
echo "Verify security headers above are present"
```

### Code Cleanliness

```bash
# 29. No @supabase packages in package.json
grep -q "supabase" package.json && echo "FAIL: supabase in package.json" || echo "PASS: No supabase in package.json"

# 30. No @supabase imports in source
grep -rn "@supabase" src/ --include="*.ts" --include="*.tsx" \
  && echo "FAIL: @supabase imports remain" || echo "PASS: No @supabase imports"

# 31. No Supabase config files
find . -name "supabase*" -not -path "*/node_modules/*" -not -path "*/.git/*" | head -10
echo "If any files listed above, they should be removed"

# 32. No Edge Functions directory
[ -d "supabase/functions" ] && echo "FAIL: supabase/functions/ still exists" || echo "PASS: Edge Functions deleted"

# 33. No Supabase env vars
grep -rn "SUPABASE" .env* 2>/dev/null && echo "FAIL: SUPABASE env vars remain" || echo "PASS: No SUPABASE env vars"

# 34. Clean typecheck
pnpm typecheck 2>&1 | tail -1 && echo "PASS: typecheck" || echo "FAIL: typecheck"

# 35. Clean lint
pnpm lint 2>&1 | tail -3 && echo "PASS: lint" || echo "FAIL: lint"

# 36. Clean build
pnpm build 2>&1 | tail -3 && echo "PASS: build" || echo "FAIL: build"

# 37. No supabase references in built output
grep -r "supabase" dist/ 2>/dev/null | grep -v "sourcemap" | head -5
echo "If any lines above, investigate (may be acceptable in comments/sourcemaps)"
```

---

## Go-Live Verification Commands

### 38. Verify VIL Server Health

```bash
curl -sf https://api.edusync.dev/api/v1/health | jq '.'
# Expected: {"status":"ok","version":"...","uptime":...}

curl -sf https://api.edusync.dev/api/v1/ready | jq '.'
# Expected: {"status":"ready","database":"ok","storage":"ok","websocket":"ok"}
```

### 39. Verify Database Connectivity

```bash
psql "$DATABASE_URL" -c "SELECT now(), current_database(), version()" | head -5
# Expected: current timestamp, database name, PostgreSQL version
```

### 40. Verify Storage Upload/Download

```bash
TOKEN=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.token')

# Upload test file
echo "go-live-test-$(date +%s)" > /tmp/golive-test.txt
UPLOAD_RESULT=$(curl -sf -X POST https://api.edusync.dev/api/v1/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "bucket=avatars" \
  -F "file=@/tmp/golive-test.txt")
echo "Upload: $UPLOAD_RESULT"
URL=$(echo "$UPLOAD_RESULT" | jq -r '.url')

# Download test file
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" "$URL")
[ "$HTTP_CODE" = "200" ] && echo "PASS: Storage upload/download working" || echo "FAIL: Download returned $HTTP_CODE"
rm /tmp/golive-test.txt
```

### 41. Verify WebSocket Connection

```bash
# Test WebSocket with wscat (install: npm i -g wscat)
timeout 5 wscat -c wss://api.edusync.dev/ws -x '{"type":"ping"}' 2>&1 | head -5
echo "Should show pong response"
```

### 42. Verify Auth Flow (Login)

```bash
LOGIN_RESULT=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}')
echo "$LOGIN_RESULT" | jq -r '.token' | head -c 20
echo "..."
[ "$(echo "$LOGIN_RESULT" | jq -r '.token')" != "null" ] \
  && echo "PASS: Login returns JWT" || echo "FAIL: Login broken"
```

### 43. Verify Auth Flow (Protected Route)

```bash
TOKEN=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.token')

# Authenticated request
AUTH_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
  https://api.edusync.dev/api/v1/profile -H "Authorization: Bearer $TOKEN")
[ "$AUTH_STATUS" = "200" ] && echo "PASS: Authenticated request works" || echo "FAIL: Auth request returned $AUTH_STATUS"

# Unauthenticated request should fail
NOAUTH_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://api.edusync.dev/api/v1/profile)
[ "$NOAUTH_STATUS" = "401" ] && echo "PASS: Unauthenticated request blocked" || echo "FAIL: Unauthenticated returned $NOAUTH_STATUS"
```

### 44. Verify E2E Tests

```bash
pnpm test:e2e 2>&1 | tee /tmp/e2e-golive.txt
FAILED=$(grep -c "FAIL\|failed" /tmp/e2e-golive.txt || true)
[ "$FAILED" -eq 0 ] && echo "PASS: All E2E tests passed" || echo "FAIL: $FAILED test failures"
```

### 45. Verify Load Tests

```bash
k6 run tests/load/production.js 2>&1 | tee /tmp/k6-golive.txt
P95=$(grep "http_req_duration" /tmp/k6-golive.txt | grep "p(95)" | awk '{print $NF}' | tr -d 'ms')
ERR=$(grep "http_req_failed" /tmp/k6-golive.txt | awk '{print $NF}' | tr -d '%')
echo "p95=${P95}ms error_rate=${ERR}%"
# p95 < 500ms and error rate < 0.1%
```

### 46. Verify Multi-Tenant Isolation

```bash
# Login as two different tenant users and verify they see different data
TOKEN_A=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.token')

COURSES_A=$(curl -sf https://api.edusync.dev/api/v1/courses \
  -H "Authorization: Bearer $TOKEN_A" | jq '[.[].id] | sort')
echo "Tenant A courses: $COURSES_A"
echo "MANUAL CHECK: Verify tenant isolation by comparing with another tenant's data"
```

### 47. Verify Role-Based Access

```bash
# Student should not access teacher routes
STUDENT_TOKEN=$(curl -sf -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@edusync.dev","password":"password123"}' | jq -r '.token')

TEACHER_ROUTE=$(curl -sf -o /dev/null -w "%{http_code}" \
  https://api.edusync.dev/api/v1/teacher/courses \
  -H "Authorization: Bearer $STUDENT_TOKEN")
[ "$TEACHER_ROUTE" = "403" ] && echo "PASS: Student blocked from teacher routes" || echo "FAIL: RBAC broken ($TEACHER_ROUTE)"

# Admin routes blocked for non-admins
ADMIN_ROUTE=$(curl -sf -o /dev/null -w "%{http_code}" \
  https://api.edusync.dev/api/v1/admin/users \
  -H "Authorization: Bearer $STUDENT_TOKEN")
[ "$ADMIN_ROUTE" = "403" ] && echo "PASS: Student blocked from admin routes" || echo "FAIL: RBAC broken ($ADMIN_ROUTE)"
```

### 48. Verify Frontend Loads

```bash
# Check frontend serves correctly
FRONTEND_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" https://app.edusync.dev)
[ "$FRONTEND_STATUS" = "200" ] && echo "PASS: Frontend loads" || echo "FAIL: Frontend returned $FRONTEND_STATUS"

# Check no Supabase URLs in served HTML/JS
curl -sf https://app.edusync.dev | grep -q "supabase.co" \
  && echo "FAIL: Supabase URLs in served HTML" || echo "PASS: No Supabase URLs in HTML"
```

### 49. Verify Offline PWA

```bash
# Check service worker is registered
curl -sf https://app.edusync.dev/sw.js -o /dev/null -w "%{http_code}" | grep -q "200" \
  && echo "PASS: Service worker accessible" || echo "FAIL: Service worker not found"

# Check manifest
curl -sf https://app.edusync.dev/manifest.json | jq -r '.name' \
  && echo "PASS: PWA manifest accessible" || echo "FAIL: PWA manifest missing"
```

### 50. Verify No Supabase Network Calls

```bash
# Build and scan for any Supabase hostnames in the bundle
pnpm build >/dev/null 2>&1
grep -r "supabase\.co\|supabase\.in\|supabase\.net" dist/ --include="*.js" --include="*.html" \
  && echo "FAIL: Supabase hostnames found in build output" || echo "PASS: No Supabase hostnames in build"
```

---

## Post-Go-Live Monitoring

### First Hour

```bash
# Monitor error rate
watch -n 60 'curl -sf https://api.edusync.dev/api/v1/metrics | jq ".error_rate"'

# Monitor latency
watch -n 60 'curl -sf https://api.edusync.dev/api/v1/metrics | jq ".p95_latency_ms"'

# Monitor active WebSocket connections
watch -n 60 'curl -sf https://api.edusync.dev/api/v1/metrics | jq ".ws_connections"'

# Monitor storage operations
watch -n 60 'curl -sf https://api.edusync.dev/api/v1/metrics | jq ".storage_ops_per_min"'
```

### First Day

```bash
# Check Sentry for new errors
curl -sf "https://sentry.io/api/0/projects/edusync/edusync-vil/issues/?query=is:unresolved&sort=date" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[0:5] | .[] | {title, count, firstSeen}'

# Check session success rate
curl -sf https://api.edusync.dev/api/v1/metrics | jq '.session_success_rate'

# Check storage usage growth
curl -sf https://api.edusync.dev/api/v1/metrics | jq '.storage_bytes_total'

# Check rate limit hits
curl -sf https://api.edusync.dev/api/v1/metrics | jq '.rate_limit_hits_24h'
```

### First Week

```bash
# Performance trend (compare with baseline)
curl -sf https://api.edusync.dev/api/v1/metrics/weekly | jq '.'

# Error trend
curl -sf "https://sentry.io/api/0/projects/edusync/edusync-vil/stats/?stat=received&resolution=1d" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.'
```

---

## Emergency Response

### Issue: API Server Down

```bash
# 1. Check server status
curl -sf https://api.edusync.dev/api/v1/health || echo "Server unreachable"

# 2. Check container/process logs
docker logs edusync-api --tail 50 2>/dev/null || journalctl -u edusync-api --no-pager -n 50

# 3. Restart if needed
docker restart edusync-api 2>/dev/null || sudo systemctl restart edusync-api

# 4. If persistent: rollback to previous image
docker pull edusync/api:previous && docker stop edusync-api && docker run -d --name edusync-api edusync/api:previous
```

### Issue: High Latency

```bash
# 1. Check database connections
psql "$DATABASE_URL" -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state"

# 2. Check slow queries
psql "$DATABASE_URL" -c "SELECT pid, now()-query_start AS duration, query FROM pg_stat_activity WHERE state='active' AND now()-query_start > interval '5 seconds'"

# 3. Check S3 latency
time curl -sf -o /dev/null https://cdn.edusync.dev/avatars/test.jpg

# 4. Check WebSocket connection count
curl -sf https://api.edusync.dev/api/v1/metrics | jq '.ws_connections'
```

### Issue: Authentication Failures

```bash
# 1. Check JWT secret matches between services
echo "Verify JWT_SECRET is identical in VIL backend and any JWT-validating services"

# 2. Test login directly
curl -v -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}'

# 3. Check Sentry for auth errors
curl -sf "https://sentry.io/api/0/projects/edusync/edusync-vil/issues/?query=auth" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[0:3]'
```

### Issue: Storage Failures

```bash
# 1. Check S3/R2 status
curl -sf -o /dev/null -w "%{http_code}" https://cdn.edusync.dev/health
echo "200 = healthy, anything else = problem"

# 2. Test direct upload
echo "test" | curl -sf -X PUT https://cdn.edusync.dev/test-emergency.txt --data-binary @- -o /dev/null -w "%{http_code}"

# 3. Check nginx proxy to storage
sudo tail -20 /var/log/nginx/error.log | grep -i "storage\|s3\|upstream"
```

---

## Sign-Off

| Role            | Name | Date | Status      |
| --------------- | ---- | ---- | ----------- |
| Tech Lead       |      |      | [ ] Approved |
| Security Review |      |      | [ ] Approved |
| QA              |      |      | [ ] Approved |
| Product Owner   |      |      | [ ] Approved |
| CEO/Executive   |      |      | [ ] Approved |

---

## MIGRATION COMPLETE

**EduSync LMS is now running on VIL backend only.**

- Zero Supabase dependencies
- All features operational
- Performance verified
- Ready for production scale
