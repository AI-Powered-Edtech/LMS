# CC3: Staging Environment

**Started:** Phase 1  
**Duration:** Throughout Phase 1-6  
**Owner:** DevOps/Backend

## Tujuan

Menyediakan staging environment yang isolated untuk parallel testing dan development sebelum production cutover.

## Prerequisites

```bash
# Verify tools
docker --version          # expect 24+
docker compose version    # expect v2.20+
cargo --version           # expect 1.77+
```

## Step 1: Docker Compose for Full Staging

Create `docker/docker-compose.staging.yml`:

```yaml
services:
  edusync-api:
    build:
      context: ../edusync-api
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://edusync:edusync@db:5432/edusync
      RUST_LOG: info,edusync_api=debug
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
      APP_ENV: staging
      JWT_SECRET: staging-jwt-secret-change-in-production
      CORS_ORIGIN: http://localhost
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: edusync
      POSTGRES_USER: edusync
      POSTGRES_PASSWORD: edusync
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U edusync -d edusync"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      edusync-api:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:
```

## Step 2: Nginx Reverse Proxy Config

Create `docker/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream edusync_api {
        server edusync-api:8080;
    }

    server {
        listen 80;
        server_name localhost;

        # API proxy
        location /api/ {
            proxy_pass http://edusync_api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Request-ID $request_id;
        }

        # Health check (direct)
        location /health {
            proxy_pass http://edusync_api/health;
        }

        # Metrics (internal only)
        location /metrics {
            proxy_pass http://edusync_api/metrics;
            allow 127.0.0.1;
            allow 172.16.0.0/12;  # Docker network
            deny all;
        }
    }
}
```

## Step 3: Dockerfile for edusync-api

Create `edusync-api/Dockerfile`:

```dockerfile
# Build stage
FROM rust:1.77-bookworm AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY migrations ./migrations
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/edusync-api .
COPY --from=builder /app/migrations ./migrations
EXPOSE 8080
CMD ["./edusync-api"]
```

## Step 4: Environment Variable Template

Create `docker/.env.staging.template`:

```bash
# Database
DATABASE_URL=postgres://edusync:edusync@db:5432/edusync

# Application
APP_ENV=staging
RUST_LOG=info,edusync_api=debug
CORS_ORIGIN=http://localhost

# Auth
JWT_SECRET=staging-jwt-secret-change-in-production

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Supabase (for dual-run period)
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
```

To use:

```bash
cp docker/.env.staging.template docker/.env.staging
# Edit docker/.env.staging with actual values
```

## Step 5: Deployment Script

Create `scripts/deploy-staging.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$PROJECT_ROOT/docker"

echo "=== EduSync Staging Deployment ==="

# 1. Load environment
if [ -f "$DOCKER_DIR/.env.staging" ]; then
    echo "[1/5] Loading .env.staging"
    set -a; source "$DOCKER_DIR/.env.staging"; set +a
else
    echo "[1/5] No .env.staging found, using defaults"
fi

# 2. Build
echo "[2/5] Building edusync-api Docker image..."
docker compose -f "$DOCKER_DIR/docker-compose.staging.yml" build

# 3. Stop existing
echo "[3/5] Stopping existing containers..."
docker compose -f "$DOCKER_DIR/docker-compose.staging.yml" down

# 4. Start
echo "[4/5] Starting staging environment..."
docker compose -f "$DOCKER_DIR/docker-compose.staging.yml" up -d

# 5. Wait for health
echo "[5/5] Waiting for services to be healthy..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8080/health > /dev/null 2>&1; then
        echo "API is healthy."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: API did not become healthy within 30 seconds."
        docker compose -f "$DOCKER_DIR/docker-compose.staging.yml" logs edusync-api
        exit 1
    fi
    sleep 1
done

echo ""
echo "=== Staging Environment Ready ==="
echo "  API:     http://localhost:8080"
echo "  Nginx:   http://localhost:80"
echo "  DB:      postgres://edusync:edusync@localhost:5432/edusync"
echo ""
echo "Run 'docker compose -f docker/docker-compose.staging.yml logs -f' to view logs."
```

```bash
# Make executable
chmod +x scripts/deploy-staging.sh
```

## Step 6: Data Sync Script

