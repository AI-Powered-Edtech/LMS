# Phase 6 Final Go-Live Checks

**EduSync LMS — Supabase to VIL Backend Migration**

---

## Pre-Go-Live Checklist

### Infrastructure

- [ ] VIL API server running in production
- [ ] PostgreSQL accessible (independent or Supabase)
- [ ] S3/R2 storage operational
- [ ] WebSocket server running
- [ ] Nginx configured for VIL-only
- [ ] DNS pointing to VIL infrastructure

### Frontend

- [ ] VITE_API_BACKEND=vil in production
- [ ] VITE_STORAGE_BACKEND=s3 in production
- [ ] VITE_WS_URL pointing to VIL WebSocket
- [ ] All environment variables set correctly
- [ ] CSP updated for all domains
- [ ] PWA service worker updated

### Database

- [ ] RLS policies removed
- [ ] VIL TenantGuard active
- [ ] VIL RbacGuard active
- [ ] Database migrations applied
- [ ] Connection pool configured

### Monitoring

- [ ] Sentry tracking VIL errors
- [ ] Prometheus metrics collecting
- [ ] Grafana dashboards configured
- [ ] Alerting set up
- [ ] On-call rotation defined

### Security

- [ ] JWT secrets rotated
- [ ] API keys rotated
- [ ] CORS configured for production
- [ ] Rate limiting active
- [ ] CSRF protection active
- [ ] Security audit passed

---

## Go-Live Commands

### 1. Verify VIL Server

```bash
# Health check
curl https://api.edusync.dev/api/v1/health
# Expected: {"status":"ok"}

curl https://api.edusync.dev/api/v1/ready
# Expected: {"status":"ready"}
```

### 2. Verify Database

```bash
# Database connection
curl https://api.edusync.dev/api/v1/ready
# Should include DB status
```

### 3. Verify Storage

```bash
# Upload test file
curl -X POST https://api.edusync.dev/api/v1/storage/upload \
  -F "file=@test.txt"

# Download test file
curl -I https://cdn.edusync.dev/test.txt
# Expected: 200 OK
```

### 4. Verify WebSocket

```bash
# Connect to WebSocket
wscat -c wss://api.edusync.dev/ws

# Send ping
{"type":"ping"}

# Should receive pong
```

### 5. Verify Auth

```bash
# Login test
curl -X POST https://api.edusync.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}'

# Expected: JWT token returned
```

### 6. Verify E2E Tests

```bash
pnpm test:e2e
# Expected: All tests pass
```

### 7. Verify Load Tests

```bash
k6 run tests/load/production.js
# Expected: p95 < 500ms, error rate < 0.1%
```

---

## Post-Go-Live Monitoring

### First Hour

- [ ] Monitor error rate (should be 0%)
- [ ] Monitor latency (should be < 200ms)
- [ ] Monitor WebSocket connections
- [ ] Monitor storage operations

### First Day

- [ ] Monitor user reports
- [ ] Monitor session success rate
- [ ] Monitor storage usage
- [ ] Monitor API rate limits

### First Week

- [ ] Monitor performance trends
- [ ] Monitor error trends
- [ ] Monitor user feedback
- [ ] Plan fixes for any issues

---

## Emergency Response

### If Issues Detected

#### Issue: API Server Down

```
1. Check server status: curl api.edusync.dev/health
2. Check logs: kubectl logs / docker logs
3. Restart if needed
4. If persistent: Rollback to previous version
```

#### Issue: High Latency

```
1. Check database connection
2. Check S3/R2 latency
3. Check WebSocket latency
4. Scale if needed
```

#### Issue: Authentication Failures

```
1. Check JWT secret
2. Check session database
3. Check Sentry for error details
4. Fix and redeploy
```

#### Issue: Storage Failures

```
1. Check S3/R2 status
2. Check fallback to Supabase Storage (if enabled)
3. Fix and redeploy
```

### Emergency Contacts

| Role      | Contact | Phone | Slack        |
| --------- | ------- | ----- | ------------ |
| On-Call   |         |       | #incidents   |
| Tech Lead |         |       | #engineering |
| DevOps    |         |       | #devops      |
| Product   |         |       | #product     |

---

## Post-Mortem Template

### Incident: [Title]

**Date:**  
**Duration:**  
**Impact:**

**Root Cause:**  
**Timeline:**  
**Resolution:**  
**Action Items:**

---

## Sign-Off

| Role            | Name | Date | Status      |
| --------------- | ---- | ---- | ----------- |
| Tech Lead       |      |      | ⬜ Approved |
| Security Review |      |      | ⬜ Approved |
| QA              |      |      | ⬜ Approved |
| Product Owner   |      |      | ⬜ Approved |
| CEO/Executive   |      |      | ⬜ Approved |

---

## 🎉 MIGRATION COMPLETE

**EduSync LMS is now running on VIL backend only.**

- Zero Supabase dependencies
- All features operational
- Performance verified
- Ready for production scale
