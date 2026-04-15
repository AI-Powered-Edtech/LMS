# EduSync — Development Guide

## Prerequisites

| Tool           | Version | Install                      |
| -------------- | ------- | ---------------------------- |
| Node.js        | 20+     | https://nodejs.org           |
| pnpm           | 10+     | `npm i -g pnpm`              |
| Rust           | 1.78+   | https://rustup.rs            |
| Docker         | 24+     | https://docker.com           |
| Docker Compose | v2      | Included with Docker Desktop |

## Local Setup (Step by Step)

### 1. Clone and install frontend dependencies

```bash
git clone <repo-url>
cd LMS
pnpm install
```

### 2. Configure backend environment

```bash
cd edusync-api
cp .env.example .env
# Edit .env with your settings (see table below)
```

Minimum required `.env` for local development:

```env
DATABASE_URL=postgresql://postgres:edusync_local_pass@localhost:5433/edusync
JWT_SECRET=dev-secret-change-in-prod-minimum-32-chars
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-prod-32chars
PORT=8080
RUST_LOG=info
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin123
S3_BUCKET=edusync
S3_PUBLIC_URL=http://localhost:9000/edusync
```

### 3. Start the database and storage

```bash
cd edusync-api
docker compose up -d postgres pgbouncer minio minio-init

# Wait for postgres to be ready:
docker compose logs -f postgres
# Look for: "database system is ready to accept connections"
```

### 4. Start the backend API (VIL)

```bash
cd edusync-api
cargo run                     # Start with default (dev) profile
# Server starts at http://localhost:8080
# Health check:         http://localhost:8080/api/v1/health
# Observer dashboard:   http://localhost:8080/_vil/dashboard/
```

### 5. Start the frontend

```bash
cd LMS
pnpm dev
# App available at http://localhost:5173
```

## Frontend Environment Variables

Create `LMS/.env.local` for local overrides:

```env
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080/ws
VITE_CDN_URL=http://localhost:9000/edusync
VITE_REALTIME_BACKEND=vil
VITE_STORAGE_PRIMARY=s3
VITE_STORAGE_DUAL_WRITE=false
```

## Test Accounts

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | Teacher |
| `student@edusync.dev` | `password123` | Student |
| `admin@edusync.dev`   | `password123` | Admin   |

Note: `.test` TLD emails fail validation — use `.dev` or real domains.

## Useful Commands

### Frontend

```bash
pnpm dev              # Start dev server with hot reload
pnpm build            # Production build (runs typecheck + lint + tests first)
pnpm preview          # Preview production build locally
pnpm typecheck        # TypeScript type check (tsc --noEmit)
pnpm lint             # ESLint
pnpm format           # Prettier auto-format
pnpm format:check     # Prettier check (no write)
pnpm test             # Run unit tests (Vitest, watch mode)
pnpm test:ci          # Run unit tests once with coverage
pnpm test:e2e         # Playwright E2E tests
pnpm check:circular   # Check circular dependencies (madge)
pnpm check:unused     # Check unused exports (knip)
pnpm bundlesize       # Check bundle size limits
```

### Backend (VIL)

```bash
cd edusync-api
cargo check           # Fast compile check (no binary output)
cargo build           # Debug build
cargo build --release # Release build (binary: target/release/edusync-api-server)
cargo run             # Run with dev profile (VIL_PROFILE=dev)
VIL_PROFILE=prod cargo run    # Run with production profile
cargo test            # Run unit tests
cargo clippy          # Rust linter
cargo fmt             # Rust formatter

# Integration tests (Gate 3):
DATABASE_URL='postgresql://postgres:edusync_local_pass@127.0.0.1:5432/edusync' \
  cargo test -p edusync-integration-tests --test gate3_api
```

### Docker

```bash
cd edusync-api

# Start all infra:
docker compose up -d postgres pgbouncer minio minio-init

# Start everything (including API in container):
docker compose up -d

# View logs:
docker compose logs -f api
docker compose logs -f postgres
docker compose logs -f nginx

# Rebuild API container after code changes:
docker compose build api
docker compose up -d api

# Access PostgreSQL directly:
docker compose exec postgres psql -U postgres -d edusync

# Reset database (DESTRUCTIVE):
docker compose down -v
docker compose up -d
```

### Database

