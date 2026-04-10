# TASK QUEUE — Phase 5: Storage Migration

**Weeks 61-66 | ~80 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — pakai `pnpm`
3. Jalankan verify commands setelah setiap task
4. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
5. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di synthesized plan
6. Jika ketemu coupling tak terduga → **BLOCKED**, bukan improvisasi
7. **Rollback rule:** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 5X-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>`

## Effort Estimate

| Wave | Tasks                 | Jam   | Parallelism |
| ---- | --------------------- | ----- | ----------- |
| 5A   | Deploy Object Storage | 15-20 | Serial      |
| 5B   | Dual-Write Period     | 20-25 | Serial      |
| 5C   | Background Migration  | 25-30 | Parallel    |
| 5D   | Cutover               | 10-15 | Serial      |

## Dependency Map

```
5A-0: Storage Planning (BLOCKING)
  │
  └── 5A-1: Deploy MinIO/S3/R2
        │
        ├── 5A-2: Configure vil_storage_s3
        │
        └── 5A-3: CSP update for S3 domains
              │
              └── 5B-0: Dual-Write Period
                    │
                    ├── 5B-1: Enable dual-write
                    │
                    └── 5B-2: Verify dual-write
                          │
                          └── 5C-0: Background Migration
                                │
                                ├── 5C-1: Copy existing files
                                │
                                └── 5C-2: Verify migration
                                      │
                                      └── 5D-0: Cutover
                                            │
                                            ├── 5D-1: Switch reads to S3
                                            │
                                            └── 5D-2: URL rewriting
```

## Tasks

### 5A: Deploy Object Storage

#### Task 5A-0: Storage Planning

```
TASK ID:       5A-0
OWNER TYPE:    Backend Agent
GOAL:          Document storage requirements and migration plan
EDIT ONLY:     docs/STORAGE_ARCHITECTURE.md (new)
DEPENDENCY:    Phase 4 complete
```

**Steps:**

1. List all Supabase Storage buckets:

```bash
# List all buckets from Supabase
curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/storage/v1/bucket" | jq '.[].name'
```

2. Document file types per bucket:

```bash
# Count files per bucket
for BUCKET in avatars course-assets scorm-packages certificates; do
  COUNT=$(curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -d '{"prefix":"","limit":10000}' \
    "$SUPABASE_URL/storage/v1/object/list/$BUCKET" | jq 'length')
  echo "$BUCKET: $COUNT files"
done
```

3. Identify access patterns (public/private)
4. Plan S3 bucket structure
5. Calculate migration volume

**Verify:**

```bash
wc -l docs/STORAGE_ARCHITECTURE.md | awk '{if ($1 > 40) print "PASS: "$1" lines"; else print "FAIL: only "$1" lines"}'
```

---

#### Task 5A-1: Deploy MinIO/S3/R2

```
TASK ID:       5A-1
OWNER TYPE:    DevOps Agent
GOAL:          Deploy object storage solution
EDIT ONLY:     infrastructure/ (new directory)
DEPENDENCY:    5A-0
```

**Options:**

- **Production:** Cloudflare R2 (no egress fees)
- **Staging:** Self-hosted MinIO
- **Local:** MinIO in Docker Compose

**Local MinIO Docker Compose** — create `infrastructure/docker-compose.storage.yml`:

```yaml
services:
  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes: ["minio-data:/data"]
volumes:
  minio-data:
```

**Start and verify:**

```bash
cd infrastructure && docker compose -f docker-compose.storage.yml up -d

# Wait for MinIO to start
sleep 5

# Create buckets
docker run --rm --net=host \
  minio/mc alias set local http://localhost:9000 minioadmin minioadmin && \
  minio/mc mb local/avatars local/course-assets local/scorm-packages local/certificates

# Upload test file
echo "storage-test" > /tmp/test-upload.txt
docker run --rm --net=host -v /tmp/test-upload.txt:/tmp/test-upload.txt \
  minio/mc cp /tmp/test-upload.txt local/avatars/test-upload.txt

# Download and verify
docker run --rm --net=host \
  minio/mc cat local/avatars/test-upload.txt | grep "storage-test" \
  && echo "PASS: upload/download works" || echo "FAIL: upload/download broken"
```

**Verify:**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:9000/minio/health/live | grep -q 200 \
  && echo "PASS: MinIO healthy" || echo "FAIL: MinIO not responding"
```

---

