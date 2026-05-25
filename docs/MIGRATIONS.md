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

| 018_fix_backend_schema_bugs.sql | Phase 1 schema fixes |
| 019_audit_fixes.sql | Phase 1 audit triggers |
| 020_fix_rpc_signatures.sql | Phase 1 RPC signature fixes |
| 021_rpc_json.sql | Phase 1 JSON formatting |
| 022_align_table_columns.sql | Phase 1 column alignment |
| 023_rpc_stubs.sql | Phase 1 RPC stubs |
| 024_course_review_workflow.sql | Phase 2 Workflow |
| 025_personal_and_multi_tenant.sql | Phase 2 Multi-tenant |
| 026_join_code_and_slugify.sql | Phase 2 Codes and Slugs |
| 027_p2_backlog.sql | Phase 2 Backlog |
| 028_p3_tenant_settings_and_roles.sql | Phase 3 Settings and Roles |
| 029_add_admin_notification_types.sql | Phase 3 Notifications |
| 030_admin_stub_tables_and_rpcs.sql | Phase 3 Stubs |
| 031_qa_schema_gaps.sql | Phase 3 QA |
| 032_qa_rpcs.sql | Phase 3 QA RPCs |
| 033_fix_search_questions_return_json.sql | Search JSON Fix |
| 034_lesson_progress_monitor_rpc.sql | Lesson progress RPC |
| 035_admin_backfill.sql | Admin backfill |
| 036_confirm_demo_seed_users.sql | Demo seed users |
| 037_qa_sweep_fixes.sql | QA Sweep Fixes |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Missing RPCs |
| 038_fix_get_tenant_users_user_id_alias.sql | Tenant Users Alias Fix |
| 039_academic_years.sql | Phase 4 Academic Years |
| 040_semesters_link_academic_year.sql | Phase 4 Semesters |
| 041_grade_levels.sql | Phase 4 Grade Levels |
| 042_rombel.sql | Phase 4 Rombel |
| 043_subjects_and_curriculum_items.sql | Phase 4 Curriculum |
| 044_timetable_slots.sql | Phase 4 Timetables |
| 045_dossiers.sql | Phase 4 Dossiers |
| 046_rbac_10_role_matrix.sql | Phase 4 RBAC |
| 047_cp_tagging.sql | Phase 4 CP Tagging |
| 048_gradebook_dual_mode.sql | Phase 4 Gradebook |
| 049_nilai_per_cp.sql | Phase 4 Nilai CP |
| 050_akm_question_type.sql | Phase 4 AKM |
| 051_p5_module.sql | Phase 4 P5 |
| 052_domain_events_outbox.sql | Phase 4 Events |
| 053_rapor_kurmer.sql | Phase 4 Rapor |
| 054_finance_midtrans.sql | Phase 5 Finance |
| 055_bos_expense_tracking.sql | Phase 5 BOS |
| 056_ppdb_flow.sql | Phase 5 PPDB |
| 057_integrations.sql | Phase 5 Integrations |
| 058_ai_polish.sql | Phase 6 AI |
| 059_audit_rate_limit_perf.sql | Phase 6 Rate limit |
| 060_counseling_parent_links_sikap.sql | Phase 4 Counseling |
| 061_app_audit_triggers.sql | App Audit Triggers |
| 062_rapor_autogen_rpc.sql | Rapor RPC |
| 063_rombel_attendance.sql | Rombel Attendance |
| 064_stub_tables.sql | Stub Tables |
| 065_gradebook_baseline.sql | Gradebook Baseline |
| 066_role_enum_completeness.sql | Role Enum |
| 067_idempotent_auto_modules.sql | Auto Modules |
| 068_sync_user_roles_to_granular.sql | Sync User Roles |
| 069_classes_rombel_id.sql | Classes Rombel |
| 070_event_handler_idempotency.sql | Event Handlers |
| 071_ai_rate_limit.sql | AI Rate Limit |
| 072_parent_invoices_rpc.sql | Parent Invoices RPC |
| 073_refresh_tokens_session_metadata.sql | Refresh Tokens |
| 074_tenant_invites_and_settings.sql | Tenant Invites |
| 075_tenant_invites_global_unique_code.sql | Global Unique Code |
| 076_invalidate_refresh_tokens_post_rotation.sql | Invalidate Refresh Tokens |
| 077_plagiarism_checks.sql | Plagiarism Checks |
| 078_scorm_runtime_data.sql | SCORM Runtime Data |
