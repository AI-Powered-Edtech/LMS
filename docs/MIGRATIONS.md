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
| 018_fix_backend_schema_bugs.sql | Fixes | Fix schema bugs |
| 019_audit_fixes.sql | Audit | Audit fixes |
| 020_fix_rpc_signatures.sql | RPC | Fix RPC signatures |
| 021_rpc_json.sql | RPC | JSON returning RPCs |
| 022_align_table_columns.sql | Fixes | Align table columns |
| 023_rpc_stubs.sql | RPC | RPC stubs |
| 024_course_review_workflow.sql | Course | Course review workflow |
| 025_personal_and_multi_tenant.sql | Tenant | Personal and multi tenant |
| 026_join_code_and_slugify.sql | Common | Join code and slugify |
| 027_p2_backlog.sql | Backlog | Phase 2 backlog |
| 028_p3_tenant_settings_and_roles.sql | Tenant | Tenant settings and roles |
| 029_add_admin_notification_types.sql | Notifications | Admin notification types |
| 030_admin_stub_tables_and_rpcs.sql | Admin | Admin stubs |
| 031_qa_schema_gaps.sql | QA | QA schema gaps |
| 032_qa_rpcs.sql | QA | QA RPCs |
| 033_fix_search_questions_return_json.sql | Fixes | Fix search questions RPC |
| 034_lesson_progress_monitor_rpc.sql | RPC | Lesson progress monitor RPC |
| 035_admin_backfill.sql | Admin | Admin backfill |
| 036_confirm_demo_seed_users.sql | Seed | Confirm demo seed users |
| 037_qa_sweep_fixes.sql | QA | QA sweep fixes |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Seed | Seed modules RPCs |
| 038_fix_get_tenant_users_user_id_alias.sql | Fixes | Fix get tenant users |
| 039_academic_years.sql | Core | Academic years |
| 040_semesters_link_academic_year.sql | Core | Semesters link academic year |
| 041_grade_levels.sql | Core | Grade levels |
| 042_rombel.sql | Rombel | Rombel core |
| 043_subjects_and_curriculum_items.sql | Curriculum | Subjects and curriculum items |
| 044_timetable_slots.sql | Scheduling | Timetable slots |
| 045_dossiers.sql | Profile | Dossiers |
| 046_rbac_10_role_matrix.sql | Auth | RBAC role matrix |
| 047_cp_tagging.sql | Tagging | CP Tagging |
| 048_gradebook_dual_mode.sql | Grading | Gradebook dual mode |
| 049_nilai_per_cp.sql | Grading | Nilai per CP |
| 050_akm_question_type.sql | Questions | AKM Question type |
| 051_p5_module.sql | Core | P5 Module |
| 052_domain_events_outbox.sql | Events | Domain events outbox |
| 053_rapor_kurmer.sql | Reports | Rapor Kurmer |
| 054_finance_midtrans.sql | Finance | Finance Midtrans |
| 055_bos_expense_tracking.sql | Finance | BOS Expense tracking |
| 056_ppdb_flow.sql | Admission | PPDB Flow |
| 057_integrations.sql | Core | Integrations |
| 058_ai_polish.sql | AI | AI Polish |
| 059_audit_rate_limit_perf.sql | Performance | Audit Rate limit perf |
| 060_counseling_parent_links_sikap.sql | Core | Counseling parent links |
| 061_app_audit_triggers.sql | Audit | App audit triggers |
| 062_rapor_autogen_rpc.sql | RPC | Rapor autogen RPC |
| 063_rombel_attendance.sql | Rombel | Rombel attendance |
| 064_stub_tables.sql | Core | Stub tables |
| 065_gradebook_baseline.sql | Grading | Gradebook baseline |
| 066_role_enum_completeness.sql | Auth | Role enum completeness |
| 067_idempotent_auto_modules.sql | Modules | Idempotent auto modules |
| 068_sync_user_roles_to_granular.sql | Auth | Sync user roles |
| 069_classes_rombel_id.sql | Rombel | Classes rombel id |
| 070_event_handler_idempotency.sql | Events | Event handler idempotency |
| 071_ai_rate_limit.sql | AI | AI rate limit |
| 072_parent_invoices_rpc.sql | Finance | Parent invoices RPC |
| 073_refresh_tokens_session_metadata.sql | Auth | Refresh tokens session metadata |
| 074_tenant_invites_and_settings.sql | Tenant | Tenant invites and settings |
| 075_tenant_invites_global_unique_code.sql | Tenant | Tenant invites global unique code |
| 076_invalidate_refresh_tokens_post_rotation.sql | Auth | Invalidate refresh tokens |
| 077_plagiarism_checks.sql | Integrations | Plagiarism checks |
| 078_scorm_runtime_data.sql | Core | SCORM runtime data |
