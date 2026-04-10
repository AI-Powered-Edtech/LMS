# CC2: Database Migration Strategy

**Started:** Phase 0  
**Duration:** Throughout all phases  
**Owner:** Backend/Database

## Tujuan

Mengatur strategi migrasi database dari Supabase-managed ke VIL-managed PostgreSQL dengan backward compatibility.

## Prerequisites

```bash
# Verify tools
rustc --version       # expect 1.77+
cargo --version
psql --version        # expect 16+

# Install sqlx CLI
cargo install sqlx-cli --no-default-features --features postgres

# Verify sqlx CLI
sqlx --version        # expect 0.7+
```

## Prinsip Dasar

1. **Supabase CLI sebagai Source of Truth** -- Until Phase 2+ migration to sqlx
2. **Backward-Compatible Migrations Only** -- Never break existing API contracts
3. **Enum/Status Changes via Migration Files Only** -- No application-level enum changes

## Cargo.toml Dependencies

Add these to `edusync-api/Cargo.toml`:

```toml
[dependencies]
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "postgres", "uuid", "chrono", "migrate"] }
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
```

## Migration File Naming Convention

sqlx migrations use timestamped filenames with `up` and `down` variants:

```
edusync-api/migrations/
  20260410120000_create_initial_schema.up.sql
  20260410120000_create_initial_schema.down.sql
  20260410130000_add_user_preferences.up.sql
  20260410130000_add_user_preferences.down.sql
  20260410140000_add_course_tags.up.sql
  20260410140000_add_course_tags.down.sql
```

Naming rules:
- Prefix: `YYYYMMDDHHMMSS` (UTC timestamp, no gaps required but must be monotonically increasing)
- Suffix: descriptive snake_case name
- Always create both `.up.sql` and `.down.sql` (use `-r` flag for reversible)

## Step 1: Create Migrations Directory and First Migration

```bash
# Set the database URL (use your actual Supabase or local Postgres URL)
export DATABASE_URL="postgres://edusync:edusync@localhost:5432/edusync"

# Create migrations directory and first reversible migration
cd edusync-api
mkdir -p migrations
sqlx migrate add -r create_initial_schema
```

This creates two files. Fill them in:

`migrations/<timestamp>_create_initial_schema.up.sql`:

```sql
-- Create tenants table (multi-tenant root)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id, role)
);

-- Create index for fast role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON user_roles(user_id, tenant_id);

-- RLS policies
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
```

`migrations/<timestamp>_create_initial_schema.down.sql`:

```sql
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
```

## Step 2: Run Migrations

```bash
# Set DATABASE_URL
export DATABASE_URL="postgres://edusync:edusync@localhost:5432/edusync"

# Run all pending migrations
sqlx migrate run

# Check migration status
sqlx migrate info
```

## Step 3: Create Additional Migrations

```bash
# Add a new reversible migration
sqlx migrate add -r add_user_preferences

# Edit the generated files, then run
sqlx migrate run
```

Example `add_user_preferences.up.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT NOT NULL DEFAULT 'id',
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, tenant_id)
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_user_prefs_user_tenant ON user_preferences(user_id, tenant_id);
```

Example `add_user_preferences.down.sql`:

```sql
DROP TABLE IF EXISTS user_preferences CASCADE;
```

## Step 4: Embed Migrations in Rust Binary

```rust
// edusync-api/src/db.rs
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

/// Create a connection pool and run all pending migrations.
pub async fn init_db() -> PgPool {
    let database_url = std::env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");

    // Run embedded migrations at startup
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Database migrations applied successfully");
    pool
}
```

## Rollback Procedure

```bash
# Revert the last migration
export DATABASE_URL="postgres://edusync:edusync@localhost:5432/edusync"
sqlx migrate revert

# Revert multiple migrations (run revert N times)
sqlx migrate revert
sqlx migrate revert

# Check current state after rollback
sqlx migrate info

# Re-apply after fixing the migration
sqlx migrate run
```

## Fase Implementasi

### Phase 0-1: Supabase CLI Mode

Selama Phase 0 dan 1, Supabase CLI is the primary tool:

```bash
# Generate migration from current state
supabase db diff

# Apply migrations
supabase db push

# Reset database
supabase db reset

# List migrations
supabase migration list

# Create new migration
supabase migration new add_user_preferences

# Generate diff from remote
supabase db diff --db-url $SUPABASE_DB_URL
```

