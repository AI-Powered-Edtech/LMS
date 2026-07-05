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
| 018_fix_backend_schema_bugs.sql | Fix | Bug fixes for backend schema. |
| 019_audit_fixes.sql | Fix | Fixes for audit logging tables. |
| 020_fix_rpc_signatures.sql | Fix | Updates RPC function signatures. |
| 021_rpc_json.sql | Feature | Adds JSON support for RPCs. |
| 022_align_table_columns.sql | Schema | Aligns column definitions across tables. |
| 023_rpc_stubs.sql | Feature | Adds stub RPCs for testing. |
| 024_course_review_workflow.sql | Feature | Adds tables for course review workflows. |
| 025_personal_and_multi_tenant.sql | Feature | Adds support for personal and multi-tenant setups. |
| 026_join_code_and_slugify.sql | Feature | Adds join codes and slug generation. |
| 027_p2_backlog.sql | Schema | Phase 2 backlog schema changes. |
| 028_p3_tenant_settings_and_roles.sql | Feature | Phase 3 tenant settings and roles. |
| 029_add_admin_notification_types.sql | Feature | Adds admin notification types. |
| 030_admin_stub_tables_and_rpcs.sql | Feature | Adds admin stub tables and RPCs. |
| 031_qa_schema_gaps.sql | Fix | Fixes QA schema gaps. |
| 032_qa_rpcs.sql | Feature | Adds QA testing RPCs. |
| 033_fix_search_questions_return_json.sql | Fix | Fixes question search returning JSON. |
| 034_lesson_progress_monitor_rpc.sql | Feature | Adds RPC for lesson progress monitoring. |
| 035_admin_backfill.sql | Data | Admin backfill script. |
| 036_confirm_demo_seed_users.sql | Data | Confirms demo seed users. |
| 037_qa_sweep_fixes.sql | Fix | Fixes for QA sweep. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Data | Seed modules missing RPCs. |
| 038_fix_get_tenant_users_user_id_alias.sql | Fix | Fixes alias issue in get_tenant_users. |
| 039_academic_years.sql | Feature | Adds academic years tables. |
| 040_semesters_link_academic_year.sql | Feature | Links semesters to academic years. |
| 041_grade_levels.sql | Feature | Adds grade levels tables. |
| 042_rombel.sql | Feature | Adds rombel (class group) tables. |
| 043_subjects_and_curriculum_items.sql | Feature | Adds subjects and curriculum tables. |
| 044_timetable_slots.sql | Feature | Adds timetable slots. |
| 045_dossiers.sql | Feature | Adds dossiers for students. |
| 046_rbac_10_role_matrix.sql | Security | Adds RBAC 10 role matrix. |
| 047_cp_tagging.sql | Feature | Adds tagging for CP (Capaian Pembelajaran). |
| 048_gradebook_dual_mode.sql | Feature | Adds dual mode support for gradebook. |
| 049_nilai_per_cp.sql | Feature | Adds score per CP logic. |
| 050_akm_question_type.sql | Feature | Adds AKM question types. |
| 051_p5_module.sql | Feature | Adds P5 module tables. |
| 052_domain_events_outbox.sql | Feature | Adds domain events outbox pattern. |
| 053_rapor_kurmer.sql | Feature | Adds Kurikulum Merdeka rapor support. |
| 054_finance_midtrans.sql | Integration | Midtrans payment integration tables. |
| 055_bos_expense_tracking.sql | Feature | Tracks BOS expenses. |
| 056_ppdb_flow.sql | Feature | Adds PPDB flow tables. |
| 057_integrations.sql | Integration | Various integration tables. |
| 058_ai_polish.sql | Feature | AI text polishing feature. |
| 059_audit_rate_limit_perf.sql | Performance | Audit and rate limit optimizations. |
| 060_counseling_parent_links_sikap.sql | Feature | Counseling and parent link tracking. |
| 061_app_audit_triggers.sql | Audit | Adds audit triggers. |
| 062_rapor_autogen_rpc.sql | Feature | RPC for auto-generating rapor. |
| 063_rombel_attendance.sql | Feature | Rombel attendance tracking. |
| 064_stub_tables.sql | Feature | Adds stub tables for missing entities. |
| 065_gradebook_baseline.sql | Data | Gradebook baseline data. |
| 066_role_enum_completeness.sql | Fix | Completes role enums. |
| 067_idempotent_auto_modules.sql | Feature | Idempotency for auto modules. |
| 068_sync_user_roles_to_granular.sql | Security | Syncs user roles to granular mapping. |
| 069_classes_rombel_id.sql | Feature | Links classes to rombel ID. |
| 070_event_handler_idempotency.sql | Feature | Event handler idempotency guarantees. |
| 071_ai_rate_limit.sql | Feature | Rate limiting for AI services. |
| 072_parent_invoices_rpc.sql | Feature | RPC for parent invoices. |
| 073_refresh_tokens_session_metadata.sql | Auth | Refresh tokens session metadata. |
| 074_tenant_invites_and_settings.sql | Feature | Tenant invites and settings. |
| 075_tenant_invites_global_unique_code.sql | Feature | Global unique code for tenant invites. |
| 076_invalidate_refresh_tokens_post_rotation.sql | Auth | Invalidates old refresh tokens post-rotation. |
| 077_plagiarism_checks.sql | Feature | Tables for plagiarism checks. |
| 078_scorm_runtime_data.sql | Integration | SCORM runtime data tables. |
