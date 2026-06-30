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
- [018_fix_backend_schema_bugs.sql](edusync-api/migrations/018_fix_backend_schema_bugs.sql) - Fixes schema bugs
- [019_audit_fixes.sql](edusync-api/migrations/019_audit_fixes.sql) - Audit fixes
- [020_fix_rpc_signatures.sql](edusync-api/migrations/020_fix_rpc_signatures.sql) - RPC signature fixes
- [021_rpc_json.sql](edusync-api/migrations/021_rpc_json.sql) - RPC json
- [022_align_table_columns.sql](edusync-api/migrations/022_align_table_columns.sql) - Table column alignments
- [023_rpc_stubs.sql](edusync-api/migrations/023_rpc_stubs.sql) - RPC stubs
- [024_course_review_workflow.sql](edusync-api/migrations/024_course_review_workflow.sql) - Course review workflow
- [025_personal_and_multi_tenant.sql](edusync-api/migrations/025_personal_and_multi_tenant.sql) - Multi-tenant
- [026_join_code_and_slugify.sql](edusync-api/migrations/026_join_code_and_slugify.sql) - Join code slugify
- [027_p2_backlog.sql](edusync-api/migrations/027_p2_backlog.sql) - P2 backlog
- [028_p3_tenant_settings_and_roles.sql](edusync-api/migrations/028_p3_tenant_settings_and_roles.sql) - Tenant settings
- [029_add_admin_notification_types.sql](edusync-api/migrations/029_add_admin_notification_types.sql) - Admin notifications
- [030_admin_stub_tables_and_rpcs.sql](edusync-api/migrations/030_admin_stub_tables_and_rpcs.sql) - Admin stubs
- [031_qa_schema_gaps.sql](edusync-api/migrations/031_qa_schema_gaps.sql) - QA schema
- [032_qa_rpcs.sql](edusync-api/migrations/032_qa_rpcs.sql) - QA rpcs
- [033_fix_search_questions_return_json.sql](edusync-api/migrations/033_fix_search_questions_return_json.sql) - JSON fix
- [034_lesson_progress_monitor_rpc.sql](edusync-api/migrations/034_lesson_progress_monitor_rpc.sql) - Monitor RPC
- [035_admin_backfill.sql](edusync-api/migrations/035_admin_backfill.sql) - Admin backfill
- [036_confirm_demo_seed_users.sql](edusync-api/migrations/036_confirm_demo_seed_users.sql) - Confirm demo seed
- [037_qa_sweep_fixes.sql](edusync-api/migrations/037_qa_sweep_fixes.sql) - QA sweep
- [037_seed_modules_missing_rpcs_and_auth_uid.sql](edusync-api/migrations/037_seed_modules_missing_rpcs_and_auth_uid.sql) - Modules RPCs
- [038_fix_get_tenant_users_user_id_alias.sql](edusync-api/migrations/038_fix_get_tenant_users_user_id_alias.sql) - Tenant users fix
- [039_academic_years.sql](edusync-api/migrations/039_academic_years.sql) - Academic years
- [040_semesters_link_academic_year.sql](edusync-api/migrations/040_semesters_link_academic_year.sql) - Semesters
- [041_grade_levels.sql](edusync-api/migrations/041_grade_levels.sql) - Grade levels
- [042_rombel.sql](edusync-api/migrations/042_rombel.sql) - Rombel
- [043_subjects_and_curriculum_items.sql](edusync-api/migrations/043_subjects_and_curriculum_items.sql) - Subjects
- [044_timetable_slots.sql](edusync-api/migrations/044_timetable_slots.sql) - Timetable
- [045_dossiers.sql](edusync-api/migrations/045_dossiers.sql) - Dossiers
- [046_rbac_10_role_matrix.sql](edusync-api/migrations/046_rbac_10_role_matrix.sql) - RBAC
- [047_cp_tagging.sql](edusync-api/migrations/047_cp_tagging.sql) - CP Tagging
- [048_gradebook_dual_mode.sql](edusync-api/migrations/048_gradebook_dual_mode.sql) - Gradebook dual
- [049_nilai_per_cp.sql](edusync-api/migrations/049_nilai_per_cp.sql) - Nilai per CP
- [050_akm_question_type.sql](edusync-api/migrations/050_akm_question_type.sql) - AKM
- [051_p5_module.sql](edusync-api/migrations/051_p5_module.sql) - P5 module
- [052_domain_events_outbox.sql](edusync-api/migrations/052_domain_events_outbox.sql) - Events
- [053_rapor_kurmer.sql](edusync-api/migrations/053_rapor_kurmer.sql) - Rapor kurmer
- [054_finance_midtrans.sql](edusync-api/migrations/054_finance_midtrans.sql) - Midtrans
- [055_bos_expense_tracking.sql](edusync-api/migrations/055_bos_expense_tracking.sql) - BOS Expense
- [056_ppdb_flow.sql](edusync-api/migrations/056_ppdb_flow.sql) - PPDB flow
- [057_integrations.sql](edusync-api/migrations/057_integrations.sql) - Integrations
- [058_ai_polish.sql](edusync-api/migrations/058_ai_polish.sql) - AI Polish
- [059_audit_rate_limit_perf.sql](edusync-api/migrations/059_audit_rate_limit_perf.sql) - Rate limit perf
| 060_counseling_parent_links_sikap.sql | Parent links |
| 061_app_audit_triggers.sql | Audit triggers |
| 062_rapor_autogen_rpc.sql | Rapor autogen |
| 063_rombel_attendance.sql | Rombel attendance |
| 064_stub_tables.sql | Stub tables |
| 065_gradebook_baseline.sql | Gradebook baseline |
| 066_role_enum_completeness.sql | Role enum completeness |
| 067_idempotent_auto_modules.sql | Idempotent modules |
| 068_sync_user_roles_to_granular.sql | Sync user roles |
| 069_classes_rombel_id.sql | Classes rombel id |
| 070_event_handler_idempotency.sql | Event handler idempotency |
| 071_ai_rate_limit.sql | AI rate limit |
| 072_parent_invoices_rpc.sql | Parent invoices RPC |
| 073_refresh_tokens_session_metadata.sql | Refresh tokens |
| 074_tenant_invites_and_settings.sql | Tenant settings |
| 075_tenant_invites_global_unique_code.sql | Invite codes |
| 076_invalidate_refresh_tokens_post_rotation.sql | Invalidate tokens |
| 077_plagiarism_checks.sql | Plagiarism |
| 078_scorm_runtime_data.sql | SCORM data |
