# pdf-renderer (POC — Workstream E2)

Tiny Node sidecar that turns a frozen HTML template into a PDF. Per ADR-003,
this is the v1 renderer for rapor (and later: ijazah, raport sisipan,
SK kelulusan). The Rust API server invokes `render.mjs` with a JSON payload
on stdin; the binary PDF comes back on stdout.

## Why this is separate from the FE bundle

- The FE preview (`ReportPreview.tsx`) is for on-screen review.
- This renderer is for the **archived, signed, distributed** PDF artifact.
- They share the same `RaporPrintable` React component (single source of truth
  for layout) but render contexts differ: FE = browser DOM, renderer =
  headless Chromium loading the same component compiled to a static page.

## Run locally

```sh
node services/pdf-renderer/render.mjs < sample-input.json > out.pdf
```

`sample-input.json` shape:

```json
{
  "template": "rapor-kurmer-v1",
  "data": { /* see samples/rapor-fixture.json */ }
}
```

## Production deployment

See ADR-003 §"Memory / deployment plan". TL;DR: separate container, internal
HTTP endpoint, Chromium pool size = 2× CPU.

## Acceptance for E2

- [x] `render.mjs` produces a valid PDF from `samples/rapor-fixture.json`
- [x] No DB dependency
- [x] Runtime ≤ 5 s on dev hardware for one rapor
