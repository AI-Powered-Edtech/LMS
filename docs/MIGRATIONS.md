# Database Migrations

Dokumen ini mendaftarkan seluruh migration SQL pada `edusync-api/migrations/` beserta tujuan dan dependency-nya.

Migration dijalankan secara berurutan sesuai nomor prefix (`NNN_`). Gunakan `scripts/push-migrations.sh` untuk menerapkan migration ke database target, dan `scripts/validate-migrations.sh` untuk memvalidasi sintaks & dependency lokal sebelum push.

> Setiap migration baru **wajib** didaftarkan di tabel di bawah — kalau tidak, workflow `Validate Documentation` akan fail di CI.

---

## Daftar migration

| Migration file | Kategori | Ringkasan |
| --- | --- | --- |
| 001_create_users_table.sql | Schema | Membuat tabel inti `users` (identitas, role, tenant). Fondasi auth. |
| 002_auth_replacement_functions.sql | Auth | Fungsi-fungsi auth SECURITY DEFINER (signup, signin, token refresh) pengganti provider eksternal. |
| 003_invitations_and_memberships.sql | Schema | Tabel `invitations` dan `memberships` untuk onboarding tenant multi-role. |
| 004_create_ai_tutor_sessions.sql | Feature | Tabel sesi AI Tutor (histori percakapan, rate-limit per tenant). |
| 005_create_lti_tables.sql | Integration | Tabel LTI 1.3 (deployments, consumer keys, launches) untuk integrasi LMS eksternal. |
| 006_add_realtime_triggers.sql | Realtime | Trigger `NOTIFY` untuk change stream realtime (gradebook, notifications). |
| 007_add_storage_tracking.sql | Storage | Tabel/kolom pelacakan kuota storage per tenant untuk Files feature. |
| 008_tighten_rls_for_vil.sql | Security | Mengetatkan Row-Level Security (RLS) policy saat migrasi ke backend VIL. |
| 009_drop_rls.sql | Security | Menghapus RLS lama yang sudah tidak relevan setelah cutover VIL (RLS di-handle di application layer). |
| 012_video_transcoding_jobs.sql | Jobs | Tabel antrean transcoding video untuk konten pembelajaran. |
| 013_export_jobs.sql | Jobs | Tabel antrean export (laporan, gradebook CSV, bulk data) dengan status tracking. |
| 014_gradebook_realtime_triggers.sql | Realtime | Trigger realtime khusus untuk perubahan gradebook (grade, feedback). |
| 015_backend_heavy_tables.sql | Schema | Tabel-tabel besar backend (audit log, event stream, dsb.) yang di-offload dari frontend. |
| 016_add_performance_indexes.sql | Performance | Index tambahan untuk query panas (dashboard, leaderboard, gradebook). |
| 017_add_google_id_to_profiles.sql | Auth | Kolom `google_id` di `profiles` untuk Google OAuth single sign-on. |

> Gap pada nomor (misal 010, 011) adalah hasil revert/konsolidasi migration yang dibatalkan sebelum landing di `main`. Jangan reuse nomor tersebut untuk migration baru.

---

## Menambah migration baru

1. Buat file baru di `edusync-api/migrations/NNN_<nama_singkat>.sql` dengan nomor **lebih besar** dari migration terakhir.
2. Pastikan setiap fungsi `SECURITY DEFINER` disertai `SET search_path = public, pg_temp` (di-audit oleh `release-gate.yml` Security Gate).
3. Uji lokal:
   ```bash
   ./scripts/validate-migrations.sh
   ./scripts/push-migrations.sh  # ke database dev
   ```
4. Tambahkan baris baru di tabel *Daftar migration* di atas — gunakan nama file **persis** sama (termasuk prefix nomor dan `.sql`).
5. Commit migration + perubahan `docs/MIGRATIONS.md` dalam 1 PR.

---

## Validasi

Konsistensi antara daftar di atas dengan file fisik di `edusync-api/migrations/` divalidasi oleh `scripts/validate-docs.sh` (dipanggil workflow `Validate Documentation`). Jika Anda menambah migration tapi lupa mendaftarkannya di sini, CI akan gagal dengan pesan:

```
❌ ERROR: Migration SQL berikut belum didokumentasikan:
   - NNN_<nama_file>.sql
```

