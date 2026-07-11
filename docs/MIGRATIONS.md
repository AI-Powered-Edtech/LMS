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
| `018_fix_backend_schema_bugs.sql` | fix backend schema bugs | Ditambahkan oleh auto-fixer |
| `019_audit_fixes.sql` | audit fixes | Ditambahkan oleh auto-fixer |
| `020_fix_rpc_signatures.sql` | fix rpc signatures | Ditambahkan oleh auto-fixer |
| `021_rpc_json.sql` | rpc json | Ditambahkan oleh auto-fixer |
| `022_align_table_columns.sql` | align table columns | Ditambahkan oleh auto-fixer |
| `023_rpc_stubs.sql` | rpc stubs | Ditambahkan oleh auto-fixer |
| `024_course_review_workflow.sql` | course review workflow | Ditambahkan oleh auto-fixer |
| `025_personal_and_multi_tenant.sql` | personal and multi tenant | Ditambahkan oleh auto-fixer |
| `026_join_code_and_slugify.sql` | join code and slugify | Ditambahkan oleh auto-fixer |
| `027_p2_backlog.sql` | p2 backlog | Ditambahkan oleh auto-fixer |
| `028_p3_tenant_settings_and_roles.sql` | p3 tenant settings and roles | Ditambahkan oleh auto-fixer |
| `029_add_admin_notification_types.sql` | add admin notification types | Ditambahkan oleh auto-fixer |
| `030_admin_stub_tables_and_rpcs.sql` | admin stub tables and rpcs | Ditambahkan oleh auto-fixer |
| `031_qa_schema_gaps.sql` | qa schema gaps | Ditambahkan oleh auto-fixer |
| `032_qa_rpcs.sql` | qa rpcs | Ditambahkan oleh auto-fixer |
| `033_fix_search_questions_return_json.sql` | fix search questions return json | Ditambahkan oleh auto-fixer |
| `034_lesson_progress_monitor_rpc.sql` | lesson progress monitor rpc | Ditambahkan oleh auto-fixer |
| `035_admin_backfill.sql` | admin backfill | Ditambahkan oleh auto-fixer |
| `036_confirm_demo_seed_users.sql` | confirm demo seed users | Ditambahkan oleh auto-fixer |
| `037_qa_sweep_fixes.sql` | qa sweep fixes | Ditambahkan oleh auto-fixer |
| `037_seed_modules_missing_rpcs_and_auth_uid.sql` | seed modules missing rpcs and auth uid | Ditambahkan oleh auto-fixer |
| `038_fix_get_tenant_users_user_id_alias.sql` | fix get tenant users user id alias | Ditambahkan oleh auto-fixer |
| `039_academic_years.sql` | academic years | Ditambahkan oleh auto-fixer |
| `040_semesters_link_academic_year.sql` | semesters link academic year | Ditambahkan oleh auto-fixer |
| `041_grade_levels.sql` | grade levels | Ditambahkan oleh auto-fixer |
| `042_rombel.sql` | rombel | Ditambahkan oleh auto-fixer |
| `043_subjects_and_curriculum_items.sql` | subjects and curriculum items | Ditambahkan oleh auto-fixer |
| `044_timetable_slots.sql` | timetable slots | Ditambahkan oleh auto-fixer |
| `045_dossiers.sql` | dossiers | Ditambahkan oleh auto-fixer |
| `046_rbac_10_role_matrix.sql` | rbac 10 role matrix | Ditambahkan oleh auto-fixer |
| `047_cp_tagging.sql` | cp tagging | Ditambahkan oleh auto-fixer |
| `048_gradebook_dual_mode.sql` | gradebook dual mode | Ditambahkan oleh auto-fixer |
| `049_nilai_per_cp.sql` | nilai per cp | Ditambahkan oleh auto-fixer |
| `050_akm_question_type.sql` | akm question type | Ditambahkan oleh auto-fixer |
| `051_p5_module.sql` | p5 module | Ditambahkan oleh auto-fixer |
| `052_domain_events_outbox.sql` | domain events outbox | Ditambahkan oleh auto-fixer |
| `053_rapor_kurmer.sql` | rapor kurmer | Ditambahkan oleh auto-fixer |
| `054_finance_midtrans.sql` | finance midtrans | Ditambahkan oleh auto-fixer |
| `055_bos_expense_tracking.sql` | bos expense tracking | Ditambahkan oleh auto-fixer |
| `056_ppdb_flow.sql` | ppdb flow | Ditambahkan oleh auto-fixer |
| `057_integrations.sql` | integrations | Ditambahkan oleh auto-fixer |
| `058_ai_polish.sql` | ai polish | Ditambahkan oleh auto-fixer |
| `059_audit_rate_limit_perf.sql` | audit rate limit perf | Ditambahkan oleh auto-fixer |
| `060_counseling_parent_links_sikap.sql` | counseling parent links sikap | Ditambahkan oleh auto-fixer |
| `061_app_audit_triggers.sql` | app audit triggers | Ditambahkan oleh auto-fixer |
| `062_rapor_autogen_rpc.sql` | rapor autogen rpc | Ditambahkan oleh auto-fixer |
| `063_rombel_attendance.sql` | rombel attendance | Ditambahkan oleh auto-fixer |
| `064_stub_tables.sql` | stub tables | Ditambahkan oleh auto-fixer |
| `065_gradebook_baseline.sql` | gradebook baseline | Ditambahkan oleh auto-fixer |
| `066_role_enum_completeness.sql` | role enum completeness | Ditambahkan oleh auto-fixer |
| `067_idempotent_auto_modules.sql` | idempotent auto modules | Ditambahkan oleh auto-fixer |
| `068_sync_user_roles_to_granular.sql` | sync user roles to granular | Ditambahkan oleh auto-fixer |
| `069_classes_rombel_id.sql` | classes rombel id | Ditambahkan oleh auto-fixer |
| `070_event_handler_idempotency.sql` | event handler idempotency | Ditambahkan oleh auto-fixer |
| `071_ai_rate_limit.sql` | ai rate limit | Ditambahkan oleh auto-fixer |
| `072_parent_invoices_rpc.sql` | parent invoices rpc | Ditambahkan oleh auto-fixer |
| `073_refresh_tokens_session_metadata.sql` | refresh tokens session metadata | Ditambahkan oleh auto-fixer |
| `074_tenant_invites_and_settings.sql` | tenant invites and settings | Ditambahkan oleh auto-fixer |
| `075_tenant_invites_global_unique_code.sql` | tenant invites global unique code | Ditambahkan oleh auto-fixer |
| `076_invalidate_refresh_tokens_post_rotation.sql` | invalidate refresh tokens post rotation | Ditambahkan oleh auto-fixer |
| `077_plagiarism_checks.sql` | plagiarism checks | Ditambahkan oleh auto-fixer |
| `078_scorm_runtime_data.sql` | scorm runtime data | Ditambahkan oleh auto-fixer |

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
