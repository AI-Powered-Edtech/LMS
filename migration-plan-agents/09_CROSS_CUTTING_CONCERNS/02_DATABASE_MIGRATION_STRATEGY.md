# CC2: Database Migration Strategy

**Started:** Phase 0  
**Duration:** Throughout all phases  
**Owner:** Backend/Database

## Tujuan

Mengatur strategi migrasi database dari Supabase-managed ke VIL-managed PostgreSQL dengan backward compatibility.

## Prinsip Dasar

1. **Supabase CLI sebagai Source of Truth** — Until Phase 2+ migration to sqlx
2. **Backward-Compatible Migrations Only** — Never break existing API contracts
3. **Enum/Status Changes via Migration Files Only** — No application-level enum changes

## Fase Implementasi

### Phase 0-1: Supabase CLI Mode

Selama Phase 0 dan 1, Supabase CLI adalah single source of truth untuk schema:

```bash
# Generate migration from current state
supabase db diff

# Apply migrations
supabase db push

# Reset database
supabase db reset
```

Structure:

```
supabase/
├── migrations/
│   └── *.sql
└── seed.sql
```

### Phase 2+ (Week 23+): sqlx Migration

Setelah Phase 2 dimulai, migrate ke sqlx untuk better tooling:

```rust
// Example migration in sqlx
#[derive(Migration)]
pub struct AddUserPreferencesTable;

impl Migration for AddUserPreferencesTable {
    fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create()
                .table(UserPreferences::Table)
                .col(Column::new("id", Uuid).not_null())
                .col(Column::new("user_id", Uuid).not_null())
                ...
        )
    }
}
```

Migration tooling requirements:

- `cargo sqlx migrate` for local development
- CI integration untuk automatic migration runs
- Migration ordering and dependencies

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
| Migration fails mid-way  | Re-apply previous migration                  | <5 min  |
| Schema change breaks app | Deploy previous version + rollback migration | <10 min |
| Data corruption          | Point-in-time recovery                       | <30 min |

## Tools & Scripts

```bash
# Check migration status
supabase migration list

# Create new migration
supabase migration new add_user_preferences

# Generate diff from remote
supabase db diff --db-url $SUPABASE_DB_URL
```

## Exit Criteria

- [ ] All migrations documented in `supabase/migrations/`
- [ ] Migration history clear and traceable
- [ ] No breaking changes in any migration
- [ ] sqlx migrations available by Phase 2 start
- [ ] Rollback procedures tested

## Referensi

- Related: [02_PHASE_0_FRONTEND_ABSTRACTION/README.md](../02_PHASE_0_FRONTEND_ABSTRACTION/README.md)
- Related: [04_PHASE_2_CORE_CRUD/README.md](../04_PHASE_2_CORE_CRUD/README.md)
- Supabase CLI docs: https://supabase.com/docs/guides/cli