Lihat juga [`docs/DATABASE.md`](./DATABASE.md) untuk dokumentasi skema, RLS policy, dan indexing strategy.
| 018_fix_backend_schema_bugs.sql | Phase 4 fix | Fix backend schema bugs |
| 019_audit_fixes.sql | Phase 4 fix | Audit fixes |
| 020_fix_rpc_signatures.sql | Phase 4 fix | Fix RPC signatures |
| 021_rpc_json.sql | Phase 4 fix | RPC json support |
| 022_align_table_columns.sql | Phase 4 fix | Align table columns |
| 023_rpc_stubs.sql | Phase 4 fix | Add RPC stubs |
| 024_course_review_workflow.sql | Phase 4 fix | Add course review workflow |
| 025_personal_and_multi_tenant.sql | Phase 4 fix | Personal and multi tenant support |
| 026_join_code_and_slugify.sql | Phase 4 fix | Add join code and slugify |
| 027_p2_backlog.sql | Phase 4 fix | Phase 2 backlog |
| 028_p3_tenant_settings_and_roles.sql | Phase 4 fix | Phase 3 tenant settings and roles |
| 029_add_admin_notification_types.sql | Phase 4 fix | Add admin notification types |
| 030_admin_stub_tables_and_rpcs.sql | Phase 4 fix | Admin stub tables and RPCs |
| 031_qa_schema_gaps.sql | QA Fix | Address schema gaps for QA |
| 032_qa_rpcs.sql | QA Fix | Add missing RPCs for QA |
| 033_fix_search_questions_return_json.sql | QA Fix | Return JSON from search_questions |
| 034_lesson_progress_monitor_rpc.sql | Lesson Monitor | RPC for lesson progress monitoring |
| 035_admin_backfill.sql | Admin | Admin table backfills |
| 036_confirm_demo_seed_users.sql | Seed | Confirm seed demo users |
| 037_qa_sweep_fixes.sql | QA Fix | QA sweep fixes |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Seed Fix | Add missing RPCs and auth UUID for seed |
| 038_fix_get_tenant_users_user_id_alias.sql | Admin Fix | Fix alias in get_tenant_users |
| 039_academic_years.sql | Kurmer | Setup academic_years table |
| 040_semesters_link_academic_year.sql | Kurmer | Link semesters to academic_years |
| 041_grade_levels.sql | Kurmer | Setup grade_levels table |
| 042_rombel.sql | Kurmer | Setup rombel table |
| 043_subjects_and_curriculum_items.sql | Kurmer | Setup subjects and curriculum |
| 044_timetable_slots.sql | Kurmer | Setup timetable_slots |
| 045_dossiers.sql | Dossier | Setup dossiers table |
| 046_rbac_10_role_matrix.sql | RBAC | Role matrix updates |
| 047_cp_tagging.sql | Kurmer | Capaian Pembelajaran tagging |
| 048_gradebook_dual_mode.sql | Gradebook | Support dual mode in gradebook |
| 049_nilai_per_cp.sql | Gradebook | Nilai per CP support |
| 050_akm_question_type.sql | Quizzes | Add AKM question type |
| 051_p5_module.sql | P5 | Setup P5 module |
| 052_domain_events_outbox.sql | System | Domain events outbox pattern |
| 053_rapor_kurmer.sql | Rapor | Rapor Kurmer support |
| 054_finance_midtrans.sql | Finance | Midtrans integration |
| 055_bos_expense_tracking.sql | BOS | BOS expense tracking |
| 056_ppdb_flow.sql | PPDB | PPDB flow |
| 057_integrations.sql | Integrations | Platform integrations |
| 058_ai_polish.sql | AI | AI feature polish |
| 059_audit_rate_limit_perf.sql | System | Audit rate limit & performance |
| 060_counseling_parent_links_sikap.sql | Features | Counseling, parent links, sikap |
| 061_app_audit_triggers.sql | Audit | Application audit triggers |
| 062_rapor_autogen_rpc.sql | Rapor | Autogenerate Rapor RPC |
| 063_rombel_attendance.sql | Rombel | Rombel attendance |
| 064_stub_tables.sql | System | System stub tables |
| 065_gradebook_baseline.sql | Gradebook | Gradebook baseline updates |
| 066_role_enum_completeness.sql | RBAC | Role enum completeness |
| 067_idempotent_auto_modules.sql | System | Idempotent auto-modules |
| 068_sync_user_roles_to_granular.sql | RBAC | Sync user roles to granular roles |
| 069_classes_rombel_id.sql | Core | Classes rombel ID support |
| 070_event_handler_idempotency.sql | System | Event handler idempotency |
| 071_ai_rate_limit.sql | AI | AI rate limiting |
| 072_parent_invoices_rpc.sql | Parent | Invoices RPC |
| 073_refresh_tokens_session_metadata.sql | Auth | Refresh tokens and session metadata |
| 074_tenant_invites_and_settings.sql | Multi-tenant | Tenant invites and settings |
| 075_tenant_invites_global_unique_code.sql | Multi-tenant | Tenant invites global unique code |
| 076_invalidate_refresh_tokens_post_rotation.sql | Auth | Invalidate refresh tokens post rotation |
| 077_plagiarism_checks.sql | Plagiarism | Plagiarism checks |
| 078_scorm_runtime_data.sql | SCORM | SCORM runtime data |
