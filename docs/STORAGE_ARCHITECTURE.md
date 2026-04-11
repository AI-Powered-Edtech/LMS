# Storage Architecture — EduSync LMS

## 1. Overview

EduSync migrates its file storage layer from **Supabase Storage** to an
**S3-compatible** backend (Cloudflare R2 in production, MinIO in dev/staging).
The migration is zero-downtime and controlled by three environment variables
(`VITE_STORAGE_BACKEND`, `VITE_STORAGE_DUAL_WRITE`, `VITE_STORAGE_PRIMARY`).

```
Frontend
  └─ StorageProvider interface
       ├─ SupabaseStorageProvider (fallback / legacy)
       └─ VilStorageProvider       (Phase 5 — active)
            ├─ VIL backend API  → Cloudflare R2 (prod)
            │                   → MinIO            (dev/staging)
            └─ Dual-write path  → Supabase Storage (during migration window)
```

## 2. Storage Stack

| Environment | Primary store       | Fallback         |
| ----------- | ------------------- | ---------------- |
| Production  | Cloudflare R2       | Supabase Storage |
| Staging     | MinIO (self-hosted) | Supabase Storage |
| Development | MinIO (Docker)      | Supabase Storage |

All access is proxied through the VIL backend API (`VITE_API_URL`). Large files
(> 10 MiB) are uploaded directly via presigned PUT URLs to bypass the API proxy,
reducing server load and upload latency.

## 3. Bucket Layout

```
{bucket}/{tenant_id}/{path}
```

| Bucket           | Contents                             | Max object size |
| ---------------- | ------------------------------------ | --------------- |
| `avatars`        | User profile pictures                | 5 MiB           |
| `course-media`   | Course cover images, banners         | 20 MiB          |
| `lesson-content` | Videos, PDFs, SCORM ZIPs             | 2 GiB           |
| `submissions`    | Student essay and assignment uploads | 50 MiB          |
| `certificates`   | Generated PDF certificates           | 5 MiB           |

Tenant isolation is enforced at the RLS layer in Supabase and by the VIL backend
(all paths include `tenant_id` as the first segment).

## 4. Migration Strategy

```
Phase A — Dual-write
  All uploads go to BOTH Supabase and S3.
  Reads still served from Supabase (VITE_STORAGE_PRIMARY=supabase).

Phase B — Background copy
  Existing Supabase objects copied to S3 via offline migration job.
  Checksums verified (MD5/ETag) after copy.

Phase C — Read switchover
  VITE_STORAGE_PRIMARY=s3.  New reads served from CDN/S3.
  Dual-write still active to keep Supabase in sync as fallback.

Phase D — Cutover
  VITE_STORAGE_DUAL_WRITE=false.  All operations go to S3 only.
  Supabase storage bucket retained as cold backup for 30 days.

Phase E — Cleanup (optional)
  VITE_STORAGE_BACKEND=vil only.  Supabase buckets emptied / deleted.
```

## 5. Frontend Provider Selection

The provider is selected at app startup (typically in `main.tsx` or a bootstrap
module) by checking `VITE_STORAGE_BACKEND`:

```typescript
import {
  setStorageProvider,
  createVilStorageProvider,
  createSupabaseStorageProvider,
} from '@/services/storage'

const backend = import.meta.env.VITE_STORAGE_BACKEND ?? 'supabase'

if (backend === 'vil') {
  setStorageProvider(createVilStorageProvider())
} else {
  setStorageProvider(createSupabaseStorageProvider())
}
```

Consumers call `getStorageProvider().from(bucket)` — they never reference the
concrete provider and are unaffected by the switch.

## 6. Dual-Write Behaviour

When `VITE_STORAGE_DUAL_WRITE=true`:

| Operation        | VIL S3                                 | Supabase                 |
| ---------------- | -------------------------------------- | ------------------------ |
| `upload()`       | Await                                  | Fire-and-forget          |
| `remove()`       | Await                                  | Fire-and-forget          |
| `download()`     | Await                                  | —                        |
| `getPublicUrl()` | Primary (if `VITE_STORAGE_PRIMARY=s3`) | Primary (if `=supabase`) |

