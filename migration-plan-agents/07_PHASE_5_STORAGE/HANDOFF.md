# Phase 5 → Phase 6 Handoff

**EduSync LMS — Supabase to VIL Backend Migration**

---

## Executive Summary

Phase 5 completed the migration of all storage from Supabase Storage to S3-compatible storage (Cloudflare R2). The system now handles all file uploads and downloads without Supabase Storage dependency.

## Deliverables Completed

### 5A: Object Storage Deployment ✅

- Cloudflare R2 deployed (production)
- MinIO in Docker Compose (local/staging)
- S3 client integrated with VIL
- Bucket configuration complete

### 5B: Dual-Write Period ✅

- Writes go to both Supabase Storage and S3
- 7+ days verified
- Checksums match between storages
- Fallback handling verified

### 5C: Background Migration ✅

- All existing files copied to S3
- 100% migration complete
- Random sample verification passed
- Failed files identified and retried

### 5D: Cutover ✅

- Reads switched to S3 (primary)
- URL rewriting complete
- getPublicUrl() returns S3 URLs
- Supabase Storage now write-only

## Architecture Decisions Made

### Storage Stack

- **Primary (Production):** Cloudflare R2 (no egress fees)
- **Fallback:** Supabase Storage (read-only)
- **Local/Staging:** MinIO in Docker Compose

### Migration Strategy

- Dual-write for 7+ days before cutover
- Background migration script with retry
- Checksum verification for all files
- URL rewriting in frontend

### URL Patterns

| Old (Supabase)                    | New (S3)                                       |
| --------------------------------- | ---------------------------------------------- |
| `supabase.co/.../bucket/file.png` | `r2.cloudflarestorage.com/.../bucket/file.png` |
| `*.supabase.co`                   | `*.r2.cloudflarestorage.com`                   |

### CSP Updates

Added to Content-Security-Policy:

- `img-src r2.cloudflarestorage.com cdn.edusync.dev`
- `connect-src r2.cloudflarestorage.com`

## Files Created/Modified

### Infrastructure

```
infrastructure/
├── r2/                        # Cloudflare R2 config
│   └── r2.tf                 # Terraform for R2
├── minio/                    # Local/staging
│   ├── docker-compose.yml
│   └── .env
└── scripts/
    ├── migrate-files.sh       # Background migration
    └── verify-migration.sh    # Verification script
```

### Backend (`edusync-api/`)

```
crates/api-server/src/
├── storage/
│   ├── mod.rs                # Storage module
│   ├── s3_client.rs          # S3 client
│   ├── upload.rs             # Upload handler
│   ├── download.rs           # Download handler
│   └── url.rs                # URL generation
```

### Frontend

```
src/services/storage/
├── vilStorageProvider.ts      # S3 implementation (primary)
├── supabaseStorageProvider.ts # Supabase (fallback)
├── types.ts                  # Storage types

src/features/*/api/           # All getPublicUrl() calls updated
├── courses/api/courseService.ts
├── lessons/api/lessonService.ts
├── course-builder/api/moduleService.ts
├── assignments/api/assignmentService.ts
└── ... (all other features using getPublicUrl)
```

### Database

```
migrations/
├── 005_add_storage_tracking.sql
│   -- storage_migration table
│   -- track migration status per file
```

### Tests

```
tests/
├── storage/
│   ├── upload_e2e.rs         # S3 upload/download
│   ├── dual_write_e2e.rs     # Both storages
│   ├── migration_e2e.rs     # Background migration
│   ├── url_rewrite_e2e.rs   # URL pattern
│   └── fallback_e2e.rs      # Fallback to Supabase
```

## Environment Variables Required

```bash
# S3/R2 Configuration
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=edusync
R2_PUBLIC_URL=https://cdn.edusync.dev

# Alternative: MinIO (local/staging)
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=edusync

# Frontend
VITE_STORAGE_BACKEND=s3
VITE_CDN_URL=https://cdn.edusync.dev

# Fallback (if needed)
SUPABASE_URL=http://localhost:54321
SUPABASE_STORAGE_URL=http://localhost:54321/storage/v1
VITE_STORAGE_FALLBACK=supabase
```

## Test Scenarios

| Scenario             | Test Method      | Pass Criteria            |
| -------------------- | ---------------- | ------------------------ |
| Upload to S3         | `uploadFile()`   | File exists in R2        |
| Download from S3     | `getPublicUrl()` | Returns R2 URL           |
| Fallback to Supabase | Disable R2       | File loads from Supabase |
| Migration complete   | Check counts     | S3 = Supabase count      |
| URL rewrite          | grep source      | No supabase.co URLs      |

## Phase 6 Entry Points

### Storage Routes

```
/api/v1/storage/upload    → VIL S3
/api/v1/storage/download → VIL S3
/storage/v1/*            → SUPABASE (fallback, deprecated)
/rest/v1/*               → VIL PostgREST
/api/v1/auth/*           → VIL Auth
```

### Switchover Commands

```bash
# Primary is S3 (default after Phase 5)
export VITE_STORAGE_BACKEND=s3

# Fallback to Supabase (if issues)
export VITE_STORAGE_BACKEND=supabase

# Emergency rollback
./scripts/storage-rollback.sh
```

## Rollback Procedure

If S3 issues detected:

1. Set `VITE_STORAGE_BACKEND=supabase` in frontend
2. Verify: All files load from Supabase Storage
3. Investigate S3 issues in staging
4. Data safe in Supabase Storage
5. Re-enable dual-write: `VITE_STORAGE_DUAL_WRITE=true`

## Phase 6 Scope

### Decommission

1. Remove `@supabase/supabase-js` from package.json
2. Remove Supabase abstraction implementations
3. Remove Edge Functions directory
4. Remove Supabase config
5. Migrate PostgreSQL hosting if needed
6. Remove RLS policies from DB
7. Update Sentry error tracking
8. Update PWA service worker
9. Final full E2E test run
10. Final load test (k6)

### Final Deliverables

- Zero Supabase dependencies
- VIL-only backend
- 100% feature parity verified
- Load tests pass

## Sign-offs

| Role            | Name | Date | Status     |
| --------------- | ---- | ---- | ---------- |
| Tech Lead       |      |      | ⬜ Pending |
| Security Review |      |      | ⬜ Pending |
| QA              |      |      | ⬜ Pending |
| Product Owner   |      |      | ⬜ Pending |

---

**Phase 5 Status: COMPLETE ✅**  
**Ready for Phase 6: YES ✅**
