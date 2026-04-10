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

# Rebuild and deploy staging
pnpm build && rsync -avz dist/ staging:/var/www/edusync/

# Verify staging loads assets from S3
curl -sI "https://staging.edusync.dev" | grep -i "content-security-policy"
```

- Frontend tries S3 first
- Falls back to Supabase Storage on error
- Log fallback events

#### Step 2: Canary Testing

```bash
# Select 5% of users for S3-only via feature flag
export VITE_STORAGE_PRIMARY=s3
export VITE_STORAGE_FALLBACK=false

# Monitor canary error rate (check Sentry)
curl -s "https://sentry.io/api/0/projects/edusync/edusync-frontend/stats/" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[] | select(.name == "storage")'
```

- Monitor error rate
- If errors > 1%, disable S3-only mode
- Collect metrics

#### Step 3: Production Switch

```bash
# Update nginx to proxy S3 requests through CDN
# File: /etc/nginx/conf.d/edusync-storage.conf

cat > /tmp/edusync-storage.conf << 'NGINX'
upstream s3_backend {
    server cdn.edusync.dev:443;
}

server {
    listen 443 ssl;
    server_name storage.edusync.dev;

    location / {
        proxy_pass https://s3_backend;
        proxy_set_header Host cdn.edusync.dev;
        proxy_cache_valid 200 7d;
        add_header X-Storage-Backend "s3" always;
    }
}
NGINX

# Test nginx config before applying
sudo nginx -t && echo "PASS: nginx config valid" || echo "FAIL: nginx config broken"

# Apply
sudo cp /tmp/edusync-storage.conf /etc/nginx/conf.d/edusync-storage.conf
sudo nginx -s reload

# Deploy frontend with S3 as primary
VITE_STORAGE_PRIMARY=s3 pnpm build
rsync -avz dist/ production:/var/www/edusync/
```

- Deploy frontend with S3 as primary
- Monitor Sentry for errors
- Monitor dashboard metrics

#### Step 4: Monitor

```bash
# Watch S3 request metrics (1-hour window)
# Check nginx access logs for S3 backend
sudo tail -f /var/log/nginx/access.log | grep "X-Storage-Backend: s3" &

# Check error rate from logs
ERROR_COUNT=$(sudo grep -c "50[0-9]" /var/log/nginx/access.log)
TOTAL_COUNT=$(sudo wc -l < /var/log/nginx/access.log)
echo "Error rate: $(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_COUNT" | bc)%"

# Check Sentry for storage-related errors
curl -s "https://sentry.io/api/0/projects/edusync/edusync-frontend/issues/?query=storage" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq 'length'
```

- Error rate > 1%: Rollback immediately (see below)
- Error rate < 0.1%: Proceed
- Error rate 0.1-1%: Investigate before proceeding

#### Step 5: Disable Dual-Write

```bash
# Update storage provider config
# File: src/services/storage/vilStorageProvider.ts

# Set:
#   const DUAL_WRITE = false
#   const WRITE_TO_SUPABASE = false
#   const WRITE_TO_S3 = true

grep -n "DUAL_WRITE\|WRITE_TO_SUPABASE\|WRITE_TO_S3" src/services/storage/vilStorageProvider.ts
# Confirm values are correct before deploying

pnpm build && rsync -avz dist/ production:/var/www/edusync/
```

- Wait 24 hours after read switch
- Verify no pending writes
- Disable Supabase Storage

#### Step 6: Final Verification

```bash
#!/bin/bash
set -e

