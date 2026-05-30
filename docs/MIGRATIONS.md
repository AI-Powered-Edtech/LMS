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
| 018_fix_backend_schema_bugs.sql | undocumented | undocumented |
| 019_audit_fixes.sql | undocumented | undocumented |
| 020_fix_rpc_signatures.sql | undocumented | undocumented |
| 021_rpc_json.sql | undocumented | undocumented |
| 022_align_table_columns.sql | undocumented | undocumented |
| 023_rpc_stubs.sql | undocumented | undocumented |
| 024_course_review_workflow.sql | undocumented | undocumented |
| 025_personal_and_multi_tenant.sql | undocumented | undocumented |
| 026_join_code_and_slugify.sql | undocumented | undocumented |
| 027_p2_backlog.sql | undocumented | undocumented |
| 028_p3_tenant_settings_and_roles.sql | undocumented | undocumented |
| 029_add_admin_notification_types.sql | undocumented | undocumented |
| 030_admin_stub_tables_and_rpcs.sql | undocumented | undocumented |
| 031_qa_schema_gaps.sql | undocumented | undocumented |
| 032_qa_rpcs.sql | undocumented | undocumented |
| 033_fix_search_questions_return_json.sql | undocumented | undocumented |
| 034_lesson_progress_monitor_rpc.sql | undocumented | undocumented |
| 035_admin_backfill.sql | undocumented | undocumented |
| 036_confirm_demo_seed_users.sql | undocumented | undocumented |
| 037_qa_sweep_fixes.sql | undocumented | undocumented |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | undocumented | undocumented |
| 038_fix_get_tenant_users_user_id_alias.sql | undocumented | undocumented |
| 039_academic_years.sql | undocumented | undocumented |
| 040_semesters_link_academic_year.sql | undocumented | undocumented |
| 041_grade_levels.sql | undocumented | undocumented |
| 042_rombel.sql | undocumented | undocumented |
| 043_subjects_and_curriculum_items.sql | undocumented | undocumented |
| 044_timetable_slots.sql | undocumented | undocumented |
| 045_dossiers.sql | undocumented | undocumented |
| 046_rbac_10_role_matrix.sql | undocumented | undocumented |
| 047_cp_tagging.sql | undocumented | undocumented |
| 048_gradebook_dual_mode.sql | undocumented | undocumented |
| 049_nilai_per_cp.sql | undocumented | undocumented |
| 050_akm_question_type.sql | undocumented | undocumented |
| 051_p5_module.sql | undocumented | undocumented |
| 052_domain_events_outbox.sql | undocumented | undocumented |
| 053_rapor_kurmer.sql | undocumented | undocumented |
| 054_finance_midtrans.sql | undocumented | undocumented |
| 055_bos_expense_tracking.sql | undocumented | undocumented |
| 056_ppdb_flow.sql | undocumented | undocumented |
| 057_integrations.sql | undocumented | undocumented |
| 058_ai_polish.sql | undocumented | undocumented |
| 059_audit_rate_limit_perf.sql | undocumented | undocumented |
| 060_counseling_parent_links_sikap.sql | undocumented | undocumented |
| 061_app_audit_triggers.sql | undocumented | undocumented |
| 062_rapor_autogen_rpc.sql | undocumented | undocumented |
| 063_rombel_attendance.sql | undocumented | undocumented |
| 064_stub_tables.sql | undocumented | undocumented |
| 065_gradebook_baseline.sql | undocumented | undocumented |
| 066_role_enum_completeness.sql | undocumented | undocumented |
| 067_idempotent_auto_modules.sql | undocumented | undocumented |
| 068_sync_user_roles_to_granular.sql | undocumented | undocumented |
| 069_classes_rombel_id.sql | undocumented | undocumented |
| 070_event_handler_idempotency.sql | undocumented | undocumented |
| 071_ai_rate_limit.sql | undocumented | undocumented |
| 072_parent_invoices_rpc.sql | undocumented | undocumented |
| 073_refresh_tokens_session_metadata.sql | undocumented | undocumented |
| 074_tenant_invites_and_settings.sql | undocumented | undocumented |
| 075_tenant_invites_global_unique_code.sql | undocumented | undocumented |
| 076_invalidate_refresh_tokens_post_rotation.sql | undocumented | undocumented |
| 077_plagiarism_checks.sql | undocumented | undocumented |
| 078_scorm_runtime_data.sql | undocumented | undocumented |

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
