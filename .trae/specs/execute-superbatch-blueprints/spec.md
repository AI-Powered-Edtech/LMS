# Execute Superbatch Blueprints Spec

## Why
User meminta untuk mengeksekusi semua blueprint dan plan yang ada secara otonom berdasarkan `docs/school-os-blueprint/SUPERBATCH_CLOUD_AGENT.md`. Tujuannya adalah untuk mentransformasi EduSync LMS menjadi Indonesia School OS dengan menyelesaikan semua fase yang dijadwalkan dari Fase 0 hingga Fase 7.

## What Changes
- Menjalankan urutan eksekusi (Priority ladder) dari Prio 1 (Fase 0) hingga Prio 9 (Fase 7).
- Rebuild backend, perbaikan error frontend, audit UI, dan pembuatan alur CI/CD.
- Menambahkan kapabilitas sesuai dokumen blueprint, termasuk pembuatan skema sekolah, akademik, rapor, integrasi pembayaran, dan integrasi AI.

## Impact
- Affected specs: Seluruh sistem EduSync LMS.
- Affected code: Frontend, Backend (Rust), Database, dan CI/CD (GitHub Actions).

## ADDED Requirements
### Requirement: Prio 1 - Fase 0 Completion
Sistem SHALL menyelesaikan tugas yang tersisa dari batch 2026-04-24, memperbaiki React dup-key, melakukan orphan audit, menghapus dual-path Rust handlers, membuat CI Playwright sweep, dan melakukan audit aksesibilitas.

### Requirement: Prio 2 - Fase 0.5 Dev School Seeding
Sistem SHALL memiliki dev school seeding untuk "SMA Nusantara Dev" dengan 9 persona lengkap untuk diuji di CI.

### Requirement: Prio 3 hingga 9
Sistem SHALL memiliki fondasi akademik, penilaian Kurmer, sistem Rapor, Keuangan & PPDB, Integrasi Dapodik, dan AI Polish sesuai blueprint.

## MODIFIED Requirements
- Menyesuaikan arsitektur yang ada untuk mendukung skema sekolah Indonesia dan kebutuhan multi-persona yang lebih kompleks.

## REMOVED Requirements
- Fitur dan fungsionalitas dummy/mock akan dihapus secara bertahap selama eksekusi.