TOKEN=$(curl -s -X POST "https://api.edusync.dev/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.token')

# 1. Upload new file -> S3 only
echo "final-verify-$(date +%s)" > /tmp/final-test.txt
UPLOAD=$(curl -s -X POST "https://api.edusync.dev/api/v1/storage/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "bucket=avatars" \
  -F "file=@/tmp/final-test.txt")
echo "Upload result: $UPLOAD"

# 2. Load existing file -> should be S3 URL
URL=$(echo "$UPLOAD" | jq -r '.url')
echo "$URL" | grep -q "supabase" && echo "FAIL: URL still points to Supabase" || echo "PASS: URL points to S3"

# 3. Download and verify
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
[ "$HTTP_CODE" = "200" ] && echo "PASS: File downloadable" || echo "FAIL: Download returned $HTTP_CODE"

# 4. Verify Supabase Storage is NOT receiving writes
SUPA_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/storage/v1/object/avatars/final-test.txt")
[ "$SUPA_CHECK" = "404" ] && echo "PASS: Supabase not receiving writes" || echo "WARN: File found in Supabase (dual-write may still be on)"

rm /tmp/final-test.txt
echo "=== Final verification complete ==="
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

#### Step 1: Emergency Rollback (nginx config swap)

```bash
# OPTION A: Swap nginx config to route storage through Supabase (fastest, no deploy)
cat > /tmp/edusync-storage-rollback.conf << 'NGINX'
upstream supabase_storage {
    server YOUR_SUPABASE_PROJECT.supabase.co:443;
}

server {
    listen 443 ssl;
    server_name storage.edusync.dev;

    location / {
        proxy_pass https://supabase_storage;
        proxy_set_header Host YOUR_SUPABASE_PROJECT.supabase.co;
        add_header X-Storage-Backend "supabase" always;
    }
}
NGINX

sudo nginx -t && sudo cp /tmp/edusync-storage-rollback.conf /etc/nginx/conf.d/edusync-storage.conf && sudo nginx -s reload
echo "Rollback applied at $(date)"

# OPTION B: Feature flag (if using env-based switching)
# Update .env on production server:
ssh production "echo 'VITE_STORAGE_BACKEND=supabase' >> /var/www/edusync/.env"
# Rebuild is needed for Vite env vars — use Option A for instant rollback

# OPTION C: DNS-level redirect (if using separate storage subdomain)
# Set DNS TTL to 60s BEFORE cutover day:
# storage.edusync.dev -> CNAME to YOUR_SUPABASE_PROJECT.supabase.co
# TTL: 60 seconds (set this 24h before cutover)
```

**DNS TTL preparation (run 24 hours before cutover):**

```bash
# Lower TTL so DNS rollback is fast
# Using Cloudflare API as example:
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$STORAGE_RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl": 60}'

echo "DNS TTL lowered to 60s — rollback will propagate in ~1 minute"
```

**Verify rollback took effect:**

```bash
# Check which backend is serving storage
curl -sI "https://storage.edusync.dev/avatars/test.jpg" | grep "X-Storage-Backend"
# Should show: X-Storage-Backend: supabase

# Verify files load
curl -s -o /dev/null -w "%{http_code}" "https://storage.edusync.dev/avatars/test.jpg"
# Should show: 200
```

#### Step 2: Re-enable Dual-Write

```bash
# Re-enable writing to both storages
# Edit: src/services/storage/vilStorageProvider.ts
# Set:
#   const DUAL_WRITE = true
#   const WRITE_TO_SUPABASE = true
#   const WRITE_TO_S3 = true

# Deploy
pnpm build && rsync -avz dist/ production:/var/www/edusync/

# Verify dual-write is active
echo "dual-write-test-$(date +%s)" > /tmp/dw-test.txt
TOKEN=$(curl -s -X POST "https://api.edusync.dev/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.token')
curl -s -X POST "https://api.edusync.dev/api/v1/storage/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "bucket=avatars" -F "file=@/tmp/dw-test.txt"
echo "Check both Supabase and S3 for the uploaded file"
```

#### Step 3: Monitor After Rollback

```bash
# Watch error rate drop after rollback
for i in $(seq 1 12); do
  ERROR_COUNT=$(sudo grep -c "50[0-9]" /var/log/nginx/access.log)
  TOTAL_COUNT=$(sudo wc -l < /var/log/nginx/access.log)
  RATE=$(echo "scale=2; $ERROR_COUNT * 100 / $TOTAL_COUNT" | bc)
  echo "$(date +%H:%M) Error rate: ${RATE}%"
  sleep 300  # Check every 5 minutes for 1 hour
done
```

#### Step 4: Investigate Root Cause

```bash
# Check S3 access logs for errors
aws s3api get-bucket-logging --bucket avatars --endpoint-url "$S3_ENDPOINT"

# Check Sentry for storage errors
curl -s "https://sentry.io/api/0/projects/edusync/edusync-frontend/issues/?query=storage&sort=date" \
  -H "Authorization: Bearer $SENTRY_TOKEN" | jq '.[0:5] | .[] | {title, count, lastSeen}'

# Check nginx error logs
sudo tail -100 /var/log/nginx/error.log | grep -i "storage\|s3\|upstream"

# Document findings and plan fix
echo "Root cause: (fill in after investigation)" >> /tmp/storage-postmortem.md
echo "Fix plan: (fill in after investigation)" >> /tmp/storage-postmortem.md
echo "Retry date: (fill in after investigation)" >> /tmp/storage-postmortem.md
```

---

## Cutover Commands Reference

### Pre-Cutover Commands

```bash
# Verify dual-write status
curl -s https://api.edusync.dev/api/v1/storage/status | jq '.dual_write'
# Expected: true

# Check migration completeness
curl -s https://api.edusync.dev/api/v1/storage/migration-status | jq '.'
# Expected: {"total": N, "migrated": N, "pending": 0}

# Verify S3 health
curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live
# Expected: 200

# Lower DNS TTL (24h before)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records/$STORAGE_RECORD_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ttl": 60}'
```

### Cutover Commands

```bash
# Switch nginx to S3 backend
sudo cp /etc/nginx/conf.d/edusync-storage-s3.conf /etc/nginx/conf.d/edusync-storage.conf
sudo nginx -t && sudo nginx -s reload

# Deploy frontend with S3 primary
VITE_STORAGE_PRIMARY=s3 pnpm build
rsync -avz dist/ production:/var/www/edusync/
```

### Rollback Commands

```bash
# Emergency rollback (instant, no deploy needed)
sudo cp /etc/nginx/conf.d/edusync-storage-supabase.conf /etc/nginx/conf.d/edusync-storage.conf
sudo nginx -t && sudo nginx -s reload
echo "Rolled back to Supabase storage at $(date)"

# Re-enable dual-write (requires deploy)
# Edit vilStorageProvider.ts: DUAL_WRITE=true, WRITE_TO_SUPABASE=true
pnpm build && rsync -avz dist/ production:/var/www/edusync/
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
| 7   | DNS TTL lowered    | [ ]    |

After cutover:

| #   | Criteria             | Status |
| --- | -------------------- | ------ |
| 1   | Error rate < 0.1%    | [ ]    |
| 2   | All files accessible | [ ]    |
| 3   | No user reports      | [ ]    |
| 4   | 24 hours stable      | [ ]    |
