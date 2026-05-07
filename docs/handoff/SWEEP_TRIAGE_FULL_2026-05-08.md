# Sweep triage — full (2026-05-08)

Regenerated from the codebase sweep on commit `76478f6e6`. Each kategori below lists 4 representative
issues ready to be filed as GitHub issues (titles + bodies suitable for `gh issue create`).

## Kategori 1 — Security & Secrets

### S1. Rotate JWT signing key on production
**Body:** JWT keys were purged from git history on 2026-05-07 (commit history rewrite, force-push to main).
The operator must replace `/etc/edusync/jwt-private.pem` and `/etc/edusync/jwt-public.pem` on every
running API host, restart `edusync-api`, then issue a global refresh-token invalidation. See
`docs/handoff/JWT_KEY_ROTATION_2026-05-07.md` for the full runbook. New SHA-256:
`5b610d8b96c5af84c1ae75b5b5e92d40e7c28c87176a8f06c3f84914a549d8ec`.

### S2. Address 2 dependabot moderate vulns on default branch
**Body:** Dependabot reports 2 moderate-severity advisories
(https://github.com/AI-Powered-Edtech/LMS/security/dependabot). Run `pnpm audit --prod`, identify the
offending packages, bump via `pnpm update <pkg>` or transitive override in `package.json` →
`pnpm.overrides`. Re-run `pnpm install` and `pnpm exec tsc --noEmit` after the bump.

### S3. Audit refresh_tokens table for stale rows post-JWT rotation
**Body:** After JWT rotation (S1), every issued refresh_token becomes invalid. Add a one-shot SQL job
(or write `076_invalidate_refresh_tokens_post_rotation.sql`) that sets all rows to revoked. Document
in `docs/handoff/JWT_KEY_ROTATION_2026-05-07.md`.

### S4. Remove forensic copies of jwt-*.pem from any worker images
**Body:** Confirm no Docker image, Ansible role, or backup volume still ships the previous JWT keypair.
Search `Dockerfile*`, `.github/workflows/*`, `docker-compose*.yml`, and operator runbooks. Replace any
baked-in keys with a runtime secret mount.

## Kategori 2 — Schema & Migrations

### M1. Document migration 037 duplicate prefix
**Body:** Two `037_*.sql` files exist. Already documented at `docs/handoff/MIGRATION_037_DUPLICATE.md`
— turn that doc into a CONTRIBUTING note + lint guard so new migrations cannot collide on prefix.

### M2. Document migration 010/011 numbering gap
**Body:** Slots 010 and 011 are intentionally empty. Already documented at
`docs/handoff/MIGRATION_GAPS_010_011.md` — wire this into `scripts/check-migration-sequence.sh` (TBD)
as a known exception list.

### M3. Migration 048 baseline coupling to 065 (gradebook_entries)
**Body:** Migration 048 was unblocked by 065. Add a regression test that runs migrations 001..n in order
against a clean Postgres, asserting each step exits 0. Catches future ordering hazards early.

### M4. Convert remaining raw `tuple` decoding to `#[derive(sqlx::FromRow)]`
**Body:** G2 (`ai_tutor_real.rs`) introduced `LessonRow`, `ProgressRow`, `SessionLookupRow` structs. Sweep
`edusync-api/crates/api-server/src/` for `query_as::<_, (...)>(` and replace with named structs for
readability + reduced bug surface.

## Kategori 3 — AI / Streaming

### A1. Smoke test `/api/v1/ai/tutor/stream` end-to-end
**Body:** With G2 landed (commit `e15c1a6ac`), a curl smoke test must run against a live API to confirm
token-by-token streaming. Steps in `docs/handoff/G2_SMOKE_TEST.md`. Block before declaring G2 "done".

### A2. Decommission `ai_tutor_stream_stub_handler` once A1 passes
**Body:** `crates/api-server/src/stub_handlers.rs:145` still defines a placeholder. Once smoke test
passes, remove the stub and any router fallback that points at it.

### A3. Add Prometheus counters around AI streaming
**Body:** Track `ai_tutor_stream_requests_total{status}` and `ai_tutor_tokens_emitted_total`. Required
before enabling stream globally (currently 50/hr/user via `ai_quota_usage`).

### A4. Hook AI stream into existing `ai_quota_usage` rate limiting bypass guard
**Body:** Current handler increments quota *after* stream completes. If the upstream Groq stream errors
mid-flight, the quota increment is lost. Move quota increment to a `tokio::spawn` background flush on
`done`/`error` so it always runs.

## Kategori 4 — Frontend / Rombel adapter

### F1. Smoke test rombel adapter behind `VITE_USE_ROMBEL_ADAPTER` flag
**Body:** B2 (`76478f6e6`) gates `getClassSectionStudents()` behind the flag (default true). Add a
Playwright test that toggles the flag and asserts the legacy classes path still renders correctly.

### F2. Migrate remaining `enrollments`-only queries to dual-source dispatch
**Body:** Identify other queries that hit `enrollments` directly and route them through the adapter so
the rombel cutover is consistent across features.

### F3. Add type narrowing to `ClassSection.source` consumers
**Body:** Discriminated union ('rombel' | 'classes') is set up; ensure every consumer exhaustively
handles both branches and that TypeScript `never` checks fail builds when a new source is added.

### F4. Document operator rollback for the rombel cutover
**Body:** If `rombel_*` reads regress in production, operator must flip
`VITE_USE_ROMBEL_ADAPTER=false` in the FE env and redeploy. Document the steps + verification queries
(`SELECT count(*) FROM rombel_members WHERE rombel_id = ?` etc.).

## Kategori 5 — Repo Hygiene & Build

### H1. Wire `pnpm exec tsc --noEmit` into CI (instead of `pnpm tsc`)
**Body:** The latter fails because no `tsc` script exists in package.json. Update GH Actions workflow
to use `pnpm exec tsc --noEmit`.

### H2. Reduce 45 cargo warnings on `edusync-api-server`
**Body:** All 45 warnings on commit `76478f6e6` are unused-import / dead-code noise. Run
`cargo fix --bin edusync-api-server` and review the patch; merge if no behavior changes.

### H3. Prune 100+ stale `bolt-*` and `aria-*` branches
**Body:** Remote branch list shows many auto-generated PR branches that have been merged or abandoned.
Write a one-shot `scripts/prune-merged-branches.sh` that deletes remote branches whose tip is reachable
from `origin/main`.

### H4. Verify `.gitignore` keeps node_modules + target out of any future commit
**Body:** Hardened in commit `18307df70`. Add a CI check that fails if `node_modules/` or `target/`
appears in `git ls-files`.
