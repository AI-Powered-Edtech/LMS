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

## Cara membaca

- **Baru ikut**: 00 → 01 → 06 (pahami why + what next)
- **Engineer implementasi**: 02 → 03 → 04 → 06 (pahami current → gap → target → sequence)
- **Sekolah / sales**: 00 + 01 (value proposition)
- **Autonomous cloud agent**: [`SUPERBATCH_CLOUD_AGENT.md`](SUPERBATCH_CLOUD_AGENT.md) — self-contained runbook untuk agent jalan seharian tanpa supervision

## Status

Draft v1 — 2026-04-24. Disusun setelah screen sweep real-backend + inventory 42 modul.
Iterate: setiap dokumen punya section "Open questions" di bagian akhir.
