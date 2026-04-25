# ADR-003 — Rapor PDF Renderer

**Status**: Accepted
**Date**: 2026-04-24
**Relates to**: 07-remaining-execution-plan.md U11 (Rapor PDF), Workstream E

## Context

Rapor (report card) is a legally-required artifact under Kurikulum Merdeka.
The rendered PDF is signed (digitally + physically), archived per academic
year, and distributed to parents. Constraints:

- **Layout fidelity matters**: schools have strict templates (header logo,
  school identity block, signature panel for wali kelas + kepsek, watermark).
- **Numerical content is structured**: subject rows, attendance summary,
  CP/TP scores, sikap rubric — all already living in `gradebook_entries`,
  `attendance_records`, `nilai_per_cp`, `rapor_kurmer` tables.
- **Volume is bursty**: end-of-semester everyone generates at once
  (~120 students × 14 subjects × 2 semesters in dev school; thousands in real
  deployments).
- **Authoring ownership**: templates will evolve per-tenant (school logo,
  motto, signature names). FE team owns visual ownership today; backend team
  owns data shape.

## Options considered

### Option 1 — Puppeteer / Headless Chromium sidecar (HTML → PDF)

Run a small Node sidecar (or in-process via `puppeteer-core`) that takes a
React-rendered HTML page (server-side rendered with same components used in
FE preview) and prints to PDF.

| Pros | Cons |
|---|---|
| Reuses existing FE components / Tailwind / print CSS — visual parity with on-screen `ReportPreview` is automatic | Heavy: ~150–250 MB resident memory per Chromium; needs process pool |
| Templates editable by FE team in TSX — fastest iteration | Cold-start ~1–2 s; needs a warm pool to keep p95 acceptable |
| `@page`, `page-break-inside`, watermarks, CSS grid all just work | Sidecar deployment surface (extra container, OOM watchdog) |
| Visual regression with Chromatic / Playwright screenshot already in repo | Fonts must be bundled in container image |

### Option 2 — Typst (Rust-native typesetting)

Compile Typst templates server-side from Rust. Templates are typst markup
authored separately from FE.

| Pros | Cons |
|---|---|
| Pure Rust, no separate runtime, sub-100 ms render | Template authored in Typst syntax — FE team must learn it; duplicate of HTML preview |
| Tiny memory footprint, scales linearly | Visual regression tooling immature for Typst |
| Deterministic output, easy to diff | School logo / signature image embedding needs work |
| | Mismatch risk between FE preview (HTML) and printed PDF (Typst) |

### Option 3 — `wkhtmltopdf`

| Pros | Cons |
|---|---|
| Single static binary | Upstream **archived / unmaintained** since 2023 — uses ancient WebKit |
| Works with HTML | No flexbox / grid / modern CSS — would force template rewrite |
| | Security posture poor; not suitable for new code |

### Option 4 — Hand-rolled `printpdf` / `pdf-rs`

| Pros | Cons |
|---|---|
| Pure Rust | Pixel-pushing layout work; weeks of effort per template |
| | Every template change is engineering, not design |

## Decision

**Adopt Option 1 — Puppeteer sidecar — for v1. Revisit Typst when/if memory
becomes a deployment blocker.**

Concrete shape:

- New tiny Node service `services/pdf-renderer/` (or a `bin/pdf-renderer.ts`
  invoked by the Rust backend over stdin/stdout for the POC). Keeps the FE
  React tree as the single source of truth for rapor visuals.
- The Rust backend (`api-server`) calls the renderer with `{template, data}`
  payload, gets PDF bytes back. Endpoint `POST /api/v1/pdf/rapor/:rapor_id`.
- Template lives at `src/features/rapor/print/RaporPrintable.tsx`. FE preview
  in browser uses the same component — guarantees parity.
- Renderer keeps a warm Chromium pool (size 2 in dev, 4–8 in prod, tunable).

## Why HTML over Typst, given the cost

The decision pivot is **template ownership**, not raw performance:

- The team already has `ReportPreview.tsx`, `ReportGenerator.tsx`, Tailwind
  print classes, and Chromatic visual snapshots. Throwing that away to
  re-author in Typst is a regression in iteration speed.
- "Schools want to tweak their template" is a known requirement (logo,
  signature names, motto). FE designers/teachers can tweak React + Tailwind.
  They cannot tweak Typst without engineering involvement.
- p95 latency target for rapor PDF is **measured in seconds, not ms** — it's
  generated once per student per semester, often async-queued. A 1–2 s render
  is acceptable.

## Memory / deployment plan

- POC: in-process or invoked-on-demand `puppeteer-core` from a Node helper.
  No pool. Fine for dev school 120 students.
- v1 ship: separate `pdf-renderer` container, internal HTTP endpoint, pool
  size = 2× CPU. OOM-killer with auto-restart. Per-render timeout 15 s.
- v2 (only if needed): introduce Typst path for high-volume bulk-generation
  workflows (kepsek "publish all rapor" button) while keeping Puppeteer for
  preview/individual generation.

## Rollback strategy

- Endpoint `POST /api/v1/pdf/rapor/:rapor_id` returns 503 with
  `{"error": "renderer_unavailable"}` if sidecar is down. FE shows existing
  HTML print fallback (browser's "Print → Save as PDF").
- Renderer service is **stateless**; restart cures any leak. No DB writes
  from renderer itself.
- If Puppeteer turns out to be untenable, swap to Typst in a single
  `services/pdf-renderer/` rewrite — the API contract
  `POST {template, data} -> bytes` stays identical.

## Visual regression strategy

- Existing Chromatic stories cover `ReportPreview` snapshots for the on-screen
  preview.
- Add Playwright PDF snapshot test in `tests/e2e/rapor-pdf.spec.ts`:
  generate PDF for a frozen-seed student → diff against committed
  `tests/fixtures/rapor-baseline.pdf` byte hash. On structural changes,
  manual re-baseline.
- **Do not** block CI on byte-identical PDF — fonts and Chromium versions
  drift. Block on structural assertions (text contains expected fields,
  page count, sections present) instead.

## Acceptance for E1 (this ADR)

- [x] Renderer chosen: Puppeteer sidecar
- [x] Template ownership decided: FE owns `RaporPrintable.tsx`
- [x] Rollback path defined
- [x] Memory budget called out
- [x] Visual regression strategy chosen

## Next units

- **E2 (POC)**: hardcoded sample data → `RaporPrintable.tsx` → PDF bytes
  via in-process Puppeteer. No DB. No endpoint.
- **E3 (endpoint)**: `POST /api/v1/pdf/rapor/:rapor_id` with RBAC shadow
  (wali_kelas/principal/admin). Reads from `rapor_kurmer` + joins.
- **F1 (signatures)**: state machine `DRAFT → guru_signed → wali_signed →
  kepsek_signed → published`. PDF watermark "DRAFT" until published.
