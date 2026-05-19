# Database Migrations

Dokumen ini mendaftarkan seluruh migration SQL pada `edusync-api/migrations/` beserta tujuan dan dependency-nya.

Migration dijalankan secara berurutan sesuai nomor prefix (`NNN_`). Gunakan `scripts/push-migrations.sh` untuk menerapkan migration ke database target, dan `scripts/validate-migrations.sh` untuk memvalidasi sintaks & dependency lokal sebelum push.

> Setiap migration baru **wajib** didaftarkan di tabel di bawah — kalau tidak, workflow `Validate Documentation` akan fail di CI.

---

## Daftar migration

| Migration file | Kategori | Ringkasan |
| --- | --- | --- |
| 001_create_users_table.sql | Undocumented | Placeholder |
| 002_auth_replacement_functions.sql | Undocumented | Placeholder |
| 003_invitations_and_memberships.sql | Undocumented | Placeholder |
| 004_create_ai_tutor_sessions.sql | Undocumented | Placeholder |
| 005_create_lti_tables.sql | Undocumented | Placeholder |
| 006_add_realtime_triggers.sql | Undocumented | Placeholder |
| 007_add_storage_tracking.sql | Undocumented | Placeholder |
| 008_tighten_rls_for_vil.sql | Undocumented | Placeholder |
| 009_drop_rls.sql | Undocumented | Placeholder |
| 012_video_transcoding_jobs.sql | Undocumented | Placeholder |
| 013_export_jobs.sql | Undocumented | Placeholder |
| 014_gradebook_realtime_triggers.sql | Undocumented | Placeholder |
| 015_backend_heavy_tables.sql | Undocumented | Placeholder |
| 016_add_performance_indexes.sql | Undocumented | Placeholder |
| 017_add_google_id_to_profiles.sql | Undocumented | Placeholder |
| 018_fix_backend_schema_bugs.sql | Undocumented | Placeholder |
| 019_audit_fixes.sql | Undocumented | Placeholder |
| 020_fix_rpc_signatures.sql | Undocumented | Placeholder |
| 021_rpc_json.sql | Undocumented | Placeholder |
| 022_align_table_columns.sql | Undocumented | Placeholder |
| 023_rpc_stubs.sql | Undocumented | Placeholder |
| 024_course_review_workflow.sql | Undocumented | Placeholder |
| 025_personal_and_multi_tenant.sql | Undocumented | Placeholder |
| 026_join_code_and_slugify.sql | Undocumented | Placeholder |
| 027_p2_backlog.sql | Undocumented | Placeholder |
| 028_p3_tenant_settings_and_roles.sql | Undocumented | Placeholder |
| 029_add_admin_notification_types.sql | Undocumented | Placeholder |
| 030_admin_stub_tables_and_rpcs.sql | Undocumented | Placeholder |
| 031_qa_schema_gaps.sql | Undocumented | Placeholder |
| 032_qa_rpcs.sql | Undocumented | Placeholder |
| 033_fix_search_questions_return_json.sql | Undocumented | Placeholder |
| 034_lesson_progress_monitor_rpc.sql | Undocumented | Placeholder |
| 035_admin_backfill.sql | Undocumented | Placeholder |
| 036_confirm_demo_seed_users.sql | Undocumented | Placeholder |
| 037_qa_sweep_fixes.sql | Undocumented | Placeholder |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Undocumented | Placeholder |
| 038_fix_get_tenant_users_user_id_alias.sql | Undocumented | Placeholder |
| 039_academic_years.sql | Undocumented | Placeholder |
| 040_semesters_link_academic_year.sql | Undocumented | Placeholder |
| 041_grade_levels.sql | Undocumented | Placeholder |
| 042_rombel.sql | Undocumented | Placeholder |
| 043_subjects_and_curriculum_items.sql | Undocumented | Placeholder |
| 044_timetable_slots.sql | Undocumented | Placeholder |
| 045_dossiers.sql | Undocumented | Placeholder |
| 046_rbac_10_role_matrix.sql | Undocumented | Placeholder |
| 047_cp_tagging.sql | Undocumented | Placeholder |
| 048_gradebook_dual_mode.sql | Undocumented | Placeholder |
| 049_nilai_per_cp.sql | Undocumented | Placeholder |
| 050_akm_question_type.sql | Undocumented | Placeholder |
| 051_p5_module.sql | Undocumented | Placeholder |
| 052_domain_events_outbox.sql | Undocumented | Placeholder |
| 053_rapor_kurmer.sql | Undocumented | Placeholder |
| 054_finance_midtrans.sql | Undocumented | Placeholder |
| 055_bos_expense_tracking.sql | Undocumented | Placeholder |
| 056_ppdb_flow.sql | Undocumented | Placeholder |
| 057_integrations.sql | Undocumented | Placeholder |
| 058_ai_polish.sql | Undocumented | Placeholder |
| 059_audit_rate_limit_perf.sql | Undocumented | Placeholder |
| 060_counseling_parent_links_sikap.sql | Undocumented | Placeholder |
| 061_app_audit_triggers.sql | Undocumented | Placeholder |
| 062_rapor_autogen_rpc.sql | Undocumented | Placeholder |
| 063_rombel_attendance.sql | Undocumented | Placeholder |
| 064_stub_tables.sql | Undocumented | Placeholder |
| 065_gradebook_baseline.sql | Undocumented | Placeholder |
| 066_role_enum_completeness.sql | Undocumented | Placeholder |
| 067_idempotent_auto_modules.sql | Undocumented | Placeholder |
| 068_sync_user_roles_to_granular.sql | Undocumented | Placeholder |
| 069_classes_rombel_id.sql | Undocumented | Placeholder |
| 070_event_handler_idempotency.sql | Undocumented | Placeholder |
| 071_ai_rate_limit.sql | Undocumented | Placeholder |
| 072_parent_invoices_rpc.sql | Undocumented | Placeholder |
| 073_refresh_tokens_session_metadata.sql | Undocumented | Placeholder |
| 074_tenant_invites_and_settings.sql | Undocumented | Placeholder |
| 075_tenant_invites_global_unique_code.sql | Undocumented | Placeholder |
| 076_invalidate_refresh_tokens_post_rotation.sql | Undocumented | Placeholder |
| 077_plagiarism_checks.sql | Undocumented | Placeholder |
| 078_scorm_runtime_data.sql | Undocumented | Placeholder |
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
| 001_create_users_table.sql | | |
| 002_auth_replacement_functions.sql | | |
| 003_invitations_and_memberships.sql | | |
| 004_create_ai_tutor_sessions.sql | | |
| 005_create_lti_tables.sql | | |
| 006_add_realtime_triggers.sql | | |
| 007_add_storage_tracking.sql | | |
| 008_tighten_rls_for_vil.sql | | |
| 009_drop_rls.sql | | |
| 012_video_transcoding_jobs.sql | | |
| 013_export_jobs.sql | | |
| 014_gradebook_realtime_triggers.sql | | |
| 015_backend_heavy_tables.sql | | |
| 016_add_performance_indexes.sql | | |
| 017_add_google_id_to_profiles.sql | | |
| 018_fix_backend_schema_bugs.sql | | |
| 019_audit_fixes.sql | | |
| 020_fix_rpc_signatures.sql | | |
| 021_rpc_json.sql | | |
| 022_align_table_columns.sql | | |
| 023_rpc_stubs.sql | | |
| 024_course_review_workflow.sql | | |
| 025_personal_and_multi_tenant.sql | | |
| 026_join_code_and_slugify.sql | | |
| 027_p2_backlog.sql | | |
| 028_p3_tenant_settings_and_roles.sql | | |
| 029_add_admin_notification_types.sql | | |
| 030_admin_stub_tables_and_rpcs.sql | | |
| 031_qa_schema_gaps.sql | | |
| 032_qa_rpcs.sql | | |
| 033_fix_search_questions_return_json.sql | | |
| 034_lesson_progress_monitor_rpc.sql | | |
| 035_admin_backfill.sql | | |
| 036_confirm_demo_seed_users.sql | | |
| 037_qa_sweep_fixes.sql | | |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | | |
| 038_fix_get_tenant_users_user_id_alias.sql | | |
| 039_academic_years.sql | | |
| 040_semesters_link_academic_year.sql | | |
| 041_grade_levels.sql | | |
| 042_rombel.sql | | |
| 043_subjects_and_curriculum_items.sql | | |
| 044_timetable_slots.sql | | |
| 045_dossiers.sql | | |
| 046_rbac_10_role_matrix.sql | | |
| 047_cp_tagging.sql | | |
| 048_gradebook_dual_mode.sql | | |
| 049_nilai_per_cp.sql | | |
| 050_akm_question_type.sql | | |
| 051_p5_module.sql | | |
| 052_domain_events_outbox.sql | | |
| 053_rapor_kurmer.sql | | |
| 054_finance_midtrans.sql | | |
| 055_bos_expense_tracking.sql | | |
| 056_ppdb_flow.sql | | |
| 057_integrations.sql | | |
| 058_ai_polish.sql | | |
| 059_audit_rate_limit_perf.sql | | |
| 060_counseling_parent_links_sikap.sql | | |
| 061_app_audit_triggers.sql | | |
| 062_rapor_autogen_rpc.sql | | |
| 063_rombel_attendance.sql | | |
| 064_stub_tables.sql | | |
| 065_gradebook_baseline.sql | | |
| 066_role_enum_completeness.sql | | |
| 067_idempotent_auto_modules.sql | | |
| 068_sync_user_roles_to_granular.sql | | |
| 069_classes_rombel_id.sql | | |
| 070_event_handler_idempotency.sql | | |
| 071_ai_rate_limit.sql | | |
| 072_parent_invoices_rpc.sql | | |
| 073_refresh_tokens_session_metadata.sql | | |
| 074_tenant_invites_and_settings.sql | | |
| 075_tenant_invites_global_unique_code.sql | | |
| 076_invalidate_refresh_tokens_post_rotation.sql | | |
| 077_plagiarism_checks.sql | | |
| 078_scorm_runtime_data.sql | | |
