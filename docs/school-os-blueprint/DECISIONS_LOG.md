# Superbatch Decisions Log

This log captures **only** decisions the cloud agent made *outside* the authoritative list in `SUPERBATCH_CLOUD_AGENT.md` §2 — i.e. cases where no pre-approved answer existed but a conservative reversible default was applied (per design.md §Component 3, "Conservative default" bucket).

Authoritative decisions (Midtrans, Kurmer, in-house plagiarism, etc.) are NOT logged here — they live in the runbook. Hard-stop decisions are NOT logged here either — they go to escalation blocks in `DAILY_PROGRESS.md` and a GitHub issue.

Format: one entry per decision, newest at the bottom.

<!--
Sample entry:

## 2026-04-25 — Prio 1 Unit 3 — Hide unfinished `lti` admin tile rather than delete route
Reason: orphan-feature audit (gap-analysis §C item 7) gave three options (wire/delete/hide). Wiring requires LTI provider credentials we do not have. Deleting the route would break a deep link referenced in two existing tests (tests/e2e/admin.spec.ts:142, tests/e2e/lti.spec.ts:18). Hiding the tile is reversible and preserves the route. Operator can flip to delete later if confirmed unwanted.
-->

## 2026-04-24 — Prio 5 Unit 31 — Defer report_handlers stub-replacement to operator

Reason: report_handlers.rs and plagiarism_handlers.rs use `axum::{Json, State<Arc<AppState>>}` extractors directly, while existing stub mounts use the `vil_server::prelude::ServiceCtx + ShmSlice` pattern. Cross-mounting requires a small Axum-to-VIL adapter (or rewriting the handlers to the VIL signature). Without `cargo check` access in the agent's sandbox (per dev_env_quirks memory), attempting the swap risks a compile break that would block the entire backend. Schema for rapor_documents/rapor_signatures shipped (migration 053); stub mount swap deferred. Operator action: review `lti_handlers` mounting pattern (works because lti uses `axum::{Json, State}` too — see `main.rs:391`) and apply the same pattern to mount `export_report_handler` at `/api/v1/reports/export`, replacing `reports_export_create_stub_handler`. Same for plagiarism check.

## 2026-04-24 — Prio 1 Unit 3 — Orphan audit decisions

Per gap-analysis §C, five orphan items reviewed. Decisions:

1. **Plagiarism check trigger button** — DISABLED (PlagiarismCheckButton.tsx).
   Reason: backend mounts `plagiarism_check_stub_handler` (returns `similarity_score: 0` regardless of content). Enabling the button gives users false confidence ("0% kemiripan" toast) on an unchecked submission. Real wiring deferred to Prio 8 Unit 44 (in-house embedding similarity engine). Reversible: restore original onClick once route swaps to `plagiarism_handlers::check_plagiarism_handler`.

2. **PDF/CSV report exports (executive, parent, gradebook)** — STUB-DETECTION HELPER added (`src/utils/detectStubResponse.ts`).
   Reason: 4 FE call sites hit `/api/v1/pdf/executive-report`, `/api/v1/pdf/parent-report`, `/api/v1/reports/export`. Stub handlers return `{ stub: true, ... }` with placeholder shapes; FE silently no-ops or polls forever. Rather than hide every UI surface, the helper shows an explicit "fitur sedang dikembangkan" toast at the response boundary. Real wiring deferred to Prio 5 Unit 27–31 (rapor PDF + report_handlers.rs). Reversible: stub responses no longer include `stub: true` once real handlers are mounted, so the helper becomes a no-op naturally.

3. **AI tutor SSE stream stub** — KEEP AS IS.
   Reason: stub returns clean SSE start+done events; FE reader completes loop without errors. No false-safety. Real wiring is Prio 8 Unit 43 (Lesson Viewer Q&A tutor streaming).

4. **SCORM runtime telemetry stub** — KEEP AS IS.
   Reason: fire-and-forget beforeunload beacon. Stub 200 OK is harmless and prevents console errors. No user-facing impact.

5. **Quiz / XP Rust handlers (`quiz_handlers.rs`, `xp_gradebook_handlers.rs`)** — DEFERRED TO PRIO 1 UNIT 4.
   Reason: explicit ladder unit covers deletion of dual-path Rust handlers; no point doing it twice.

## 2026-04-24 — Operator: Skip migration 048 (gradebook_dual_mode)

Reason: migration 048 depends on `public.gradebook_entries` table which doesn't exist in `edusync-api/migrations/` or `edusync-api/schema/` anywhere — pre-existing baseline gap. Applied migrations 039-047 + 049-064 (24/25). Operator action deferred: either create gradebook_entries table first, or rewrite 048 to handle absence. Non-blocking for current sweep (all routes pass).

## 2026-04-24 — Operator: Stub→real mount swaps executed

Reason: DECISIONS_LOG §"Prio 5 Unit 31 — Defer stub-replacement" explicitly deferred these pending cargo build access. With operator access now available and cargo build green, the swaps were executed in main.rs:
- Line 452: `executive_report_stub_handler` → `executive_report_handler`
- Line 453: `parent_report_stub_handler` → `parent_report_handler`
- Line 457: `ai_tutor_stream_stub_handler` → `ai_tutor_stream_handler`

