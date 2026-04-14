# EduSync — Storage Architecture

## Overview

EduSync uses S3-compatible object storage for all file uploads. In development, MinIO runs locally via Docker Compose. In production, Cloudflare R2 is the recommended storage backend.

Storage is proxied through the VIL API server — no direct S3 URL is exposed to clients (except for presigned URLs for large files).

## Architecture

```
Client (browser)
  │
  ├─ Small file upload (< 10 MB)
  │   POST /api/v1/storage/upload  (multipart)
  │   │
  │   VIL API Server
  │   │  aws-sdk-s3
  │   └─> MinIO (dev) / Cloudflare R2 (prod)
  │
  └─ Large file upload (≥ 10 MB)
      POST /api/v1/storage/presign-upload  → VIL issues presigned PUT URL
      PUT https://r2.example.com/bucket/...  → Client uploads directly to S3
```

## Bucket Layout

All objects are stored in a **single S3 bucket** (default: `edusync`). Logical buckets are implemented as path prefixes:

```
edusync/
├── course-images/{tenant_id}/{filename}
├── assignment-submissions/{tenant_id}/{filename}
├── video-captions/{tenant_id}/{filename}
├── certificates/{tenant_id}/{filename}
├── course-videos/{tenant_id}/{filename}
├── course-files/{tenant_id}/{filename}
└── avatars/{tenant_id}/{filename}
```

## Bucket Definitions

| Logical Bucket           | Max File Size | Access               | Description                |
| ------------------------ | ------------- | -------------------- | -------------------------- |
| `course-images`          | 5 MB          | Public (CDN)         | Course thumbnail images    |
| `assignment-submissions` | 20 MB         | Private (signed URL) | Student assignment files   |
| `video-captions`         | 1 MB          | Private              | VTT/SRT caption files      |
| `certificates`           | 5 MB          | Public (CDN)         | Generated PDF certificates |
| `course-videos`          | 500 MB        | Private (signed URL) | Course lecture videos      |
| `course-files`           | 50 MB         | Private (signed URL) | Lesson handouts, PDFs      |
| `avatars`                | 2 MB          | Public (CDN)         | User profile pictures      |

## Upload Flow

### Small files (< 10 MB)

```
1. Client: POST /api/v1/storage/upload
   Content-Type: multipart/form-data
   Fields: file, bucket, path
   Authorization: Bearer <token>

2. VIL API: validates JWT + tenant, checks file size, uploads to S3

3. Response: { url: "https://cdn.example.com/..." }
```

### Large files (≥ 10 MB)

```
1. Client: POST /api/v1/storage/presign-upload
   Body: { bucket, path, content_type }
   Authorization: Bearer <token>

2. VIL API: validates JWT + tenant, generates presigned PUT URL (15 min TTL)

   Response: { upload_url: "https://r2.cloudflare.com/...", public_url: "..." }

3. Client: PUT <upload_url>
   Body: <raw file bytes>
   Content-Type: <content_type>
   (no auth header needed — presigned URL carries credentials)

4. Client: registers file in DB with public_url
```

The 10 MB threshold is defined in `vilStorageProvider.ts` as `LARGE_FILE_THRESHOLD = 10 * 1024 * 1024`.

nginx is configured with `client_max_body_size 550M` for the `/api/v1/storage/` path.

## URL Types

| Type              | Endpoint                                       | Use Case                                                       |
| ----------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| **Public CDN**    | `GET /api/v1/storage/public-url/:bucket/*path` | Publicly readable files (course-images, avatars, certificates) |
| **Signed URL**    | `POST /api/v1/storage/sign`                    | Time-limited access to private files (videos, submissions)     |
| **API Proxy**     | `GET /api/v1/storage/object/:bucket/*path`     | Auth-checked file download via VIL                             |
| **Presigned PUT** | `POST /api/v1/storage/presign-upload`          | Direct large-file upload to S3                                 |

Signed URLs are valid for configurable seconds (default: 3600). The VIL API issues them using the S3 SDK's presign functionality.

## Local Development (MinIO)

MinIO runs as a Docker service and is automatically started by `docker compose up`:

```yaml
minio:
  image: minio/minio:latest
  ports:
    - '9000:9000' # S3 API endpoint
    - '9001:9001' # Web console
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin123
```

Access the MinIO web console at `http://localhost:9001` (credentials: `minioadmin` / `minioadmin123`).

The `minio-init` service automatically creates the `edusync` bucket and sets `course-images` to public download on first run.

## Production (Cloudflare R2)

Cloudflare R2 is an S3-compatible object store with no egress fees. Configure the following env vars on the VIL API server:

| Variable               | Description                | Example                                      |
| ---------------------- | -------------------------- | -------------------------------------------- |
| `S3_ENDPOINT`          | R2 S3 endpoint             | `https://<account>.r2.cloudflarestorage.com` |
| `S3_REGION`            | Region (use `auto` for R2) | `auto`                                       |
| `S3_ACCESS_KEY_ID`     | R2 access key              | `abc123...`                                  |
| `S3_SECRET_ACCESS_KEY` | R2 secret key              | `xyz789...`                                  |
| `S3_BUCKET`            | Bucket name                | `edusync`                                    |
| `S3_PUBLIC_URL`        | Public CDN base URL        | `https://cdn.edusync.id`                     |

## Frontend Configuration

| Variable                  | Default                 | Description                             |
| ------------------------- | ----------------------- | --------------------------------------- |
| `VITE_API_URL`            | `http://localhost:8080` | VIL API base URL (for upload proxy)     |
| `VITE_CDN_URL`            | `` (empty)              | CDN base URL for public assets          |
| `VITE_STORAGE_PRIMARY`    | `s3`                    | Storage backend selection               |
| `VITE_STORAGE_DUAL_WRITE` | `false`                 | Enable dual-write mode (migration only) |

The storage provider is selected by `getStorageProvider()` in `src/services/storage/index.ts`. By default it returns `VilStorageProvider` backed by the VIL API.

## Storage Client Initialization

The `S3StorageClient` in `edusync-api/crates/api-server/src/storage/client.rs` is initialized from env vars via `S3StorageClient::from_env().await`. If `S3_ENDPOINT` is not set, the storage client is `None` and all storage endpoints return `503 Service Unavailable`. This is logged as a warning at startup.
