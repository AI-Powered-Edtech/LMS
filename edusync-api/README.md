# EduSync API Backend

## Quick Start

### 1. Start Infrastructure (PostgreSQL, Redis, MinIO)

```bash
cd edusync-api
docker compose up -d postgres redis minio
```

Wait for healthy:

```bash
docker compose ps
# STATUS should show "healthy" for postgres, redis, minio
```

### 2. Run API Server

**Option A: Via Cargo (recommended for dev)**

```bash
cargo run -p edusync-api-server
```

**Option B: Via Docker**

```bash
docker compose up api
```

### 3. Verify

```bash
# Check API is running
curl http://localhost:8080/health
# Expected: {"status":"ok"}

# Or check from Vite dev server (http://localhost:5173)
# Demo button login should work
```

## Ports

| Service       | Port  | Purpose               |
| ------------- | ----- | --------------------- |
| API           | 8080  | Main API              |
| PostgreSQL    | 54322 | DB (mapped from 5432) |
| Redis         | 6379  | Cache                 |
| MinIO         | 29000 | S3                    |
| MinIO Console | 29001 | S3 admin UI           |

## Troubleshooting

### "Connection refused" on 8080

- Backend not running → `cargo run -p edusync-api-server`

### "Server tidak merespons"

- Backend running but not responding → check logs: `cargo run -p edusync-api-server 2>&1`

### PostgreSQL connection error

- Postgres not ready → `docker compose up -d postgres && docker compose ps`
