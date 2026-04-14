# Tasks

- [x] Task 1: Phase 1 - P0 Foundation: Standardisasi Environment dan Logging
  - [x] SubTask 1.1: Sinkronisasi `.env.example` dengan kebutuhan runtime frontend Supabase.
  - [x] SubTask 1.2: Implementasi logging policy dengan menghapus `console.log` sensitif dan menstandarkan log level (dev/stage/prod) menggunakan utilitas `logger`.
  - [x] SubTask 1.3: Review dan perbarui checklist rilis (release checklist v1) di `docs/deploy-checklist.md`.
- [x] Task 2: Phase 2 - Quality Engine: Automasi Pengujian
  - [x] SubTask 2.1: Tambahkan unit tests untuk mappers/types/services kritikal yang belum tercakup.
  - [x] SubTask 2.2: Tambahkan integration tests untuk auth context, tenant flow, dan role guard.
  - [x] SubTask 2.3: Pastikan 5 E2E smoke test (Login, Open lesson, Submit assignment, Teacher grading, Notification feedback loop) tersedia dan berjalan sukses.
- [x] Task 3: Phase 3 - Performance & Frontend Hardening
  - [x] SubTask 3.1: Terapkan route-based lazy loading untuk modul besar di frontend.
  - [x] SubTask 3.2: Konfigurasi manual chunk strategy di Vite (`vite.config.ts`).
  - [x] SubTask 3.3: Tambahkan skeleton/loading state yang konsisten dan offline fallback (UX resilience).
- [x] Task 4: Phase 4 - Security, Data, and Compliance Reinforcement
  - [x] SubTask 4.1: Tambahkan automated security checks (SQL/RPC) di pipeline migrasi.
  - [x] SubTask 4.2: Buat SOP rotasi secret dan kebijakan retensi audit logging.
- [x] Task 5: Phase 5 - SRE Readiness & Auto Rollback
  - [x] SubTask 5.1: Tambahkan skrip auto-rollback di GitHub Actions jika post-deploy health check gagal.
  - [x] SubTask 5.2: Definisikan SLO/SLI dan routing alerting (Sentry/Log monitoring).
  - [x] SubTask 5.3: Dokumentasikan hasil uji simulasi Disaster Recovery (DR Drill) untuk database backup-restore.

# Task Dependencies

- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 1]
- [Task 4] depends on [Task 1]
- [Task 5] depends on [Task 4]
