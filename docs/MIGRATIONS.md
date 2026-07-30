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
| 018_fix_backend_schema_bugs.sql | Schema | TBD |
| 019_audit_fixes.sql | Schema | TBD |
| 020_fix_rpc_signatures.sql | Schema | TBD |
| 021_rpc_json.sql | Schema | TBD |
| 022_align_table_columns.sql | Schema | TBD |
| 023_rpc_stubs.sql | Schema | TBD |
| 024_course_review_workflow.sql | Schema | TBD |
| 025_personal_and_multi_tenant.sql | Schema | TBD |
| 026_join_code_and_slugify.sql | Schema | TBD |
| 027_p2_backlog.sql | Schema | TBD |
| 028_p3_tenant_settings_and_roles.sql | Schema | TBD |
| 029_add_admin_notification_types.sql | Schema | TBD |
| 030_admin_stub_tables_and_rpcs.sql | Schema | TBD |
| 031_qa_schema_gaps.sql | Schema | TBD |
| 032_qa_rpcs.sql | Schema | TBD |
| 033_fix_search_questions_return_json.sql | Schema | TBD |
| 034_lesson_progress_monitor_rpc.sql | Schema | TBD |
| 035_admin_backfill.sql | Schema | TBD |
| 036_confirm_demo_seed_users.sql | Schema | TBD |
| 037_qa_sweep_fixes.sql | Schema | TBD |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Schema | TBD |
| 038_fix_get_tenant_users_user_id_alias.sql | Schema | TBD |
| 039_academic_years.sql | Schema | TBD |
| 040_semesters_link_academic_year.sql | Schema | TBD |
| 041_grade_levels.sql | Schema | TBD |
| 042_rombel.sql | Schema | TBD |
| 043_subjects_and_curriculum_items.sql | Schema | TBD |
| 044_timetable_slots.sql | Schema | TBD |
| 045_dossiers.sql | Schema | TBD |
| 046_rbac_10_role_matrix.sql | Schema | TBD |
| 047_cp_tagging.sql | Schema | TBD |
| 048_gradebook_dual_mode.sql | Schema | TBD |
| 049_nilai_per_cp.sql | Schema | TBD |
| 050_akm_question_type.sql | Schema | TBD |
| 051_p5_module.sql | Schema | TBD |
| 052_domain_events_outbox.sql | Schema | TBD |
| 053_rapor_kurmer.sql | Schema | TBD |
| 054_finance_midtrans.sql | Schema | TBD |
| 055_bos_expense_tracking.sql | Schema | TBD |
| 056_ppdb_flow.sql | Schema | TBD |
| 057_integrations.sql | Schema | TBD |
| 058_ai_polish.sql | Schema | TBD |
| 059_audit_rate_limit_perf.sql | Schema | TBD |
| 060_counseling_parent_links_sikap.sql | Schema | TBD |
| 061_app_audit_triggers.sql | Schema | TBD |
| 062_rapor_autogen_rpc.sql | Schema | TBD |
| 063_rombel_attendance.sql | Schema | TBD |
| 064_stub_tables.sql | Schema | TBD |
| 065_gradebook_baseline.sql | Schema | TBD |
| 066_role_enum_completeness.sql | Schema | TBD |
| 067_idempotent_auto_modules.sql | Schema | TBD |
| 068_sync_user_roles_to_granular.sql | Schema | TBD |
| 069_classes_rombel_id.sql | Schema | TBD |
| 070_event_handler_idempotency.sql | Schema | TBD |
| 071_ai_rate_limit.sql | Schema | TBD |
| 072_parent_invoices_rpc.sql | Schema | TBD |
| 073_refresh_tokens_session_metadata.sql | Schema | TBD |
| 074_tenant_invites_and_settings.sql | Schema | TBD |
| 075_tenant_invites_global_unique_code.sql | Schema | TBD |
| 076_invalidate_refresh_tokens_post_rotation.sql | Schema | TBD |
| 077_plagiarism_checks.sql | Schema | TBD |
| 078_scorm_runtime_data.sql | Schema | TBD |
