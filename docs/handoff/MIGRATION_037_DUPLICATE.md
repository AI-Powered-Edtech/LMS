# Migration 037 — duplicate prefix (do NOT rename)

**Status:** known historical duplicate. Both files apply cleanly to a fresh DB and to the dev DB at this commit.

**Why we keep them as-is:**
- Renaming a migration that is already recorded in `_sqlx_migrations` on dev/staging/prod will cause
  sqlx to think the renumbered migration has not been run, and re-running it will fail (idempotency only
  guaranteed for the original name+checksum).
- The two `037_*.sql` files target *different* objects, so there is no semantic conflict.

**Rule:**
- Future migrations MUST use the next free monotonically-increasing prefix (currently `076_`).
- Do not introduce another prefix collision; do not rename `037_*` files.
- If you need to fix something inside the existing 037 files, write a new migration (e.g. `076_fix_037_*.sql`) that performs the corrective DDL idempotently.

**Detection:** see `ls edusync-api/migrations/037_*.sql` — both should be tracked in `_sqlx_migrations` on every environment.
