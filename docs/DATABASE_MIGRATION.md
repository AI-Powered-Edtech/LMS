# Database Migration: Supabase → Docker PostgreSQL

## Overview

EduSync LMS database has been migrated from Supabase-hosted PostgreSQL to
self-hosted PostgreSQL running in Docker.

## Stack

| Component          | Details                                                |
| ------------------ | ------------------------------------------------------ |
| Engine             | PostgreSQL 16 (`pgvector/pgvector:pg16`)               |
| Connection pooling | pgBouncer (transaction mode, max 100 clients)          |
| Extensions         | uuid-ossp, pgcrypto, citext, pg_trgm, unaccent, vector |
| Volume             | `postgres_data` (Docker named volume)                  |

## Quick Start (local dev — fresh database)

```bash
# 1. Start PostgreSQL (initialises automatically from schema/init-db.sql + schema/baseline.sql)
cd edusync-api
docker compose up -d postgres pgbouncer

# 2. Verify PostgreSQL is healthy
docker compose exec postgres pg_isready -U postgres -d edusync

# 3. Apply VIL-specific migrations (001–009)
#    Option A — via cargo migrate binary (if implemented):
cargo run --bin migrate
#    Option B — manual psql:
for f in migrations/*.sql; do
  echo "Applying $f..."
  PGPASSWORD=edusync_local_pass psql -h localhost -U postgres -d edusync -f "$f"
done

# 4. Start full stack
docker compose up -d
```

## Migrating Production Data from Supabase

```bash
# Step 1: Export from Supabase
#   Dapatkan DB password dari: Supabase Dashboard → Settings → Database
export SUPABASE_DB_HOST=db.omfnkoufjqjqilswldtz.supabase.co
export SUPABASE_DB_PASSWORD=<your-supabase-db-password>
./infrastructure/scripts/export-from-supabase.sh

# Step 2: Start Docker PostgreSQL (fresh — or wipe with: docker compose down -v)
cd edusync-api && docker compose up -d postgres pgbouncer

# Step 3: Import
./infrastructure/scripts/import-to-docker.sh infrastructure/backup/supabase-export-*.sql

# Step 4: Verify
./infrastructure/scripts/verify-db.sh
```

## Connection Strings

| Environment                     | DATABASE_URL                                                        |
| ------------------------------- | ------------------------------------------------------------------- |
| Local dev — direct              | `postgresql://postgres:edusync_local_pass@localhost:5432/edusync`   |
| Local dev — pgBouncer           | `postgresql://postgres:edusync_local_pass@localhost:5433/edusync`   |
| Docker internal (api→pgbouncer) | `postgresql://postgres:${POSTGRES_PASSWORD}@pgbouncer:5432/edusync` |
| Docker internal (pgbouncer→pg)  | `postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/edusync`  |
| Production                      | Set `DATABASE_URL` and `POSTGRES_PASSWORD` via environment          |

## Architecture

```
Browser / App
     │
     ▼
VIL Rust API :8080
     │
     ▼
pgBouncer :5433  (transaction pool, max 100 clients, pool size 40)
     │
     ▼
PostgreSQL :5432  (pgvector/pgvector:pg16, volume: postgres_data)
```

## Initialization Sequence

Docker runs `docker-entrypoint-initdb.d/` scripts in alphabetical order on first boot:

1. `01-init.sql` (`schema/init-db.sql`) — creates schemas, extensions, auth stubs
2. `02-baseline.sql` (`schema/baseline.sql`) — full 14 327-line pg_dump from Supabase

Subsequent starts reuse the `postgres_data` volume (scripts do not re-run).

## Baseline.sql Modifications

The following Supabase-only extensions were commented out in `schema/baseline.sql`
because they are not available in the `pgvector/pgvector:pg16` image:

| Extension        | Reason removed                            |
| ---------------- | ----------------------------------------- |
| `pg_cron`        | Replaced by Rust cron jobs in VIL backend |
| `pg_net`         | Supabase-only HTTP extension              |
| `pg_graphql`     | Supabase-only GraphQL layer               |
| `supabase_vault` | Supabase-only secrets manager             |

`pgcrypto` and `uuid-ossp` are pre-installed in `public` schema by `init-db.sql`,
so the baseline's `CREATE EXTENSION … WITH SCHEMA "extensions"` lines become no-ops.

## RLS Removal

Migration `009_drop_rls.sql` drops all RLS policies. This is safe because:

1. Database is no longer on Supabase — PostgREST has no access
2. VIL Rust backend enforces tenant isolation via `tenant_id` in every query
3. PostgreSQL port 5432 is only accessible from within the Docker network (not exposed to internet in production)

## auth.users Table

A minimal `auth.users` table is created in `init-db.sql` for backward FK compatibility
with existing code that references `auth.uid()`, `auth.role()`, and `auth.jwt()`.

In VIL mode:

- User IDs come from `public.profiles.id`
- The VIL `register` endpoint creates entries in both `auth.users` AND `public.profiles`
- `auth.uid()` reads from `current_setting('app.current_user_id')` set by VIL middleware
- `auth.jwt()` builds a minimal claims object from VIL session variables

## Resetting the Database

```bash
cd edusync-api

# Wipe everything and start fresh (WARNING: destroys all data)
docker compose down -v
docker compose up -d postgres pgbouncer

# Check logs during init
docker compose logs -f postgres
```
