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
- sql | 018_fix_backend_schema_bugs.sql | documented via script
- sql | 019_audit_fixes.sql | documented via script
- sql | 020_fix_rpc_signatures.sql | documented via script
- sql | 021_rpc_json.sql | documented via script
- sql | 022_align_table_columns.sql | documented via script
- sql | 023_rpc_stubs.sql | documented via script
- sql | 024_course_review_workflow.sql | documented via script
- sql | 025_personal_and_multi_tenant.sql | documented via script
- sql | 026_join_code_and_slugify.sql | documented via script
- sql | 027_p2_backlog.sql | documented via script
- sql | 028_p3_tenant_settings_and_roles.sql | documented via script
- sql | 029_add_admin_notification_types.sql | documented via script
- sql | 030_admin_stub_tables_and_rpcs.sql | documented via script
- sql | 031_qa_schema_gaps.sql | documented via script
- sql | 032_qa_rpcs.sql | documented via script
- sql | 033_fix_search_questions_return_json.sql | documented via script
- sql | 034_lesson_progress_monitor_rpc.sql | documented via script
- sql | 035_admin_backfill.sql | documented via script
- sql | 036_confirm_demo_seed_users.sql | documented via script
- sql | 037_qa_sweep_fixes.sql | documented via script
- sql | 037_seed_modules_missing_rpcs_and_auth_uid.sql | documented via script
- sql | 038_fix_get_tenant_users_user_id_alias.sql | documented via script
- sql | 039_academic_years.sql | documented via script
- sql | 040_semesters_link_academic_year.sql | documented via script
- sql | 041_grade_levels.sql | documented via script
- sql | 042_rombel.sql | documented via script
- sql | 043_subjects_and_curriculum_items.sql | documented via script
- sql | 044_timetable_slots.sql | documented via script
- sql | 045_dossiers.sql | documented via script
- sql | 046_rbac_10_role_matrix.sql | documented via script
- sql | 047_cp_tagging.sql | documented via script
- sql | 048_gradebook_dual_mode.sql | documented via script
- sql | 049_nilai_per_cp.sql | documented via script
- sql | 050_akm_question_type.sql | documented via script
- sql | 051_p5_module.sql | documented via script
- sql | 052_domain_events_outbox.sql | documented via script
- sql | 053_rapor_kurmer.sql | documented via script
- sql | 054_finance_midtrans.sql | documented via script
- sql | 055_bos_expense_tracking.sql | documented via script
- sql | 056_ppdb_flow.sql | documented via script
- sql | 057_integrations.sql | documented via script
- sql | 058_ai_polish.sql | documented via script
- sql | 059_audit_rate_limit_perf.sql | documented via script
- sql | 060_counseling_parent_links_sikap.sql | documented via script
- sql | 061_app_audit_triggers.sql | documented via script
- sql | 062_rapor_autogen_rpc.sql | documented via script
- sql | 063_rombel_attendance.sql | documented via script
- sql | 064_stub_tables.sql | documented via script
- sql | 065_gradebook_baseline.sql | documented via script
- sql | 066_role_enum_completeness.sql | documented via script
- sql | 067_idempotent_auto_modules.sql | documented via script
- sql | 068_sync_user_roles_to_granular.sql | documented via script
- sql | 069_classes_rombel_id.sql | documented via script
- sql | 070_event_handler_idempotency.sql | documented via script
- sql | 071_ai_rate_limit.sql | documented via script
- sql | 072_parent_invoices_rpc.sql | documented via script
- sql | 073_refresh_tokens_session_metadata.sql | documented via script
- sql | 074_tenant_invites_and_settings.sql | documented via script
- sql | 075_tenant_invites_global_unique_code.sql | documented via script
- sql | 076_invalidate_refresh_tokens_post_rotation.sql | documented via script
- sql | 077_plagiarism_checks.sql | documented via script
- sql | 078_scorm_runtime_data.sql | documented via script
