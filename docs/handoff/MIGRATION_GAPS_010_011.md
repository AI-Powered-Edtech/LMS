# Migration gap — slots 010 and 011 are intentionally empty

**Status:** intentional. Sequence jumps from `009_*` directly to `012_*`.

**Origin:** during the early schema sketch, two draft migrations were generated then dropped before any
environment ran them. The numbering was preserved (rather than backfilled) so commit history references
to migration numbers stay stable.

**Rule:**
- Do NOT create new migrations under prefixes `010_` or `011_` — that would confuse anyone reading the
  sequence as if those slots were always there.
- Always allocate the next free prefix at the tail of the sequence (currently `076_`).
- Tooling that asserts "no gaps" (e.g. some lint scripts) should be configured to allow the {010, 011}
  pair as a known exception.

**Verification:** `ls edusync-api/migrations/00[0-9]_*.sql edusync-api/migrations/01[0-9]_*.sql` should
show files for 001..009 and 012..019 (no 010, no 011).
