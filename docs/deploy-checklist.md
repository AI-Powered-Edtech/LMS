# EduSync Deployment Checklist (VIL/Rust Architecture)

## 1. Environment Variables

- [ ] `DATABASE_URL` is set and points to pgBouncer or direct Postgres (must include `postgres://` or `postgresql://`).
- [ ] `JWT_SECRET` is set to a secure random string (min 32 chars).
- [ ] `JWT_REFRESH_SECRET` is set to a secure random string (min 32 chars).
- [ ] `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` are configured for storage.
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` are configured for transactional emails.
- [ ] `VAPID_PRIVATE_KEY` and `VAPID_PUBLIC_KEY` are set for push notifications.
- [ ] `GROQ_API_KEY` is set for AI features.
- [ ] `VIL_PROFILE` is set to `prod`.
- [ ] `RUST_LOG` is set to `warn` or `error`.
- [ ] `ENABLE_OBSERVER` is `false` (or unset) unless explicitly needed.

## 2. Infrastructure

- [ ] PostgreSQL 16 is running with `pgvector` extension.
- [ ] pgBouncer is running and configured in transaction mode (recommended for production).
- [ ] MinIO or Cloudflare R2 is running and accessible.
- [ ] EduSync API Server (Rust) is running.

## 3. Application Settings & Reverse Proxy

- [ ] CORS origins are correctly configured in the Rust backend to match the frontend domains.
- [ ] Nginx is configured as a reverse proxy with HTTPS (TLS/SSL) pointing to the Rust backend (default port 8080).
- [ ] Security headers (HSTS, X-Frame-Options, CSP) are configured in Nginx.
- [ ] WebSocket endpoint `/ws` is properly proxied in Nginx (requires `proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`).

## 4. Post-Deployment Validation

- [ ] Health check endpoint `/api/v1/health` returns HTTP 200.
- [ ] Database schema is initialized (`edusync-api/schema/baseline.sql` + migrations applied).
- [ ] Core workflows (login, register, course creation) are functioning correctly.
- [ ] WebSocket connections can be established for real-time features.
- [ ] S3/MinIO file uploads and presigned URLs are working.

_(Note: Supabase RLS and PostgREST are no longer used. Do not attempt to run `supabase db push` or rely on Supabase Edge Functions.)_