Create `scripts/sync-staging-data.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Sync production to staging with anonymization
# Usage: ./sync-staging-data.sh <PROD_DB_URL> <STAGING_DB_URL>

PROD_DB="${1:?Usage: $0 <PROD_DB_URL> <STAGING_DB_URL>}"
STAGING_DB="${2:?Usage: $0 <PROD_DB_URL> <STAGING_DB_URL>}"

echo "=== Syncing production data to staging (with anonymization) ==="

# Dump production (schema + data)
echo "[1/3] Dumping production database..."
pg_dump "$PROD_DB" --no-owner --no-acl > /tmp/prod_dump.sql

# Anonymize PII
echo "[2/3] Anonymizing PII..."
sed -i \
    -e "s/[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]*\.[a-zA-Z]\{2,\}/user@test.edusync.dev/g" \
    -e "s/+62[0-9]\{8,12\}/+6200000000000/g" \
    /tmp/prod_dump.sql

# Load into staging
echo "[3/3] Loading into staging database..."
psql "$STAGING_DB" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$STAGING_DB" < /tmp/prod_dump.sql

# Cleanup
rm -f /tmp/prod_dump.sql

echo "=== Staging data sync complete ==="
```

## Arsitektur Staging

```
                    +-------------------+
                    |     Nginx :80     |
                    +--------+----------+
                             |
                    +--------v----------+
                    | edusync-api :8080  |
                    +--------+----------+
                             |
                    +--------v----------+
                    |  PostgreSQL :5432  |
                    +-------------------+
```

## Environment Matrix

| Env         | Backend       | Database         | Frontend URL                    | Use Case            |
| ----------- | ------------- | ---------------- | ------------------------------- | ------------------- |
| Development | VIL (local)   | Local Postgres   | localhost:5173                  | Local dev           |
| Staging     | VIL (staging) | Staging Postgres | staging.edusync.internal        | Integration testing |
| Preview     | VIL (preview) | Preview Postgres | pr-{n}.staging.edusync.internal | PR testing          |
| E2E         | VIL (e2e)     | E2E Postgres     | e2e.edusync.internal            | Automated tests     |
| Production  | VIL (prod)    | Prod Supabase    | app.edusync.id                  | Live                |

## Verification

```bash
# 1. Start staging environment
cd docker
docker compose -f docker-compose.staging.yml up -d

# 2. Wait for services
sleep 10

# 3. Verify database is running
docker compose -f docker-compose.staging.yml exec db pg_isready -U edusync -d edusync
# Expected: "accepting connections"

# 4. Verify API health
curl -sf http://localhost:8080/health
# Expected: "ok"

# 5. Verify nginx proxy
curl -sf http://localhost/health
# Expected: "ok"

# 6. Verify API through nginx
curl -sf http://localhost/api/health
# Expected: "ok"

# 7. Verify metrics are not publicly accessible
curl -s -o /dev/null -w "%{http_code}" http://localhost/metrics
# Expected: 403 (blocked by nginx)

# 8. Check all containers are healthy
docker compose -f docker-compose.staging.yml ps
# Expected: all services show "healthy" or "running"

# 9. Cleanup
docker compose -f docker-compose.staging.yml down -v
```

## Parity Tests

Dual-run verification: call both Supabase and VIL with same input, compare outputs:

```typescript
// Example parity test
async function testCourseListParity() {
  const supabaseResult = await supabase.from('courses').select('id, title, status')
  const vilResult = await vilClient.courses.list()
  assert.deepEqual(supabaseResult.data, vilResult.data)
}
```

## Exit Criteria

- [ ] `docker compose -f docker-compose.staging.yml up -d` starts all 3 services
- [ ] `curl -sf http://localhost:8080/health` returns "ok"
- [ ] `curl -sf http://localhost/health` returns "ok" (through nginx)
- [ ] Database is accessible at `localhost:5432`
- [ ] `scripts/deploy-staging.sh` runs end-to-end without errors
- [ ] Environment variable template covers all required vars

## Referensi

- Related: [01_MONITORING_OBSERVABILITY.md](./01_MONITORING_OBSERVABILITY.md) untuk staging monitoring
- Related: [08_FRONTEND_RUNTIME_COMPATIBILITY.md](./08_FRONTEND_RUNTIME_COMPATIBILITY.md) untuk frontend cutover
