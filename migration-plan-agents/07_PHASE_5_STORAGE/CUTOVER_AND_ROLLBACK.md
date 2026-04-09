# Phase 5 Storage Cutover and Rollback

**EduSync LMS — Supabase to VIL Backend Migration**

---

## Cutover Procedures

### Pre-Cutover Checklist

- [ ] Dual-write verified for 7+ days
- [ ] Background migration 100% complete
- [ ] Sample file checksums verified
- [ ] S3 CDN warming complete
- [ ] CSP updated for S3 domains
- [ ] Rollback procedure tested

### Cutover Timeline

| Step | Action                        | Duration | Risk   |
| ---- | ----------------------------- | -------- | ------ |
| 1    | Enable dual-read in staging   | 1 hour   | Low    |
| 2    | Test with canary users        | 2 hours  | Low    |
| 3    | Switch production reads to S3 | 15 min   | Medium |
| 4    | Monitor error rates           | 1 hour   | Medium |
| 5    | Disable dual-write            | 1 hour   | High   |
| 6    | Final verification            | 2 hours  | Medium |

### Step-by-Step Cutover

#### Step 1: Enable Dual-Read (Staging)

```bash
# In staging environment
export VITE_STORAGE_DUAL_READ=true
export VITE_STORAGE_PRIMARY=s3
export VITE_STORAGE_SECONDARY=supabase
```

- Frontend tries S3 first
- Falls back to Supabase Storage on error
- Log fallback events

#### Step 2: Canary Testing

```bash
# Select 5% of users for S3-only
export VITE_STORAGE_PRIMARY=s3
export VITE_STORAGE_FALLBACK=false
```

- Monitor error rate
- If errors > 1%, disable S3-only mode
- Collect metrics

#### Step 3: Production Switch

```bash
# Update frontend config
# File: src/services/storage/vilStorageProvider.ts

// Change from:
const STORAGE_PRIMARY = 'supabase'

// To:
const STORAGE_PRIMARY = 's3'
```

- Deploy frontend with S3 as primary
- Monitor Sentry for errors
- Monitor dashboard metrics

#### Step 4: Monitor

```bash
# Watch metrics
- S3 request latency
- S3 error rate
- Fallback triggered count
- User reports
```

- Error rate > 1%: Rollback immediately
- Error rate < 0.1%: Proceed
- Error rate 0.1-1%: Investigate before proceeding

#### Step 5: Disable Dual-Write

```bash
# Update storage provider
// Disable Supabase Storage writes

const DUAL_WRITE = false
const WRITE_TO_SUPABASE = false
const WRITE_TO_S3 = true
```

- Wait 24 hours after read switch
- Verify no pending writes
- Disable Supabase Storage

#### Step 6: Final Verification

```bash
# Full verification
1. Upload new file → S3 only
2. Load existing file → S3 URL
3. Delete file → S3 only
4. Check both storages → S3 only
```

---

## Rollback Procedures

### Trigger Conditions

Rollback if:

- S3 error rate > 5%
- Files missing in S3
- URL rewriting bugs causing 404s
- CDN caching issues
- User reports widespread issues

### Rollback Timeline

| Step | Action                   | Duration |
| ---- | ------------------------ | -------- |
| 1    | Switch reads to Supabase | 5 min    |
| 2    | Re-enable dual-write     | 5 min    |
| 3    | Monitor                  | 1 hour   |
| 4    | Investigate              | 2+ hours |

### Step-by-Step Rollback

#### Step 1: Emergency Rollback

```bash
# Immediate rollback command
# In production environment

# Option A: Use feature flag
export VITE_STORAGE_BACKEND=supabase

# Option B: Revert code
# Edit: src/services/storage/vilStorageProvider.ts
const STORAGE_PRIMARY = 'supabase'
```

- Fastest rollback path
- No code deployment needed if using env var

#### Step 2: Re-enable Dual-Write

```bash
# Re-enable writing to both storages

# File: src/services/storage/vilStorageProvider.ts
const DUAL_WRITE = true
const WRITE_TO_SUPABASE = true
const WRITE_TO_S3 = true
```

- New uploads go to both
- Allows S3 fix while maintaining Supabase backup

#### Step 3: Monitor

```bash
# Watch metrics after rollback
- Supabase Storage request rate
- S3 request rate (should drop)
- Error rate (should drop to 0)
- User reports (should stop)
```

#### Step 4: Investigate

```bash
# Post-mortem
1. Check S3 access logs
2. Check Sentry errors
3. Check network requests
4. Identify root cause
```

- Document findings
- Plan fix
- Schedule retry

---

## Emergency Contacts

| Role             | Contact | Phone |
| ---------------- | ------- | ----- |
| On-Call Engineer |         |       |
| DevOps Lead      |         |       |
| Tech Lead        |         |       |
| Product Owner    |         |       |

---

## Cutover Commands Reference

### Pre-Cutover Commands

```bash
# Verify dual-write
curl -X GET https://api.edusync.dev/storage/verify-dual-write

# Check migration status
curl -X GET https://api.edusync.dev/storage/migration-status

# Verify S3 health
curl -X GET https://s3.edusync.dev/health
```

### Cutover Commands

```bash
# Enable dual-read
curl -X POST https://api.edusync.dev/storage/enable-dual-read

# Switch to S3 primary
curl -X POST https://api.edusync.dev/storage/switch-primary?backend=s3

# Disable dual-write
curl -X POST https://api.edusync.dev/storage/disable-dual-write
```

### Rollback Commands

```bash
# Emergency rollback
curl -X POST https://api.edusync.dev/storage/switch-primary?backend=supabase

# Re-enable dual-write
curl -X POST https://api.edusync.dev/storage/enable-dual-write
```

---

## Monitoring Dashboards

### Production Dashboards

1. **S3 Metrics**: Request rate, latency, errors
2. **Supabase Storage Metrics**: Request rate, latency, errors
3. **Fallback Rate**: How often Supabase is used as fallback
4. **User Reports**: Error tracking from Sentry

### Alert Thresholds

| Metric        | Warning | Critical |
| ------------- | ------- | -------- |
| S3 Error Rate | > 1%    | > 5%     |
| S3 Latency    | > 500ms | > 2s     |
| Fallback Rate | > 5%    | > 20%    |
| User Reports  | > 5     | > 20     |

---

## Sign-Off Checklist

Before cutover:

| #   | Criteria           | Status |
| --- | ------------------ | ------ |
| 1   | Dual-write 7+ days | [ ]    |
| 2   | Migration 100%     | [ ]    |
| 3   | Checksums verified | [ ]    |
| 4   | CSP updated        | [ ]    |
| 5   | Rollback tested    | [ ]    |
| 6   | Team on-call       | [ ]    |

After cutover:

| #   | Criteria             | Status |
| --- | -------------------- | ------ |
| 1   | Error rate < 0.1%    | [ ]    |
| 2   | All files accessible | [ ]    |
| 3   | No user reports      | [ ]    |
| 4   | 24 hours stable      | [ ]    |
