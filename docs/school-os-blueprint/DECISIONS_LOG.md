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
