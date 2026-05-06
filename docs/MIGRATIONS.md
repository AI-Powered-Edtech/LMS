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
| 018_fix_backend_schema_bugs.sql | Pending | Pendokumentasian otomatis |
| 019_audit_fixes.sql | Pending | Pendokumentasian otomatis |
| 020_fix_rpc_signatures.sql | Pending | Pendokumentasian otomatis |
| 021_rpc_json.sql | Pending | Pendokumentasian otomatis |
| 022_align_table_columns.sql | Pending | Pendokumentasian otomatis |
| 023_rpc_stubs.sql | Pending | Pendokumentasian otomatis |
| 024_course_review_workflow.sql | Pending | Pendokumentasian otomatis |
| 025_personal_and_multi_tenant.sql | Pending | Pendokumentasian otomatis |
| 026_join_code_and_slugify.sql | Pending | Pendokumentasian otomatis |
| 027_p2_backlog.sql | Pending | Pendokumentasian otomatis |
| 028_p3_tenant_settings_and_roles.sql | Pending | Pendokumentasian otomatis |
| 029_add_admin_notification_types.sql | Pending | Pendokumentasian otomatis |
| 030_admin_stub_tables_and_rpcs.sql | Pending | Pendokumentasian otomatis |
| 031_qa_schema_gaps.sql | Pending | Pendokumentasian otomatis |
| 032_qa_rpcs.sql | Pending | Pendokumentasian otomatis |
| 033_fix_search_questions_return_json.sql | Pending | Pendokumentasian otomatis |
| 034_lesson_progress_monitor_rpc.sql | Pending | Pendokumentasian otomatis |
| 035_admin_backfill.sql | Pending | Pendokumentasian otomatis |
| 036_confirm_demo_seed_users.sql | Pending | Pendokumentasian otomatis |
| 037_qa_sweep_fixes.sql | Pending | Pendokumentasian otomatis |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Pending | Pendokumentasian otomatis |
| 038_fix_get_tenant_users_user_id_alias.sql | Pending | Pendokumentasian otomatis |
| 039_academic_years.sql | Pending | Pendokumentasian otomatis |
| 040_semesters_link_academic_year.sql | Pending | Pendokumentasian otomatis |
| 041_grade_levels.sql | Pending | Pendokumentasian otomatis |
| 042_rombel.sql | Pending | Pendokumentasian otomatis |
| 043_subjects_and_curriculum_items.sql | Pending | Pendokumentasian otomatis |
| 044_timetable_slots.sql | Pending | Pendokumentasian otomatis |
| 045_dossiers.sql | Pending | Pendokumentasian otomatis |
| 046_rbac_10_role_matrix.sql | Pending | Pendokumentasian otomatis |
| 047_cp_tagging.sql | Pending | Pendokumentasian otomatis |
| 048_gradebook_dual_mode.sql | Pending | Pendokumentasian otomatis |
| 049_nilai_per_cp.sql | Pending | Pendokumentasian otomatis |
| 050_akm_question_type.sql | Pending | Pendokumentasian otomatis |
| 051_p5_module.sql | Pending | Pendokumentasian otomatis |
| 052_domain_events_outbox.sql | Pending | Pendokumentasian otomatis |
| 053_rapor_kurmer.sql | Pending | Pendokumentasian otomatis |
| 054_finance_midtrans.sql | Pending | Pendokumentasian otomatis |
| 055_bos_expense_tracking.sql | Pending | Pendokumentasian otomatis |
| 056_ppdb_flow.sql | Pending | Pendokumentasian otomatis |
| 057_integrations.sql | Pending | Pendokumentasian otomatis |
| 058_ai_polish.sql | Pending | Pendokumentasian otomatis |
| 059_audit_rate_limit_perf.sql | Pending | Pendokumentasian otomatis |
| 060_counseling_parent_links_sikap.sql | Pending | Pendokumentasian otomatis |
| 061_app_audit_triggers.sql | Pending | Pendokumentasian otomatis |
| 062_rapor_autogen_rpc.sql | Pending | Pendokumentasian otomatis |
| 063_rombel_attendance.sql | Pending | Pendokumentasian otomatis |
| 064_stub_tables.sql | Pending | Pendokumentasian otomatis |
| 065_gradebook_baseline.sql | Pending | Pendokumentasian otomatis |
| 066_role_enum_completeness.sql | Pending | Pendokumentasian otomatis |
| 067_idempotent_auto_modules.sql | Pending | Pendokumentasian otomatis |
| 068_sync_user_roles_to_granular.sql | Pending | Pendokumentasian otomatis |
| 069_classes_rombel_id.sql | Pending | Pendokumentasian otomatis |
| 070_event_handler_idempotency.sql | Pending | Pendokumentasian otomatis |
| 071_ai_rate_limit.sql | Pending | Pendokumentasian otomatis |
| 072_parent_invoices_rpc.sql | Pending | Pendokumentasian otomatis |
| 073_refresh_tokens_session_metadata.sql | Pending | Pendokumentasian otomatis |
| 074_tenant_invites_and_settings.sql | Pending | Pendokumentasian otomatis |
| 075_tenant_invites_global_unique_code.sql | Pending | Pendokumentasian otomatis |

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
