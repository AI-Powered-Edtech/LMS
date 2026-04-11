# Changelog

## [1.0.0] — 2026-04-11

Initial production release. Full VIL backend, no Supabase dependencies.

### Stack

- **Frontend**: React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS v4
- **Backend**: Rust (Axum 0.7) — VIL framework
- **Database**: PostgreSQL 16 (Docker self-hosted, pgvector)
- **Storage**: S3-compatible (Cloudflare R2 / MinIO)
- **Realtime**: Native WebSocket + pg_notify
- **Auth**: JWT (HS256, 15min/7d pair)

### Backend Crates

- `edusync-api-server` — Axum server, all routes
- `edusync-services` — AI, LTI, email, push, WhatsApp, PDF, grading, progress, storage
- `edusync-auth` — JWT, password hashing
- `edusync-middleware` — AppError, RBAC, tenant isolation
- `edusync-models` — SQLx models

### API Surface

- Auth: `/api/v1/auth/{register,login,refresh,logout}`
- Data: `/api/v1/data/*`, `/api/v1/rpc/*` (PostgREST-compatible)
- AI: `/api/v1/ai/{grade-essay,tutor,generate-content,generate-quiz}`
- LTI 1.3: `/api/v1/lti/{jwks,oidc-login,launch}`
- Storage: `/api/v1/storage/*`
- Realtime: WebSocket at `/ws`
- 30+ additional endpoints for notifications, PDF, import, progress, SCORM
