# Phase 5: Storage Migration

**Timeline:** Weeks 61-66  
**Effort:** ~80 hours

## Overview

Phase 5 migrates storage from Supabase Storage to S3-compatible storage (Cloudflare R2) with dual-write period and background migration.

## Goals

1. Deploy MinIO/S3/R2 object storage
2. Configure vil_storage_s3
3. Run dual-write period (both storages)
4. Background migration of existing files
5. Switch reads to S3
6. URL rewriting

## Storage Architecture

### Primary (Production)

- **Cloudflare R2** — No egress fees
- CDN integration via cdn.edusync.dev

### Fallback (Read-Only)

- Supabase Storage — Deprecated but available

### Local/Staging

- MinIO in Docker Compose

## Migration Strategy

### Phase 5A: Deploy Object Storage

1. Deploy Cloudflare R2 (production)
2. Deploy MinIO (local/staging)
3. Configure S3 client in VIL
4. Update CSP for S3 domains

### Phase 5B: Dual-Write Period

1. Enable writing to both Supabase + S3
2. Verify 7+ days
3. Verify checksums match

### Phase 5C: Background Migration

1. Copy all existing files to S3
2. Verify checksums
3. Handle failed migrations

### Phase 5D: Cutover

1. Switch reads to S3
2. Update getPublicUrl() calls
3. Verify all files accessible
4. Disable dual-write

## URL Patterns

| Old (Supabase)              | New (S3/R2)           |
| --------------------------- | --------------------- |
| `*.supabase.co/storage/...` | `cdn.edusync.dev/...` |

## Gate Criteria

- [ ] Object storage deployed
- [ ] Dual-write verified (7+ days)
- [ ] Background migration complete
- [ ] Reads switched to S3
- [ ] URL rewriting done
- [ ] No data loss

## Rollback

Emergency: `VITE_STORAGE_BACKEND=supabase`

---

## Artefak

- [x] README.md (dokumen ini)
- [x] TASK_QUEUE.md - Antrian tugas Storage
- [x] CUTOVER_AND_ROLLBACK.md - Prosedur cutover
- [x] HANDOFF.md - Handover ke Phase 6