`ai_tutor_real.rs` rewritten from placeholder SSE stream to real delegation: calls `edusync_services::ai::tutor::tutor_chat` (which handles Groq + sessions + rate limits), then bridges the non-streaming `TutorChatResponse` to FE SSE format (single-chunk emission). Upgrading to token-by-token streaming requires refactoring `tutor_chat` — deferred.

## 2026-04-24 — Operator: `/api/v1/ai/embeddings` endpoint added

Reason: SUPERBATCH §5 noted `/api/v1/ai/embeddings` as required for plagiarism engine. Added `embeddings_handler.rs` that proxies to OpenAI `text-embedding-3-small`. Returns 500 with "OPENAI_API_KEY belum dikonfigurasi" when unset — FE `embeddingEngine.ts` already has graceful fallback for this case.

## 2026-04-24 — Operator: FE column mismatches fixed

Reason: sweep surfaced 400 errors where FE queries used column names not matching real DB:
- `ppdb_periods`: FE `starts_on/ends_on` → DB `start_date/end_date`
- `lti_platform_registrations`: FE `name/token_endpoint` → DB `platform_name/token_url`

Fix applied at FE side (not DB) because migrations reflect actual deployed schema; changing DB would require data migration.

## 2026-04-24 — Operator: `onboarding_progress` + `tenant_subscriptions` stub tables created

Reason: FE services query both tables extensively. Neither exists in baseline nor migrations 001-063. Migration 064 created minimal schemas; allowlist updated. FE's existing fallback logic (`LS_ONBOARDING_UNAVAILABLE` flag) handles empty results gracefully. Reversible: operator may later decide to formalize schema with proper columns.

## 2026-04-24 — U01 (migration 048 baseline gap) — RESOLVED

Reason: `gradebook_entries` + `gradebook_settings` tables missing from baseline & all earlier migrations. Migration 048 ALTER TABLE-d these assumed tables. Created migration **065_gradebook_baseline.sql** with full schemas inferred from FE usage (`src/features/gradebook/api/gradebookApi.ts` comments list columns: id, tenant_id, course_id, student_id, entity_type, entity_id, score, max_score, feedback, graded_by, graded_at, created_at, updated_at). Migration 048 now applies cleanly; dual-mode descriptor (BB/MB/BSH/SB) ready.

## 2026-04-24 — U02 (React dup-key warning) — INVESTIGATED, DEFERRED

Findings:
- UUID `257d53d2-0bae-44c1-9c23-470df60d9ed2` **NOT in any DB UUID column** (confirmed via exhaustive `information_schema.columns` scan of all uuid-typed columns)
- NOT from classroom dedup layer (already fixed), NOT from assignments (empty for teacher persona), NOT from courses (list empty), NOT from TeacherOnboardingWizard (warning persists when wizard disabled)
- Captured message args via console.error override: React only provides key string + no component stack in React 19
- Stack trace shows only React reconciler internals (`warnOnInvalidKey` @ `react-dom_client.js`), not user render
- Warning appears on teacher/dashboard only (adaptive-paths resolved this session)

Defer rationale: Non-crash warning. Accurate root-cause requires instrumenting `React.createElement` or Fiber tree — high-cost for non-blocking bug. Plan to retry when dev school has richer data (post-U05) — UUID likely comes from a data source that's empty in current thin seed.

## 2026-04-24 — U03 (baseline.sql audit) — RESOLVED with minor follow-ups

Finding: baseline drift is LESS severe than feared. DB has 174 tables, migrations define 178 (inclusive of `IF NOT EXISTS`). Diff analysis:
- Tables in DB but not in any migration file: **0** (no orphan/legacy tables)
- Tables in migrations but not yet applied to DB: **3** — `lti_user_links` (migration 005), `semantic_search_index` (migration 058, requires pgvector extension), `public` (false positive from regex)

Actions taken:
- Applied `005_create_lti_tables.sql` → `lti_user_links` created
- `semantic_search_index` deferred: lms-db-1 uses `postgres:16-alpine` without pgvector. Either swap to `pgvector/pgvector:pg16` image, or keep deferred until U25 (semantic search) kicks off.

Baseline is substantially complete. Point-in-time gaps (gradebook, semesters, onboarding_progress, tenant_subscriptions) were addressed via migrations 037, 064, 065. No systematic rebuild of baseline.sql needed.

## 2026-04-24 — U04 (reset-dev-school) — RESOLVED

Actions:
- `reset-dev-school.sh`: added host-psql-OR-docker-exec fallback (CI has psql; local dev runs through `lms-db-1` container)
- Post-reset invariants enforced: tenant count=1, siswa ≥100, user_roles ≥10 → script exits non-zero on drift
- Migration 066: `app_role` enum was missing `PRINCIPAL` + `PARENT` (present in profile/user_roles usage but not in migration 046 enum)
- Migration 067: `auto_add_modules_for_tenant()` trigger was not idempotent — BEFORE trigger fires on INSERT ATTEMPT even with outer ON CONFLICT DO NOTHING, causing UNIQUE violation on re-seed. Fixed with `ON CONFLICT (tenant_id, module_id) DO NOTHING` inside trigger body.
- `dev_seed.sql` fixes: `courses.instructor_id → created_by`, `announcements.author_id → created_by`, `announcements.body → content` — real schema drift vs seed assumption
