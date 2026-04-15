# EduSync — Deployment Guide

## Prerequisites

| Tool           | Minimum Version | Notes                                            |
| -------------- | --------------- | ------------------------------------------------ |
| Docker         | 24+             | Required for PostgreSQL, pgBouncer, MinIO, nginx |
| Docker Compose | v2              | `docker compose` (without hyphen)                |
| Rust           | 1.78+           | Required to build `edusync-api`                  |
| Node.js        | 20+             | Required for frontend                            |
| pnpm           | 10+             | Frontend package manager                         |

## Environment Variables

Copy `edusync-api/.env.example` to `edusync-api/.env` and fill in all required values.

### Required

| Variable             | Description                            | Example                                             |
| -------------------- | -------------------------------------- | --------------------------------------------------- |
| `DATABASE_URL`       | PostgreSQL connection string           | `postgresql://postgres:pass@pgbouncer:5432/edusync` |
| `JWT_SECRET`         | HS256 access token secret (≥32 chars)  | `your-super-secret-jwt-key-min-32-chars`            |
| `JWT_REFRESH_SECRET` | HS256 refresh token secret (≥32 chars) | `your-refresh-secret-key-min-32-chars`              |

### Storage (S3 / R2 / MinIO)

| Variable               | Description         | Dev Default                     |
| ---------------------- | ------------------- | ------------------------------- |
| `S3_ENDPOINT`          | S3 API endpoint     | `http://minio:9000`             |
| `S3_REGION`            | S3 region           | `us-east-1`                     |
| `S3_ACCESS_KEY_ID`     | S3 access key       | `minioadmin`                    |
| `S3_SECRET_ACCESS_KEY` | S3 secret key       | `minioadmin123`                 |
| `S3_BUCKET`            | Bucket name         | `edusync`                       |
| `S3_PUBLIC_URL`        | Public CDN base URL | `http://localhost:9000/edusync` |

### Email (SMTP)

| Variable          | Description          | Default               |
| ----------------- | -------------------- | --------------------- |
| `SMTP_HOST`       | SMTP server hostname | (none)                |
| `SMTP_PORT`       | SMTP port            | `587`                 |
| `SMTP_USERNAME`   | SMTP auth username   | (none)                |
| `SMTP_PASSWORD`   | SMTP auth password   | (none)                |
| `SMTP_FROM_EMAIL` | Sender address       | `noreply@edusync.dev` |

### AI (Groq)

| Variable       | Description                                            |
| -------------- | ------------------------------------------------------ |
| `GROQ_API_KEY` | Groq LLM API key. If unset, AI endpoints return `503`. |

### Push Notifications (VAPID)

| Variable            | Description                                                           |
| ------------------- | --------------------------------------------------------------------- |
| `VAPID_PRIVATE_KEY` | VAPID private key for Web Push                                        |
| `VAPID_PUBLIC_KEY`  | VAPID public key (also needed by frontend as `VITE_VAPID_PUBLIC_KEY`) |

### WhatsApp

| Variable                   | Description                       |
| -------------------------- | --------------------------------- |
| `WHATSAPP_ACCESS_TOKEN`    | Meta Graph API token              |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |

### LTI 1.3

| Variable              | Description                               |
| --------------------- | ----------------------------------------- |
| `LTI_RSA_PRIVATE_KEY` | RSA private key (PEM) for LTI JWT signing |
| `LTI_RSA_PUBLIC_KEY`  | RSA public key (PEM) for JWKS endpoint    |
| `LTI_LAUNCH_URL`      | Full URL of the LTI launch endpoint       |
| `APP_URL`             | Base URL of the EduSync app               |

### VIL Runtime

| Variable      | Default | Description                                                            |
| ------------- | ------- | ---------------------------------------------------------------------- |
| `VIL_PROFILE` | `dev`   | VIL profile: `dev` / `staging` / `prod`                                |
| `RUST_LOG`    | `info`  | Log level (`error`/`warn`/`info`/`debug`/`trace`) — use `warn` in prod |

> **Note:** The Observer dashboard (`/_vil/dashboard/`) is enabled in `dev` and `staging` profiles. In `prod` profile it is disabled by default unless explicitly re-enabled with `.observer(true)` in the `VilApp` builder.

### Server

