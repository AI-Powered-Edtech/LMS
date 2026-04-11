# EduSync LMS

LMS (Learning Management System) multi-tenant untuk sekolah Indonesia.

## Tech Stack

**Frontend**

- React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4
- React Router v7 (hash routing), React Query v5, Zustand v5
- Lucide React (icons), Framer Motion/`motion` (animations), Recharts (charts)

**Backend**

- VIL (Vastar Intermediate Language) — Rust process-oriented framework ([github.com/OceanOS-id/VIL](https://github.com/OceanOS-id/VIL))
  - `vil_server = "0.2"` — built on Axum 0.7 + sqlx 0.8 + PostgreSQL 16
  - ShmSlice zero-copy body extraction, ServiceCtx typed state, VilResponse SIMD JSON
  - SseCollect for AI streaming (Groq/OpenAI dialect), WsHub for WebSocket broadcast
  - VIL Scheduler for background jobs, vil_conn_s3 for S3 storage
- WebSocket native (WsHub), JWT auth (HS256), S3-compatible storage (vil_conn_s3)
- TOTP MFA, Argon2/bcrypt password hashing, rate limiting (governor)

**Infrastructure**

- Docker Compose: PostgreSQL 16 (pgvector) + pgBouncer + MinIO + nginx
- Cloudflare R2 (production storage)
- Sentry (error tracking), structured JSON tracing

## Quick Start

### Prerequisites

- Node.js 20+, pnpm 10+
- Rust 1.78+, Docker + Docker Compose

### Frontend (dev)

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

### Backend (VIL)

```bash
cd edusync-api
cp .env.example .env        # edit DATABASE_URL, JWT_SECRET, etc.
docker compose up -d        # PostgreSQL + pgBouncer + MinIO
cargo run                   # http://localhost:8080
# Observer dashboard: http://localhost:8080/_vil/dashboard/
```

## Project Structure

```
LMS/
├── src/                    # React frontend
│   ├── features/           # Domain feature modules (49 modules)
│   │   ├── courses/        # Course management & builder
│   │   ├── gradebook/      # Grading & assessments
│   │   ├── notifications/  # Push, email, WhatsApp
│   │   ├── analytics/      # Progress & reports
│   │   ├── gamification/   # XP, badges, leaderboard
│   │   └── ...             # Other feature domains
│   ├── services/
│   │   ├── db/             # VIL unified database client
│   │   ├── auth/           # VIL auth provider (JWT)
│   │   ├── storage/        # VIL S3 storage provider
│   │   ├── realtime/       # VIL WebSocket provider
│   │   └── api/            # API runtime & shadow mode
│   ├── hooks/              # Shared React hooks
│   ├── components/         # Shared UI components
│   └── pages/              # Thin route page entry points
├── edusync-api/            # VIL Rust backend (vil_server = "0.2")
│   ├── crates/
│   │   ├── api-server/     # VilApp entry, #[vil_handler(shm)] route handlers
│   │   ├── services/       # Business logic services
│   │   ├── auth/           # JWT + password hashing
│   │   ├── middleware/      # AuthedRequest (RBAC), tenant, brute force
│   │   └── models/         # SQLx models & query types
│   ├── migrations/         # SQL migration files (001–009)
│   ├── schema/             # baseline.sql, init-db.sql
│   ├── docker-compose.yml  # Full stack Docker config
│   └── nginx.conf          # Reverse proxy config
├── infrastructure/
│   ├── minio/              # MinIO Docker config
│   ├── r2/                 # Cloudflare R2 config
│   └── scripts/            # DB migration scripts
├── docs/                   # Documentation
├── e2e/                    # Playwright E2E tests
└── k6/                     # Load tests (smoke, stress)
```

## Test Accounts

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | Teacher |
| `student@edusync.dev` | `password123` | Student |
| `admin@edusync.dev`   | `password123` | Admin   |

Dev app: `http://localhost:5173` (after `pnpm dev`)

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Database](docs/DATABASE.md)
- [Auth](docs/AUTH.md)
- [Realtime](docs/REALTIME.md)
- [Storage](docs/STORAGE.md)
- [Features](docs/FEATURES.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Development](docs/DEVELOPMENT.md)

## License

Proprietary — EduSync LMS © 2026