Structure:

```
supabase/
  migrations/
    *.sql
  seed.sql
```

### Phase 2+ (Week 23+): sqlx Migration

Switch to sqlx for the VIL backend:

```bash
# Install sqlx CLI (if not already done)
cargo install sqlx-cli --no-default-features --features postgres

# Create migration
sqlx migrate add -r create_initial_schema

# Run migrations
DATABASE_URL=postgres://edusync:edusync@localhost:5432/edusync sqlx migrate run

# Revert last migration
DATABASE_URL=postgres://edusync:edusync@localhost:5432/edusync sqlx migrate revert

# Check status
DATABASE_URL=postgres://edusync:edusync@localhost:5432/edusync sqlx migrate info
```

## Migration Rules

### Backward Compatibility

**DO:**

- Add new columns with defaults
- Add new tables
- Add new indexes
- Add new ENUM values at end
- Add new FK with deferrable

**DON'T:**

- Remove columns (mark as deprecated first)
- Rename columns/tables (add new, migrate data, remove old)
- Change column types
- Remove ENUM values
- Change FK behavior
- Remove indexes (mark as unused first)

### Enum Changes

```sql
-- Add new status (safe)
ALTER TYPE course_status ADD VALUE 'archived';

-- NOT SAFE - would break existing reads
-- ALTER TYPE course_status REMOVE VALUE 'draft';
```

### Status Columns

Migration must handle status transitions:

- Add `status` column as nullable initially
- Populate with default values
- Make NOT NULL after data verified

## Schema Synchronization

### During Dual-Run Period

1. VIL server connects to Supabase database directly (read-only or limited write)
2. Schema changes applied via Supabase CLI
3. VIL server picks up changes via connection

### After Migration (Phase 5+)

1. Full VIL-managed PostgreSQL
2. Migrations applied via sqlx
3. Full control over schema evolution

## Rollback Strategy

| Scenario                 | Rollback                                     | Time    |
| ------------------------ | -------------------------------------------- | ------- |
| Migration fails mid-way  | `sqlx migrate revert`                        | <5 min  |
| Schema change breaks app | Deploy previous version + `sqlx migrate revert` | <10 min |
| Data corruption          | Point-in-time recovery                       | <30 min |

## Verification

```bash
# 1. Install sqlx CLI
cargo install sqlx-cli --no-default-features --features postgres
sqlx --version

# 2. Start a local Postgres (if not running)
docker run -d --name edusync-db -e POSTGRES_DB=edusync -e POSTGRES_USER=edusync -e POSTGRES_PASSWORD=edusync -p 5432:5432 postgres:16
sleep 3

# 3. Set DATABASE_URL
export DATABASE_URL="postgres://edusync:edusync@localhost:5432/edusync"

# 4. Create and run a test migration
cd edusync-api
mkdir -p migrations
sqlx migrate add -r test_verification
echo "CREATE TABLE _migration_test (id SERIAL PRIMARY KEY);" > migrations/*_test_verification.up.sql
echo "DROP TABLE IF EXISTS _migration_test;" > migrations/*_test_verification.down.sql
sqlx migrate run
# Expected: "Applied 1 migration(s)"

# 5. Verify migration status
sqlx migrate info
# Expected: shows the migration as "applied"

# 6. Revert and verify
sqlx migrate revert
sqlx migrate info
# Expected: shows the migration as "pending"

# 7. Cleanup
docker rm -f edusync-db
```

## Exit Criteria

- [ ] `cargo install sqlx-cli` succeeds
- [ ] `sqlx migrate add -r <name>` creates both up/down files
- [ ] `sqlx migrate run` applies migrations without errors
- [ ] `sqlx migrate revert` rolls back the last migration
- [ ] `sqlx migrate info` shows correct applied/pending status
- [ ] All migrations documented in `edusync-api/migrations/`
- [ ] No breaking changes in any migration
- [ ] Rollback procedures tested

## Referensi

- Related: [02_PHASE_0_FRONTEND_ABSTRACTION/README.md](../02_PHASE_0_FRONTEND_ABSTRACTION/README.md)
- Related: [04_PHASE_2_CORE_CRUD/README.md](../04_PHASE_2_CORE_CRUD/README.md)
- Supabase CLI docs: https://supabase.com/docs/guides/cli
- sqlx CLI docs: https://github.com/launchbadge/sqlx/blob/main/sqlx-cli/README.md
