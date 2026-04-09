# TASK QUEUE — Phase 5: Storage Migration

**Weeks 61-66 | ~80 jam**

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — pakai `pnpm`
3. Jalankan verify commands setelah setiap task
4. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
5. **JANGAN** buat keputusan arsitektur baru — semua sudah locked di synthesized plan
6. Jika ketemu coupling tak terduga → **BLOCKED**, bukan improvisasi
7. **🛠️ Rollback rule:** Commit SEBELUM mulai task: `git add -A && git commit -m "checkpoint: before task 5X-XX"`. Jika verify gagal: `git stash` atau `git checkout -- <files>`

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

1. List all Supabase Storage buckets
2. Document file types per bucket
3. Identify access patterns (public/private)
4. Plan S3 bucket structure
5. Calculate migration volume

**Verify:** `wc -l docs/STORAGE_ARCHITECTURE.md` (>40 lines)

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

**Creates:**

- S3-compatible storage
- Bucket configuration
- Access credentials

**Verify:** Can upload/download test file

---

#### Task 5A-2: Configure vil_storage_s3

```
TASK ID:       5A-2
OWNER TYPE:    Rust CLI Agent
GOAL:          Integrate S3 storage with VIL
EDIT ONLY:     edusync-api/crates/api-server/src/storage.rs (new)
DEPENDENCY:    5A-1
```

**Creates:**

- S3 client configuration
- Upload/download handlers
- Public URL generation
- Bucket management

**Verify:** `cargo check && cargo clippy`

---

#### Task 5A-3: CSP Update

```
TASK ID:       5A-3
OWNER TYPE:    Frontend Agent
GOAL:          Update Content Security Policy for S3 domains
EDIT ONLY:     index.html, nginx.conf
DEPENDENCY:    5A-1
```

**Updates:**

- img-src: Add S3/CDN domain
- connect-src: Add S3 endpoint
- script-src: Add any required domains

**Verify:** All resources load without CSP violations

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

**Implements:**

- Write to Supabase Storage AND S3 simultaneously
- Track which storage has the file
- Handle partial failures gracefully

**Verify:** Files exist in both storages

---

#### Task 5B-1: Verify Dual-Write

```
TASK ID:       5B-1
OWNER TYPE:    QA Agent
GOAL:          Verify dual-write works correctly
EDIT ONLY:     None
DEPENDENCY:    5B-0
```

**Verification:**

1. Upload file via frontend
2. Check file exists in Supabase Storage
3. Check file exists in S3
4. Compare checksums
5. Verify URLs work for both

**Verify:** Both storages have identical files

---

### 5C: Background Migration

#### Task 5C-0: Copy Existing Files

```
TASK ID:       5C-0
OWNER TYPE:    Backend Agent
GOAL:          Copy all existing files from Supabase to S3
EDIT ONLY:     migrations/ (background migration script)
DEPENDENCY:    5B-1
```

**Process:**

1. List all files in Supabase Storage buckets
2. Download each file
3. Upload to S3 with same key
4. Verify checksum match
5. Mark as migrated in tracking table

**Verification:** Migration progress tracked

---

#### Task 5C-1: Verify Migration

```
TASK ID:       5C-1
OWNER TYPE:    QA Agent
GOAL:          Verify all files migrated correctly
EDIT ONLY:     None
DEPENDENCY:    5C-0
```

**Verification:**

1. Compare file counts: Supabase vs S3
2. Random sample checksums
3. Test public URLs for migrated files
4. Handle any failed migrations

**Verify:** 100% file match

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

**Changes:**

- getPublicUrl() returns S3 URL
- Frontend uses S3 URLs exclusively
- Supabase Storage becomes write-only

**Verify:** All images/assets load from S3

---

#### Task 5D-1: URL Rewriting

```
TASK ID:       5D-1
OWNER TYPE:    Frontend Agent
GOAL:          Update all getPublicUrl references
EDIT ONLY:     src/features/*/api/*.ts (grep for getPublicUrl)
DEPENDENCY:    5D-0
```

**Files to update:**

- courseService.ts
- moduleService.ts
- lessonService.ts
- assignmentService.ts
- Any other file using getPublicUrl

**Verify:** No Supabase Storage URLs in frontend

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
