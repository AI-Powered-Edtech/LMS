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
| 018_fix_backend_schema_bugs.sql | (TBD) | |
| 019_audit_fixes.sql | (TBD) | |
| 020_fix_rpc_signatures.sql | (TBD) | |
| 021_rpc_json.sql | (TBD) | |
| 022_align_table_columns.sql | (TBD) | |
| 023_rpc_stubs.sql | (TBD) | |
| 024_course_review_workflow.sql | (TBD) | |
| 025_personal_and_multi_tenant.sql | (TBD) | |
| 026_join_code_and_slugify.sql | (TBD) | |
| 027_p2_backlog.sql | (TBD) | |
| 028_p3_tenant_settings_and_roles.sql | (TBD) | |
| 029_add_admin_notification_types.sql | (TBD) | |
| 030_admin_stub_tables_and_rpcs.sql | (TBD) | |
| 031_qa_schema_gaps.sql | (TBD) | |
| 032_qa_rpcs.sql | (TBD) | |
| 033_fix_search_questions_return_json.sql | (TBD) | |
| 034_lesson_progress_monitor_rpc.sql | (TBD) | |
| 035_admin_backfill.sql | (TBD) | |
| 036_confirm_demo_seed_users.sql | (TBD) | |
| 037_qa_sweep_fixes.sql | (TBD) | |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | (TBD) | |
| 038_fix_get_tenant_users_user_id_alias.sql | (TBD) | |
| 039_academic_years.sql | (TBD) | |
| 040_semesters_link_academic_year.sql | (TBD) | |
| 041_grade_levels.sql | (TBD) | |
| 042_rombel.sql | (TBD) | |
| 043_subjects_and_curriculum_items.sql | (TBD) | |
| 044_timetable_slots.sql | (TBD) | |
| 045_dossiers.sql | (TBD) | |
| 046_rbac_10_role_matrix.sql | (TBD) | |
| 047_cp_tagging.sql | (TBD) | |
| 048_gradebook_dual_mode.sql | (TBD) | |
| 049_nilai_per_cp.sql | (TBD) | |
| 050_akm_question_type.sql | (TBD) | |
| 051_p5_module.sql | (TBD) | |
| 052_domain_events_outbox.sql | (TBD) | |
| 053_rapor_kurmer.sql | (TBD) | |
| 054_finance_midtrans.sql | (TBD) | |
| 055_bos_expense_tracking.sql | (TBD) | |
| 056_ppdb_flow.sql | (TBD) | |
| 057_integrations.sql | (TBD) | |
| 058_ai_polish.sql | (TBD) | |
| 059_audit_rate_limit_perf.sql | (TBD) | |
| 060_counseling_parent_links_sikap.sql | (TBD) | |
| 061_app_audit_triggers.sql | (TBD) | |
| 062_rapor_autogen_rpc.sql | (TBD) | |
| 063_rombel_attendance.sql | (TBD) | |
| 064_stub_tables.sql | (TBD) | |
| 065_gradebook_baseline.sql | (TBD) | |
| 066_role_enum_completeness.sql | (TBD) | |
| 067_idempotent_auto_modules.sql | (TBD) | |
| 068_sync_user_roles_to_granular.sql | (TBD) | |
| 069_classes_rombel_id.sql | (TBD) | |
| 070_event_handler_idempotency.sql | (TBD) | |
| 071_ai_rate_limit.sql | (TBD) | |
| 072_parent_invoices_rpc.sql | (TBD) | |
| 073_refresh_tokens_session_metadata.sql | (TBD) | |
| 074_tenant_invites_and_settings.sql | (TBD) | |
| 075_tenant_invites_global_unique_code.sql | (TBD) | |
| 076_invalidate_refresh_tokens_post_rotation.sql | (TBD) | |
| 077_plagiarism_checks.sql | (TBD) | |
| 078_scorm_runtime_data.sql | (TBD) | |
