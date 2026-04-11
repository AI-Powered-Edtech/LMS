# EduSync LMS

LMS (Learning Management System) multi-tenant untuk sekolah Indonesia.

## Tech Stack

**Frontend**

- React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4
- React Router v7 (hash routing), React Query v5, Zustand v5
- Lucide React (icons), Framer Motion/`motion` (animations), Recharts (charts)

**Backend**

- Rust (Axum 0.7 via `vil_server`), sqlx 0.8, PostgreSQL 16
- WebSocket native, JWT auth (HS256), S3-compatible storage (aws-sdk-s3)
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

### Backend (dev)

```bash
cd edusync-api
cp .env.example .env   # edit DATABASE_URL, JWT_SECRET, etc.
docker compose up -d   # PostgreSQL + pgBouncer + MinIO + nginx
cargo run              # http://localhost:8080
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
├── edusync-api/            # Rust VIL backend
│   ├── crates/
│   │   ├── api-server/     # Axum server, route handlers, main.rs
│   │   ├── services/       # Business logic services
│   │   ├── auth/           # JWT + password hashing
│   │   ├── middleware/      # AppError, RBAC, tenant, brute force
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