```bash
# Apply migrations manually:
DATABASE_URL=postgresql://postgres:edusync_local_pass@localhost:5432/edusync \
  sqlx migrate run

# Check migration status:
DATABASE_URL=postgresql://postgres:edusync_local_pass@localhost:5432/edusync \
  sqlx migrate info
```

## VIL Handler Development

When writing new backend handlers, always use the VIL Way:

```rust
#[vil_handler(shm)]
pub async fn my_handler(
    ctx: ServiceCtx,
    body: ShmSlice,
) -> HandlerResult<VilResponse<MyResponse>> {
    let state = ctx.state::<Arc<AppState>>();
    let req: MyRequest = body.json()?;
    // ... business logic ...
    Ok(VilResponse::ok(result))
}
```

**Never use:**

| Avoid                        | Use instead                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `Extension<Arc<AppState>>`   | `ServiceCtx` + `ctx.state::<Arc<AppState>>()`                                  |
| `Json<T>` body extractor     | `ShmSlice` + `body.json()?`                                                    |
| Custom error enums           | `VilError::bad_request/not_found/internal/...`                                 |
| `Json(data)` return          | `VilResponse::ok(data)`                                                        |
| `reqwest::Client` for AI SSE | `SseCollect::post_to(url).dialect(SseDialect::openai()).collect_text().await?` |

Standard Axum extractors that are still fine to use: `Path<T>`, `Query<T>`, `HeaderMap`, `Form<T>`, `Bytes`.

## Observer Dashboard (dev)

Set `ENABLE_OBSERVER=true`, lalu buka `http://localhost:8080/_vil/dashboard/` untuk live metrics:

- Real-time RPS and latency (P50/P95/P99)
- Per-route breakdown table
- SHM pool utilization
- SLO budget tracking

## Code Conventions

### Identity & Auth

```tsx
// Always get user identity from useAuth():
const { user, profile, role, tenantId } = useAuth()

// NEVER hardcode user IDs, tenant IDs, or credentials in components
// profile.role does NOT exist — use useAuth().role
```

### Routing

- All app links use `/#/` prefix (hash routing)
- Route protection: `<RoleRoute role="teacher" />` or `<RoleRoute role={["teacher", "admin"]} />`
- Leaderboard route must include both `student` and `teacher`

### Feature Modules

- New features go in `src/features/{domain}/`
- Internal structure: `api/ queries/ hooks/ store/ types/ components/ utils/`
- Pages in `src/pages/` are thin entry points — logic belongs in feature modules

### UI Language

- All user-visible text **must** be in Bahasa Indonesia
- No English labels, button text, error messages, or headers in the UI
- Backend error messages should be translated in `translateAuthError()` or equivalent

### Dark Mode

- All new components must include `dark:` Tailwind variants
- Test at `class="dark"` on the HTML element or via the ThemeContext toggle

### Database Queries

- Never `SELECT *` — always specify columns
- Always paginate large table queries
- Always quote reserved words: `"order"` not `order`
- Use the correct column names (see [DATABASE.md](DATABASE.md) gotchas)

### Tenant Isolation

- Every DB query must include `tenant_id` filter
- New tables need `tenant_id` column and `auto_set_tenant_id()` trigger
- Never use `set_tenant_id_from_user()` (deprecated)

## Project Structure at a Glance

```
src/
├── features/           # 49 domain feature modules
├── services/
│   ├── db/             # import { db } from '@/services/db'
│   ├── auth/           # vilAuthProvider
│   ├── storage/        # vilStorageProvider
│   └── realtime/       # vilRealtimeProvider
├── hooks/              # useAuth, useTheme, etc.
├── components/
│   ├── ui/             # Button, Card, Modal, etc.
│   └── guards/         # RoleRoute, AuthGuard
└── pages/              # Thin page entry points
```

## Storybook

```bash
pnpm storybook         # Start Storybook at http://localhost:6006
pnpm build-storybook   # Build Storybook
```

## Load Tests

```bash
# Smoke test (low load):
pnpm load:smoke

# Stress test:
pnpm load:stress
```

Requires `k6` installed locally: https://k6.io/docs/get-started/installation/

## Debugging

### Backend

Set `RUST_LOG=debug` in `.env` for verbose logging:

```bash
RUST_LOG=debug cargo run
```

For a specific module:

```bash
RUST_LOG=edusync_api_server=debug cargo run
```

### Frontend

React Query DevTools are included in development builds (`@tanstack/react-query-devtools`). They appear as a floating button in the bottom-right corner of the screen.