#### Task 5A-2: Configure vil_storage_s3

```
TASK ID:       5A-2
OWNER TYPE:    Rust CLI Agent
GOAL:          Integrate S3 storage with VIL
EDIT ONLY:     edusync-api/crates/api-server/src/storage.rs (new)
DEPENDENCY:    5A-1
```

**Creates `edusync-api/crates/api-server/src/storage.rs`:**

```rust
use aws_sdk_s3::{Client, Config, config::Credentials};
use aws_sdk_s3::primitives::ByteStream;
use std::path::Path;

pub async fn create_s3_client() -> Client {
    let creds = Credentials::new("minioadmin", "minioadmin", None, None, "static");
    let config = Config::builder()
        .endpoint_url("http://localhost:9000")
        .credentials_provider(creds)
        .region(aws_sdk_s3::config::Region::new("us-east-1"))
        .force_path_style(true)
        .build();
    Client::from_conf(config)
}

pub async fn upload_file(
    client: &Client,
    bucket: &str,
    key: &str,
    body: Vec<u8>,
    content_type: &str,
) -> Result<String, aws_sdk_s3::Error> {
    client
        .put_object()
        .bucket(bucket)
        .key(key)
        .body(ByteStream::from(body))
        .content_type(content_type)
        .send()
        .await?;
    Ok(format!("{}/{}/{}", "http://localhost:9000", bucket, key))
}

pub async fn download_file(
    client: &Client,
    bucket: &str,
    key: &str,
) -> Result<Vec<u8>, aws_sdk_s3::Error> {
    let resp = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await?;
    let bytes = resp.body.collect().await?.into_bytes();
    Ok(bytes.to_vec())
}

pub fn get_public_url(bucket: &str, key: &str) -> String {
    format!("{}/{}/{}", "http://localhost:9000", bucket, key)
}

pub async fn delete_file(
    client: &Client,
    bucket: &str,
    key: &str,
) -> Result<(), aws_sdk_s3::Error> {
    client
        .delete_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await?;
    Ok(())
}
```

**Add to `Cargo.toml`:**

```toml
[dependencies]
aws-sdk-s3 = "1"
aws-config = "1"
```

**Verify:**

```bash
cd edusync-api && cargo check 2>&1 | tail -1
# Expected: no errors
cargo clippy -- -D warnings 2>&1 | tail -1
# Expected: no errors
echo "PASS: storage.rs compiles" || echo "FAIL"
```

---

#### Task 5A-3: CSP Update

```
TASK ID:       5A-3
OWNER TYPE:    Frontend Agent
GOAL:          Update Content Security Policy for S3 domains
EDIT ONLY:     index.html, nginx.conf
DEPENDENCY:    5A-1
```

**Updates to `index.html` meta tag:**

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  img-src 'self' blob: data: https://cdn.edusync.dev https://*.r2.cloudflarestorage.com http://localhost:9000;
  connect-src 'self' https://api.edusync.dev wss://api.edusync.dev https://*.r2.cloudflarestorage.com http://localhost:9000;
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
">
```

**Updates to `nginx.conf` headers:**

```nginx
add_header Content-Security-Policy "
  default-src 'self';
  img-src 'self' blob: data: https://cdn.edusync.dev https://*.r2.cloudflarestorage.com;
  connect-src 'self' https://api.edusync.dev wss://api.edusync.dev https://*.r2.cloudflarestorage.com;
" always;
```

**Verify:**

```bash
# Check CSP includes S3 domain
grep -q "r2.cloudflarestorage.com" index.html && echo "PASS: CSP updated in index.html" || echo "FAIL: CSP missing S3 domain in index.html"
grep -q "r2.cloudflarestorage.com" nginx.conf && echo "PASS: CSP updated in nginx.conf" || echo "FAIL: CSP missing S3 domain in nginx.conf"

