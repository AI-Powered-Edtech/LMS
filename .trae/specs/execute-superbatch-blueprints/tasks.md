# Tasks

- [x] Task 1: Prio 1 — Fase 0 completion (sisa dari 2026-04-24 batch)
  - [x] SubTask 1.1: Rebuild backend + apply migration 037 → verify sweep clean
  - [x] SubTask 1.2: Fix React dup-key teacher dashboard (investigasi live sweep, trace UUID source)
  - [x] SubTask 1.3: Orphan audit: per item di `03-gap-analysis.md` section C, decide & execute wire/delete/hide
  - [x] SubTask 1.4: Delete dual-path Rust handlers (quiz/xp yang tidak mounted)
  - [x] SubTask 1.5: Playwright sweep → CI workflow (`.github/workflows/sweep.yml`)
  - [x] SubTask 1.6: Accessibility audit top-20 screens (axe-core scan + fix)

- [x] Task 2: Prio 2 — Fase 0.5 Dev School Seeding
  - [x] SubTask 2.1: Write `edusync-api/schema/dev_seed.sql` dengan schema SMA Nusantara Dev
  - [x] SubTask 2.2: Script `edusync-api/scripts/reset-dev-school.sh`
  - [x] SubTask 2.3: Dokumentasi `docs/dev-school-accounts.md`
  - [x] SubTask 2.4: Extend `tests/e2e/sweep.spec.ts` dengan 6 persona tambahan
  - [x] SubTask 2.5: CI harian: reset + full sweep 9 persona

- [x] Task 3: Prio 3 — Fase 1 Academic Foundation
  - [x] SubTask 3.1: Implementasi `academic_years` table + RPC + admin UI
  - [x] SubTask 3.2: Refactor `semesters` link ke `academic_year_id`
  - [x] SubTask 3.3: Implementasi `grade_levels` (1-12)
  - [x] SubTask 3.4: Implementasi `rombel` table + CRUD
  - [x] SubTask 3.5: Implementasi `subjects` + `curriculum_items`
  - [x] SubTask 3.6: Implementasi `timetable_slots` + editor grid UI
  - [x] SubTask 3.7: Implementasi `student_dossier` + `staff_dossier`
  - [x] SubTask 3.8: RBAC refactor: 10-role matrix

- [x] Task 4: Prio 4 hingga Prio 9
  - [x] SubTask 4.1: Selesaikan Prio 4 - Fase 2 Kurmer Assessment
  - [x] SubTask 4.2: Selesaikan Prio 5 - Fase 3 Rapor
  - [x] SubTask 4.3: Selesaikan Prio 6 - Fase 4 Finance + PPDB
  - [x] SubTask 4.4: Selesaikan Prio 7 - Fase 5 Integrations
  - [x] SubTask 4.5: Selesaikan Prio 8 - Fase 6 AI Polish
  - [x] SubTask 4.6: Selesaikan Prio 9 - Fase 7 Non-functional

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3