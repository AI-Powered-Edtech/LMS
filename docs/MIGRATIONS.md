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

| 018_fix_backend_schema_bugs | Bug fixes |
| 019_audit_fixes | Audit fixes |
| 020_fix_rpc_signatures | Fix RPC signatures |
| 021_rpc_json | RPC JSON support |
| 022_align_table_columns | Align table columns |
| 023_rpc_stubs | RPC stubs |
| 024_course_review_workflow | Course review workflow |
| 025_personal_and_multi_tenant | Multi tenant support |
| 026_join_code_and_slugify | Join code and slugify |
| 027_p2_backlog | P2 backlog |
| 028_p3_tenant_settings_and_roles | Tenant settings and roles |
| 029_add_admin_notification_types | Admin notifications |
| 030_admin_stub_tables_and_rpcs | Admin stubs |
| 031_qa_schema_gaps | QA schema gaps |
| 032_qa_rpcs | QA RPCs |
| 033_fix_search_questions_return_json | Fix search questions |
| 034_lesson_progress_monitor_rpc | Lesson progress monitor |
| 035_admin_backfill | Admin backfill |
| 036_confirm_demo_seed_users | Confirm demo users |
| 037_qa_sweep_fixes | QA sweep fixes |
| 037_seed_modules_missing_rpcs_and_auth_uid | Seed missing RPCs |
| 038_fix_get_tenant_users_user_id_alias | Fix tenant users |
| 039_academic_years | Academic years |
| 040_semesters_link_academic_year | Semesters link |
| 041_grade_levels | Grade levels |
| 042_rombel | Rombel |
| 043_subjects_and_curriculum_items | Subjects and curriculum |
| 044_timetable_slots | Timetable slots |
| 045_dossiers | Dossiers |
| 046_rbac_10_role_matrix | Role matrix |
| 047_cp_tagging | CP tagging |
| 048_gradebook_dual_mode | Gradebook dual mode |
| 049_nilai_per_cp | Nilai per CP |
| 050_akm_question_type | AKM question type |
| 051_p5_module | P5 module |
| 052_domain_events_outbox | Domain events outbox |
| 053_rapor_kurmer | Rapor kurmer |
| 054_finance_midtrans | Finance midtrans |
| 055_bos_expense_tracking | BOS expense tracking |
| 056_ppdb_flow | PPDB flow |
| 057_integrations | Integrations |
| 058_ai_polish | AI polish |
| 059_audit_rate_limit_perf | Audit rate limit |
| 060_counseling_parent_links_sikap | Counseling parent links |
| 061_app_audit_triggers | App audit triggers |
| 062_rapor_autogen_rpc | Rapor autogen RPC |
| 063_rombel_attendance | Rombel attendance |
| 064_stub_tables | Stub tables |
| 065_gradebook_baseline | Gradebook baseline |
| 066_role_enum_completeness | Role enum completeness |
| 067_idempotent_auto_modules | Idempotent auto modules |
| 068_sync_user_roles_to_granular | Sync user roles |
| 069_classes_rombel_id | Classes rombel id |
| 070_event_handler_idempotency | Event handler idempotency |
| 071_ai_rate_limit | AI rate limit |
| 072_parent_invoices_rpc | Parent invoices RPC |
| 073_refresh_tokens_session_metadata | Refresh tokens metadata |
| 074_tenant_invites_and_settings | Tenant invites |
| 075_tenant_invites_global_unique_code | Tenant invites global code |
| 076_invalidate_refresh_tokens_post_rotation | Invalidate refresh tokens |
| 077_plagiarism_checks | Plagiarism checks |
| 078_scorm_runtime_data | SCORM runtime data |
| 018_fix_backend_schema_bugs.sql | Bug fixes |
| 019_audit_fixes.sql | Audit fixes |
| 020_fix_rpc_signatures.sql | Fix RPC signatures |
| 021_rpc_json.sql | RPC JSON support |
| 022_align_table_columns.sql | Align table columns |
| 023_rpc_stubs.sql | RPC stubs |
| 024_course_review_workflow.sql | Course review workflow |
| 025_personal_and_multi_tenant.sql | Multi tenant support |
| 026_join_code_and_slugify.sql | Join code and slugify |
| 027_p2_backlog.sql | P2 backlog |
| 028_p3_tenant_settings_and_roles.sql | Tenant settings and roles |
| 029_add_admin_notification_types.sql | Admin notifications |
| 030_admin_stub_tables_and_rpcs.sql | Admin stubs |
| 031_qa_schema_gaps.sql | QA schema gaps |
| 032_qa_rpcs.sql | QA RPCs |
| 033_fix_search_questions_return_json.sql | Fix search questions |
| 034_lesson_progress_monitor_rpc.sql | Lesson progress monitor |
| 035_admin_backfill.sql | Admin backfill |
| 036_confirm_demo_seed_users.sql | Confirm demo users |
| 037_qa_sweep_fixes.sql | QA sweep fixes |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Seed missing RPCs |
| 038_fix_get_tenant_users_user_id_alias.sql | Fix tenant users |
| 039_academic_years.sql | Academic years |
| 040_semesters_link_academic_year.sql | Semesters link |
| 041_grade_levels.sql | Grade levels |
| 042_rombel.sql | Rombel |
| 043_subjects_and_curriculum_items.sql | Subjects and curriculum |
| 044_timetable_slots.sql | Timetable slots |
| 045_dossiers.sql | Dossiers |
| 046_rbac_10_role_matrix.sql | Role matrix |
| 047_cp_tagging.sql | CP tagging |
| 048_gradebook_dual_mode.sql | Gradebook dual mode |
| 049_nilai_per_cp.sql | Nilai per CP |
| 050_akm_question_type.sql | AKM question type |
| 051_p5_module.sql | P5 module |
| 052_domain_events_outbox.sql | Domain events outbox |
| 053_rapor_kurmer.sql | Rapor kurmer |
| 054_finance_midtrans.sql | Finance midtrans |
| 055_bos_expense_tracking.sql | BOS expense tracking |
| 056_ppdb_flow.sql | PPDB flow |
| 057_integrations.sql | Integrations |
| 058_ai_polish.sql | AI polish |
| 059_audit_rate_limit_perf.sql | Audit rate limit |
| 060_counseling_parent_links_sikap.sql | Counseling parent links |
| 061_app_audit_triggers.sql | App audit triggers |
| 062_rapor_autogen_rpc.sql | Rapor autogen RPC |
| 063_rombel_attendance.sql | Rombel attendance |
| 064_stub_tables.sql | Stub tables |
| 065_gradebook_baseline.sql | Gradebook baseline |
| 066_role_enum_completeness.sql | Role enum completeness |
| 067_idempotent_auto_modules.sql | Idempotent auto modules |
| 068_sync_user_roles_to_granular.sql | Sync user roles |
| 069_classes_rombel_id.sql | Classes rombel id |
| 070_event_handler_idempotency.sql | Event handler idempotency |
| 071_ai_rate_limit.sql | AI rate limit |
| 072_parent_invoices_rpc.sql | Parent invoices RPC |
| 073_refresh_tokens_session_metadata.sql | Refresh tokens metadata |
| 074_tenant_invites_and_settings.sql | Tenant invites |
| 075_tenant_invites_global_unique_code.sql | Tenant invites global code |
| 076_invalidate_refresh_tokens_post_rotation.sql | Invalidate refresh tokens |
| 077_plagiarism_checks.sql | Plagiarism checks |
| 078_scorm_runtime_data.sql | SCORM runtime data |