# Start dev server and check for CSP violations in browser console
pnpm dev &
sleep 5
curl -s http://localhost:5173 | grep -q "Content-Security-Policy" && echo "PASS: CSP header present" || echo "WARN: CSP in meta tag only"
kill %1
```

---

### 5B: Dual-Write Period

#### Task 5B-0: Enable Dual-Write

```
TASK ID:       5B-0
OWNER TYPE:    Backend Agent
GOAL:          Enable writing to both Supabase Storage and S3
EDIT ONLY:     src/services/storage/vilStorageProvider.ts
DEPENDENCY:    5A-2
```

**Implements in `src/services/storage/vilStorageProvider.ts`:**

```typescript
// Dual-write configuration
const DUAL_WRITE = true;
const STORAGE_PRIMARY: 'supabase' | 's3' = 'supabase';

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<{ url: string }> {
  const results = await Promise.allSettled([
    // Always write to Supabase (current primary)
    supabaseUpload(bucket, path, file),
    // Also write to S3 (new target)
    s3Upload(bucket, path, file),
  ]);

  const [supabaseResult, s3Result] = results;

  if (s3Result.status === 'rejected') {
    console.error('[dual-write] S3 write failed:', s3Result.reason);
    // Track failure for retry
    await trackFailedWrite(bucket, path, 's3');
  }

  if (supabaseResult.status === 'rejected') {
    throw supabaseResult.reason; // Primary must succeed
  }

  // Return URL from current primary
  return { url: supabaseResult.value.url };
}
```

**Verify:**

```bash
pnpm typecheck 2>&1 | tail -1 && echo "PASS: typecheck" || echo "FAIL: typecheck"

# Upload a test file via the app and check both storages:
# 1. Check Supabase Storage
curl -s -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/storage/v1/object/list/avatars" | jq 'length'

# 2. Check S3/MinIO
docker run --rm --net=host minio/mc ls local/avatars/ | wc -l

echo "Both counts should match after uploading test file"
```

---

#### Task 5B-1: Verify Dual-Write

```
TASK ID:       5B-1
OWNER TYPE:    QA Agent
GOAL:          Verify dual-write works correctly
EDIT ONLY:     None
DEPENDENCY:    5B-0
```

**Verification script:**

```bash
#!/bin/bash
set -e

# 1. Upload file via frontend API
TOKEN=$(curl -s -X POST "$VIL_API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@edusync.dev","password":"password123"}' | jq -r '.token')

echo "test-dual-write-$(date +%s)" > /tmp/dual-write-test.txt

curl -s -X POST "$VIL_API_URL/api/v1/storage/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "bucket=avatars" \
  -F "file=@/tmp/dual-write-test.txt"

# 2. Check file in Supabase Storage
SUPA_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/storage/v1/object/avatars/dual-write-test.txt")
[ "$SUPA_EXISTS" = "200" ] && echo "PASS: File exists in Supabase" || echo "FAIL: File missing in Supabase"

# 3. Check file in S3
S3_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  "http://localhost:9000/avatars/dual-write-test.txt")
[ "$S3_EXISTS" = "200" ] && echo "PASS: File exists in S3" || echo "FAIL: File missing in S3"

# 4. Compare checksums
SUPA_MD5=$(curl -s \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  "$SUPABASE_URL/storage/v1/object/avatars/dual-write-test.txt" | md5sum | cut -d' ' -f1)

S3_MD5=$(curl -s "http://localhost:9000/avatars/dual-write-test.txt" | md5sum | cut -d' ' -f1)

[ "$SUPA_MD5" = "$S3_MD5" ] && echo "PASS: Checksums match ($SUPA_MD5)" || echo "FAIL: Checksum mismatch (Supabase=$SUPA_MD5, S3=$S3_MD5)"

rm /tmp/dual-write-test.txt
```

---

### 5C: Background Migration

#### Task 5C-0: Copy Existing Files

```
TASK ID:       5C-0
OWNER TYPE:    Backend Agent
GOAL:          Copy all existing files from Supabase to S3
EDIT ONLY:     scripts/migrate-storage.sh (new)
DEPENDENCY:    5B-1
```

**Migration script `scripts/migrate-storage.sh`:**

```bash
#!/bin/bash
set -euo pipefail

# Configuration
SUPABASE_URL="${SUPABASE_URL:?Set SUPABASE_URL}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"
S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
S3_ACCESS_KEY="${S3_ACCESS_KEY:-minioadmin}"
S3_SECRET_KEY="${S3_SECRET_KEY:-minioadmin}"
BUCKETS="avatars course-assets scorm-packages certificates"
LOG_FILE="migration-$(date +%Y%m%d-%H%M%S).log"
FAIL_COUNT=0
SUCCESS_COUNT=0

echo "Starting storage migration at $(date)" | tee "$LOG_FILE"