| Variable              | Default | Description                               |
| --------------------- | ------- | ----------------------------------------- |
| `PORT`                | `8080`  | API server port                           |
| `SENTRY_DSN`          | (none)  | Sentry error tracking DSN                 |
| `SHADOW_MODE_ENABLED` | `false` | Enable shadow mode for traffic comparison |

## Docker Compose Deployment (Recommended)

All services are defined in `edusync-api/docker-compose.yml`.

### Services

| Service      | Image                     | Port           | Description                          |
| ------------ | ------------------------- | -------------- | ------------------------------------ |
| `postgres`   | `pgvector/pgvector:pg16`  | `5432`         | PostgreSQL 16 with pgvector          |
| `pgbouncer`  | `edoburu/pgbouncer`       | `5433`         | Connection pooler (transaction mode) |
| `minio`      | `minio/minio`             | `9000`, `9001` | S3-compatible object storage         |
| `minio-init` | `minio/mc`                | —              | One-shot bucket initializer          |
| `api`        | (built from `Dockerfile`) | `8080`         | VIL Rust API server                  |
| `nginx`      | `nginx:alpine`            | `80`           | Reverse proxy                        |

### Start all services

```bash
cd edusync-api

# Start infrastructure only (for local Cargo development):
docker compose up -d postgres pgbouncer minio minio-init

# Start all services including the API:
docker compose up -d

# View logs:
docker compose logs -f api
docker compose logs -f postgres

# Stop:
docker compose down

# Stop and remove volumes (DESTRUCTIVE):
docker compose down -v
```

### Database Initialization

On first `docker compose up`, PostgreSQL automatically runs:

1. `schema/init-db.sql` — creates extensions and `auth` schema
2. `schema/baseline.sql` — creates all tables, functions, and initial data

Subsequent migrations are applied by the API server at startup via sqlx.

## Building the Frontend

```bash
# Install dependencies:
pnpm install

# Build for production:
pnpm build

# Output is in dist/ — serve as static files via nginx or CDN
```

Frontend environment variables (prefix: `VITE_`):

| Variable                | Description               | Example                              |
| ----------------------- | ------------------------- | ------------------------------------ |
| `VITE_API_URL`          | VIL API base URL          | `https://api.edusync.id`             |
| `VITE_WS_URL`           | WebSocket URL             | `wss://api.edusync.id/ws`            |
| `VITE_CDN_URL`          | CDN base URL              | `https://cdn.edusync.id`             |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for push | (same as backend `VAPID_PUBLIC_KEY`) |
| `VITE_SENTRY_DSN`       | Frontend Sentry DSN       | (optional)                           |

## Building the Backend (VIL)

```bash
cd edusync-api

# Development build + run (dev profile):
cargo run

# Run with explicit VIL profile:
VIL_PROFILE=prod cargo run

# Production release build (standard Rust — no Axum-specific steps):
cargo build --release
# Binary: target/release/edusync-api-server
```

## Production Checklist

- [ ] `JWT_SECRET` is at least 32 characters and unique per environment
- [ ] `JWT_REFRESH_SECRET` is at least 32 characters and unique per environment
- [ ] `DATABASE_URL` points to pgBouncer (not direct Postgres)
- [ ] `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` configured for R2 or production MinIO
- [ ] `SMTP_HOST` configured for email delivery
- [ ] `CORS_ORIGINS` set to production frontend domain
- [ ] nginx configured with HTTPS (TLS/SSL certificates)
- [ ] nginx security headers added (`HSTS`, `X-Frame-Options`, `CSP`)
- [ ] Sentry DSN configured for error tracking
- [ ] `VIL_PROFILE=prod` set in production environment
- [ ] `RUST_LOG=warn` or `error` in production (not `debug`)
- [ ] Secrets are stored in a secrets manager (not `.env` files committed to git)
- [ ] Database has regular automated backups
- [ ] MinIO or R2 bucket policies restrict public access to only public buckets

## nginx Configuration

The nginx config in `edusync-api/nginx.conf` covers:

- All `/api/v1/` route proxying to the VIL API at port 8080
- WebSocket upgrade for `/ws` with 1-hour keepalive
- `client_max_body_size 550M` for large video uploads
- 404 for unrecognized routes (no Supabase/PostgREST fallback)

For production, add TLS termination:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    # ... rest of config
}
```

## CORS Configuration

Set `CORS_ORIGINS` on the VIL API server to your frontend domain:

```bash
CORS_ORIGINS=https://app.edusync.id
```

For multiple origins, use a comma-separated list.
