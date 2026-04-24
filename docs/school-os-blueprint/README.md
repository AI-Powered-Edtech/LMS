# EduSync School OS — Blueprint & Implementation Plan

Foundational documents yang memetakan transformasi EduSync LMS dari kumpulan fitur menjadi **School Operating System** terintegrasi untuk sekolah Indonesia.

## Dokumen

| # | File | Isi | Audience |
|---|---|---|---|
| 00 | [vision.md](00-vision.md) | Apa "School OS", positioning, prinsip desain, non-goals | PM, leadership |
| 01 | [indonesia-context.md](01-indonesia-context.md) | Konteks operasional sekolah ID: Kurmer, Dapodik, Rapor, PPDB, SPP/BOS, AKM/ANBK | Semua |
| 02 | [current-inventory.md](02-current-inventory.md) | Audit 42 modul existing: status (FULL/PARTIAL/STUB), integrasi, file path | Eng |
| 03 | [gap-analysis.md](03-gap-analysis.md) | Gap antara existing vs target Indonesia School OS; silo & orphan | PM, Eng |
| 04 | [target-architecture.md](04-target-architecture.md) | Domain model, module boundaries, integration contracts (event bus, shared entities) | Eng, architect |
| 05 | [ai-capabilities.md](05-ai-capabilities.md) | Peta kapabilitas AI: existing, missing, guardrails, data pipeline | Eng, AI lead |
| 06 | [roadmap.md](06-roadmap.md) | Roadmap 4 kuartal: milestone, dependency, acceptance criteria | PM, leadership |
| 07 | [remaining-execution-plan.md](07-remaining-execution-plan.md) | **Sisa pekerjaan** post-superbatch: 33 unit U01-U33 (P0-P3), dependency graph, 6-week sequence, batch groupings | Operator, next cloud agent |

Plus (living log):
- [`DAILY_PROGRESS.md`](DAILY_PROGRESS.md) — timeline eksekusi
- [`DECISIONS_LOG.md`](DECISIONS_LOG.md) — keputusan di luar authoritative list
- [`FLAKY_TESTS.md`](FLAKY_TESTS.md) — register flaky tests
- [`SUPERBATCH_CLOUD_AGENT.md`](SUPERBATCH_CLOUD_AGENT.md) — runbook autonomous agent (post-superbatch: revised)

## Cara membaca

- **Baru ikut**: 00 → 01 → 06 (pahami why + what next)
- **Engineer implementasi**: 02 → 03 → 04 → **07** (pahami current → gap → target → execute)
- **Operator / cloud agent next session**: **07 = start here**, lalu `DAILY_PROGRESS.md` + `DECISIONS_LOG.md`
- **Sekolah / sales**: 00 + 01 (value proposition)

## Status

Draft v1 — 2026-04-24. Disusun setelah screen sweep real-backend + inventory 42 modul.
Iterate: setiap dokumen punya section "Open questions" di bagian akhir.