for BUCKET in $BUCKETS; do
  echo "--- Migrating bucket: $BUCKET ---" | tee -a "$LOG_FILE"

  # List all files in the Supabase bucket
  FILES=$(curl -s \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -d '{"prefix":"","limit":10000}' \
    "$SUPABASE_URL/storage/v1/object/list/$BUCKET" | jq -r '.[].name')

  for FILE in $FILES; do
    echo "  Copying: $BUCKET/$FILE" | tee -a "$LOG_FILE"

    # Download from Supabase
    TMP="/tmp/migrate-$$-$(basename "$FILE")"
    HTTP_CODE=$(curl -s -o "$TMP" -w "%{http_code}" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      "$SUPABASE_URL/storage/v1/object/$BUCKET/$FILE")

    if [ "$HTTP_CODE" != "200" ]; then
      echo "  FAIL: Download failed (HTTP $HTTP_CODE)" | tee -a "$LOG_FILE"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      rm -f "$TMP"
      continue
    fi

    # Upload to S3
    aws s3 cp "$TMP" "s3://$BUCKET/$FILE" \
      --endpoint-url "$S3_ENDPOINT" 2>>"$LOG_FILE"

    if [ $? -eq 0 ]; then
      # Verify checksum
      SRC_MD5=$(md5sum "$TMP" | cut -d' ' -f1)
      DST_MD5=$(aws s3api head-object --bucket "$BUCKET" --key "$FILE" \
        --endpoint-url "$S3_ENDPOINT" 2>/dev/null | jq -r '.ETag' | tr -d '"')

      if [ "$SRC_MD5" = "$DST_MD5" ]; then
        echo "  OK: Checksum verified" | tee -a "$LOG_FILE"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
      else
        echo "  WARN: Checksum mismatch (src=$SRC_MD5 dst=$DST_MD5)" | tee -a "$LOG_FILE"
        FAIL_COUNT=$((FAIL_COUNT + 1))
      fi
    else
      echo "  FAIL: Upload to S3 failed" | tee -a "$LOG_FILE"
      FAIL_COUNT=$((FAIL_COUNT + 1))
    fi

    rm -f "$TMP"
  done
done

echo "" | tee -a "$LOG_FILE"
echo "=== Migration Summary ===" | tee -a "$LOG_FILE"
echo "Success: $SUCCESS_COUNT" | tee -a "$LOG_FILE"
echo "Failed:  $FAIL_COUNT" | tee -a "$LOG_FILE"
echo "Log:     $LOG_FILE" | tee -a "$LOG_FILE"

[ "$FAIL_COUNT" -eq 0 ] && echo "PASS: All files migrated" || echo "FAIL: $FAIL_COUNT files failed"
```

**Verify:**

```bash
chmod +x scripts/migrate-storage.sh
bash scripts/migrate-storage.sh 2>&1 | tail -5
# Should end with "PASS: All files migrated"
```

---

#### Task 5C-1: Verify Migration

```
TASK ID:       5C-1
OWNER TYPE:    QA Agent
GOAL:          Verify all files migrated correctly
EDIT ONLY:     None
DEPENDENCY:    5C-0
```

**Verification commands:**

```bash
#!/bin/bash
PASS=true

for BUCKET in avatars course-assets scorm-packages certificates; do
  # Count files in Supabase
  SUPA_COUNT=$(curl -s \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -d '{"prefix":"","limit":10000}' \
    "$SUPABASE_URL/storage/v1/object/list/$BUCKET" | jq 'length')

  # Count files in S3
  S3_COUNT=$(aws s3 ls "s3://$BUCKET/" --endpoint-url "$S3_ENDPOINT" --recursive | wc -l)

  if [ "$SUPA_COUNT" = "$S3_COUNT" ]; then
    echo "PASS: $BUCKET — $SUPA_COUNT files match"
  else
    echo "FAIL: $BUCKET — Supabase=$SUPA_COUNT, S3=$S3_COUNT"
    PASS=false
  fi
done

# Random sample checksum verification (10 files)
echo ""
echo "--- Random sample checksums ---"
SAMPLE_FILES=$(aws s3 ls "s3://avatars/" --endpoint-url "$S3_ENDPOINT" --recursive | shuf | head -10 | awk '{print $NF}')
for FILE in $SAMPLE_FILES; do
  S3_MD5=$(aws s3api head-object --bucket avatars --key "$FILE" --endpoint-url "$S3_ENDPOINT" | jq -r '.ETag' | tr -d '"')
  SUPA_MD5=$(curl -s \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    "$SUPABASE_URL/storage/v1/object/avatars/$FILE" | md5sum | cut -d' ' -f1)
  if [ "$S3_MD5" = "$SUPA_MD5" ]; then
    echo "  OK: $FILE"
  else
    echo "  FAIL: $FILE (S3=$S3_MD5 Supa=$SUPA_MD5)"
    PASS=false
  fi
