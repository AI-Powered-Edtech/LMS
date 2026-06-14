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
| 018_fix_backend_schema_bugs.sql | Schema | Mengatasi berbagai bug minor skema |
| 019_audit_fixes.sql | Schema | Memperbaiki tabel audit log |
| 020_fix_rpc_signatures.sql | Schema | Memperbaiki signature RPC yang tidak sesuai tipe |
| 021_rpc_json.sql | Schema | RPC yang mengembalikan JSON |
| 022_align_table_columns.sql | Schema | Mengkonfigurasi kolom agar sejajar |
| 023_rpc_stubs.sql | Schema | RPC Stubs |
| 024_course_review_workflow.sql | Feature | Workflow untuk course review |
| 025_personal_and_multi_tenant.sql | Feature | Pembaruan fitur tenant & role |
| 026_join_code_and_slugify.sql | Feature | Join code untuk classroom |
| 027_p2_backlog.sql | Backlog | P2 backlog schema |
| 028_p3_tenant_settings_and_roles.sql | Backlog | P3 tenant settings and roles |
| 029_add_admin_notification_types.sql | Backlog | Tambahan tipe admin notification |
| 030_admin_stub_tables_and_rpcs.sql | Backlog | Tambahan tabel dan RPC admin |
| 031_qa_schema_gaps.sql | QA | QA schema gap |
| 032_qa_rpcs.sql | QA | QA RPCs |
| 033_fix_search_questions_return_json.sql | Feature | Fix search return JSON |
| 034_lesson_progress_monitor_rpc.sql | Feature | Memantau kemajuan lesson |
| 035_admin_backfill.sql | Schema | Admin backfill |
| 036_confirm_demo_seed_users.sql | Seed | Confirm seed users |
| 037_qa_sweep_fixes.sql | QA | QA Sweep fixes |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Schema | Seed missing RPCs |
| 038_fix_get_tenant_users_user_id_alias.sql | Schema | Fix user ID alias |
| 039_academic_years.sql | Schema | Schema untuk tahun akademik |
| 040_semesters_link_academic_year.sql | Schema | Link relasi tahun ke semester |
| 041_grade_levels.sql | Schema | Schema grade levels |
| 042_rombel.sql | Schema | Tabel rombel |
| 043_subjects_and_curriculum_items.sql | Schema | Map kurikulum |
| 044_timetable_slots.sql | Schema | Penjadwalan jadwal kelas |
| 045_dossiers.sql | Schema | Siswa dossier data |
| 046_rbac_10_role_matrix.sql | RBAC | Role Matrix |
| 047_cp_tagging.sql | Feature | CP Tagging |
| 048_gradebook_dual_mode.sql | Gradebook | Mode Gradebook |
| 049_nilai_per_cp.sql | Gradebook | Pencatatan Nilai CP |
| 050_akm_question_type.sql | Schema | Jenis pertanyaan AKM |
| 051_p5_module.sql | Schema | Modul P5 skema |
| 052_domain_events_outbox.sql | Event | Domain event outbox pattern |
| 053_rapor_kurmer.sql | Feature | Skema format Rapor Kurikulum Merdeka |
| 054_finance_midtrans.sql | Integration | Gateway Finance |
| 055_bos_expense_tracking.sql | Integration | Skema Tracking Bos |
| 056_ppdb_flow.sql | Schema | PPDB skema flow |
| 057_integrations.sql | Integration | Dapodik & Integrasi |
| 058_ai_polish.sql | Feature | Polish AI Table |
| 059_audit_rate_limit_perf.sql | Performance | Peningkatan Limit Rate dan Audit |
| 060_counseling_parent_links_sikap.sql | Schema | Tabel bimbingan/counseling |
| 061_app_audit_triggers.sql | Trigger | Audit Logs Trigger |
| 062_rapor_autogen_rpc.sql | Feature | RPC generate Rapor otomatis |
| 063_rombel_attendance.sql | Feature | Kehadiran via Rombel |
| 064_stub_tables.sql | Schema | Tambahan table stub |
| 065_gradebook_baseline.sql | Gradebook | Perbaikan baseline pada gradebook |
| 066_role_enum_completeness.sql | Enum | Melengkapi role Enum |
| 067_idempotent_auto_modules.sql | Modules | Skema perbaikan modul yang autogenerated dan bersifat idempoten |
| 068_sync_user_roles_to_granular.sql | RBAC | Update permission dari skema granulasi |
| 069_classes_rombel_id.sql | Feature | Sinkronisasi kelas dari Rombel |
| 070_event_handler_idempotency.sql | Event | Log tracking idempotensi event handler sistem |
| 071_ai_rate_limit.sql | Feature | Perbaikan limit untuk rate pengguna di layer db AI |
| 072_parent_invoices_rpc.sql | Feature | Pembaruan tabel logic parent invoices |
| 073_refresh_tokens_session_metadata.sql | Feature | Penguatan mekanisme otentikasi token per tabel dengan payload meta metadata |
| 074_tenant_invites_and_settings.sql | Schema | Pengaturan tenant pada level admin |
| 075_tenant_invites_global_unique_code.sql | Schema | Join codes / invitation globals for registration flows |
| 076_invalidate_refresh_tokens_post_rotation.sql | Security | Logic invalidation refresh tables / tokens for users to avoid persistence bypasses |
| 077_plagiarism_checks.sql | Feature | Penambahan storage tracker for plagiarism reports (via api / third party db hook records for content uniqueness constraints and metrics storage mapping logic implementation logs etc) |
| 078_scorm_runtime_data.sql | Schema | Tabel storage SCORM API untuk session learning |