Supabase write failures are logged as `console.warn` in dev mode and silently
swallowed in production — the primary write result is always returned to the
caller.

`FormData` and `ReadableStream` bodies cannot be replayed, so dual-write is
skipped for those input types (the object will only exist in VIL S3).

## 7. Presigned Upload for Large Files

Files larger than **10 MiB** use a two-step presigned upload flow:

```
1. POST /api/v1/storage/presign-upload
   Body: { bucket, path, content_type }
   → { upload_url }              // short-lived presigned PUT URL

2. PUT {upload_url}
   Body: raw file bytes
   Headers: Content-Type only (no auth — URL is self-authorizing)
```

This avoids routing gigabyte-sized video files through the Node API server and
is required for SCORM ZIPs and lesson videos.

## 8. URL Patterns

| Context         | Old URL (Supabase)                                                 | New URL (VIL S3)                                                        |
| --------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Public object   | `https://{ref}.supabase.co/storage/v1/object/public/{b}/{p}`       | `https://cdn.edusync.dev/{bucket}/{path}`                               |
| Signed URL      | `https://{ref}.supabase.co/storage/v1/object/sign/{b}/{p}?token=…` | `{VIL_API_URL}/api/v1/storage/object/{bucket}/{path}?X-Amz-Signature=…` |
| Proxy download  | —                                                                  | `{VIL_API_URL}/api/v1/storage/object/{bucket}/{path}`                   |
| Direct S3 (dev) | —                                                                  | `http://localhost:9000/{bucket}/{path}`                                 |

## 9. Rollback Procedure

To roll back to Supabase Storage at any time:

```bash
# .env.local (or hosting platform env vars)
VITE_STORAGE_BACKEND=supabase
VITE_STORAGE_DUAL_WRITE=false
```

Redeploy the frontend. No backend changes required. All consumers use the
`StorageProvider` abstraction and are unaffected by the switch.

## 10. Environment Variables

| Variable                  | Required  | Default                 | Description                                           |
| ------------------------- | --------- | ----------------------- | ----------------------------------------------------- |
| `VITE_STORAGE_BACKEND`    | No        | `supabase`              | `supabase` or `vil`                                   |
| `VITE_API_URL`            | Yes (vil) | `http://localhost:8080` | VIL backend base URL                                  |
| `VITE_CDN_URL`            | No        | `` (empty)              | CDN origin, e.g. `https://cdn.edusync.dev`            |
| `VITE_STORAGE_DUAL_WRITE` | No        | `false`                 | `true` enables dual-write to Supabase                 |
| `VITE_STORAGE_PRIMARY`    | No        | `s3`                    | `s3` or `supabase` — controls `getPublicUrl()` output |

## 11. CSP Domains Required

The following domains must be in the Content-Security-Policy for S3 storage to work:

```
img-src:
  http://localhost:9000          # MinIO dev
  https://cdn.edusync.dev        # CDN prod
  https://*.r2.cloudflarestorage.com  # R2 direct (presigned upload confirmation)

connect-src:
  http://localhost:9000
  https://cdn.edusync.dev
  https://*.r2.cloudflarestorage.com

media-src:
  http://localhost:9000
  https://cdn.edusync.dev
```

These are already added to `index.html` as of the Phase 5 CSP update.

## 12. Related Files

| File                                              | Role                                                 |
| ------------------------------------------------- | ---------------------------------------------------- |
| `src/services/storage/types.ts`                   | `StorageProvider` / `StorageBucketClient` interfaces |
| `src/services/storage/storageProvider.ts`         | Singleton registry (`get/setStorageProvider`)        |
| `src/services/storage/vilStorageProvider.ts`      | VIL S3 implementation (Phase 5)                      |
| `src/services/storage/supabaseStorageProvider.ts` | Supabase fallback                                    |
| `src/services/storage/index.ts`                   | Re-exports                                           |
| `index.html`                                      | CSP meta tag (img-src / connect-src updated)         |
