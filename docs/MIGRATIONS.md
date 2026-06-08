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
| 018_fix_backend_schema_bugs.sql | Feature | Added fix backend schema bugs. |
| 019_audit_fixes.sql | Audit | Added audit fixes. |
| 020_fix_rpc_signatures.sql | RPC | Added fix rpc signatures. |
| 021_rpc_json.sql | RPC | Added rpc json. |
| 022_align_table_columns.sql | Feature | Added align table columns. |
| 023_rpc_stubs.sql | RPC | Added rpc stubs. |
| 024_course_review_workflow.sql | Feature | Added course review workflow. |
| 025_personal_and_multi_tenant.sql | Feature | Added personal and multi tenant. |
| 026_join_code_and_slugify.sql | Feature | Added join code and slugify. |
| 027_p2_backlog.sql | Feature | Added p2 backlog. |
| 028_p3_tenant_settings_and_roles.sql | Feature | Added p3 tenant settings and roles. |
| 029_add_admin_notification_types.sql | Feature | Added add admin notification types. |
| 030_admin_stub_tables_and_rpcs.sql | RPC | Added admin stub tables and rpcs. |
| 031_qa_schema_gaps.sql | Feature | Added qa schema gaps. |
| 032_qa_rpcs.sql | RPC | Added qa rpcs. |
| 033_fix_search_questions_return_json.sql | Feature | Added fix search questions return json. |
| 034_lesson_progress_monitor_rpc.sql | RPC | Added lesson progress monitor rpc. |
| 035_admin_backfill.sql | Feature | Added admin backfill. |
| 036_confirm_demo_seed_users.sql | Feature | Added confirm demo seed users. |
| 037_qa_sweep_fixes.sql | Feature | Added qa sweep fixes. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | RPC | Added seed modules missing rpcs and auth uid. |
| 038_fix_get_tenant_users_user_id_alias.sql | Feature | Added fix get tenant users user id alias. |
| 039_academic_years.sql | Feature | Added academic years. |
| 040_semesters_link_academic_year.sql | Feature | Added semesters link academic year. |
| 041_grade_levels.sql | Feature | Added grade levels. |
| 042_rombel.sql | Feature | Added rombel. |
| 043_subjects_and_curriculum_items.sql | Feature | Added subjects and curriculum items. |
| 044_timetable_slots.sql | Feature | Added timetable slots. |
| 045_dossiers.sql | Feature | Added dossiers. |
| 046_rbac_10_role_matrix.sql | Feature | Added rbac 10 role matrix. |
| 047_cp_tagging.sql | Feature | Added cp tagging. |
| 048_gradebook_dual_mode.sql | Feature | Added gradebook dual mode. |
| 049_nilai_per_cp.sql | Feature | Added nilai per cp. |
| 050_akm_question_type.sql | Feature | Added akm question type. |
| 051_p5_module.sql | Feature | Added p5 module. |
| 052_domain_events_outbox.sql | Feature | Added domain events outbox. |
| 053_rapor_kurmer.sql | Feature | Added rapor kurmer. |
| 054_finance_midtrans.sql | Feature | Added finance midtrans. |
| 055_bos_expense_tracking.sql | Feature | Added bos expense tracking. |
| 056_ppdb_flow.sql | Feature | Added ppdb flow. |
| 057_integrations.sql | Feature | Added integrations. |
| 058_ai_polish.sql | Feature | Added ai polish. |
| 059_audit_rate_limit_perf.sql | Audit | Added audit rate limit perf. |
| 060_counseling_parent_links_sikap.sql | Feature | Added counseling parent links sikap. |
| 061_app_audit_triggers.sql | Audit | Added app audit triggers. |
| 062_rapor_autogen_rpc.sql | RPC | Added rapor autogen rpc. |
| 063_rombel_attendance.sql | Feature | Added rombel attendance. |
| 064_stub_tables.sql | Feature | Added stub tables. |
| 065_gradebook_baseline.sql | Feature | Added gradebook baseline. |
| 066_role_enum_completeness.sql | Feature | Added role enum completeness. |
| 067_idempotent_auto_modules.sql | Feature | Added idempotent auto modules. |
| 068_sync_user_roles_to_granular.sql | Feature | Added sync user roles to granular. |
| 069_classes_rombel_id.sql | Feature | Added classes rombel id. |
| 070_event_handler_idempotency.sql | Feature | Added event handler idempotency. |
| 071_ai_rate_limit.sql | Feature | Added ai rate limit. |
| 072_parent_invoices_rpc.sql | RPC | Added parent invoices rpc. |
| 073_refresh_tokens_session_metadata.sql | Feature | Added refresh tokens session metadata. |
| 074_tenant_invites_and_settings.sql | Feature | Added tenant invites and settings. |
| 075_tenant_invites_global_unique_code.sql | Feature | Added tenant invites global unique code. |
| 076_invalidate_refresh_tokens_post_rotation.sql | Feature | Added invalidate refresh tokens post rotation. |
| 077_plagiarism_checks.sql | Feature | Added plagiarism checks. |
| 078_scorm_runtime_data.sql | Feature | Added scorm runtime data. |

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