done

$PASS && echo "PASS: Migration verified" || echo "FAIL: Migration has issues"
```

---

### 5D: Cutover

#### Task 5D-0: Switch Reads to S3

```
TASK ID:       5D-0
OWNER TYPE:    Frontend Agent
GOAL:          Change URL generation to return S3 URLs
EDIT ONLY:     src/services/storage/vilStorageProvider.ts
DEPENDENCY:    5C-1
```

**Changes in `src/services/storage/vilStorageProvider.ts`:**

```typescript
// BEFORE:
// const STORAGE_PRIMARY = 'supabase';
// AFTER:
const STORAGE_PRIMARY = 's3';

export function getPublicUrl(bucket: string, path: string): string {
  // Production: use CDN URL in front of R2
  // Staging/Local: use MinIO direct URL
  const S3_BASE = import.meta.env.VITE_S3_PUBLIC_URL || 'http://localhost:9000';
  return `${S3_BASE}/${bucket}/${path}`;
}
```

**Verify:**

```bash
# Check that getPublicUrl returns S3 URL
grep -n "STORAGE_PRIMARY" src/services/storage/vilStorageProvider.ts | grep "s3" \
  && echo "PASS: Primary switched to S3" || echo "FAIL: Still on Supabase"

# Build and check no Supabase Storage URLs in output
pnpm build 2>&1 | tail -3
grep -rn "supabase.co/storage" dist/ && echo "FAIL: Supabase URLs in build" || echo "PASS: No Supabase URLs in build"
```

---

#### Task 5D-1: URL Rewriting

```
TASK ID:       5D-1
OWNER TYPE:    Frontend Agent
GOAL:          Update all getPublicUrl references
EDIT ONLY:     src/features/*/api/*.ts (grep for getPublicUrl)
DEPENDENCY:    5D-0
```

**URL rewriting pattern** — find and update all files:

```bash
# Find all files that reference Supabase Storage URLs
grep -rn "supabase.*storage\|getPublicUrl\|/storage/v1/object" src/ --include="*.ts" --include="*.tsx"
```

**Replace pattern in each file:**

```typescript
// BEFORE: Supabase Storage URL construction
// const url = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
// const { data } = supabase.storage.from(bucket).getPublicUrl(path);

// AFTER: S3/CDN URL via vilStorageProvider
import { getPublicUrl } from '@/services/storage/vilStorageProvider';
const url = getPublicUrl(bucket, path);
```

**Files to update (search and replace in each):**

```bash
# List all files needing updates
grep -rln "supabase.*storage\|/storage/v1/object" src/ --include="*.ts" --include="*.tsx"

# Expected files:
# - src/features/courses/api/courseService.ts
# - src/features/courses/api/moduleService.ts
# - src/features/lessons/api/lessonService.ts
# - src/features/assignments/api/assignmentService.ts
# - src/features/profile/api/profileService.ts
```

**Verify:**

```bash
# No Supabase Storage URL references in source
grep -rn "supabase.*storage\|/storage/v1/object" src/ --include="*.ts" --include="*.tsx" \
  && echo "FAIL: Supabase Storage refs remain" || echo "PASS: All URLs rewritten"

# Typecheck passes
pnpm typecheck 2>&1 | tail -1

# Build passes
pnpm build 2>&1 | tail -3
echo "PASS: URL rewriting complete"
```

---

## Output Deliverables

After Phase 5:

- [ ] Object storage deployed (MinIO/S3/R2)
- [ ] Dual-write period verified
- [ ] All files migrated to S3
- [ ] Reads switched to S3
- [ ] URL rewriting complete
- [ ] CSP updated for S3 domains

## Rollback

If storage issues:

1. Switch to Supabase: Revert getPublicUrl changes
2. Verify: All files load from Supabase Storage
3. Investigate S3 issues in staging
4. Data safe in Supabase Storage

## Gate Criteria

- [ ] Dual-write verified (files in both storages)
- [ ] Background migration complete
- [ ] Reads switched to S3
- [ ] URL rewriting done
- [ ] No data loss
- [ ] All file access tests pass
