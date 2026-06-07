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
| 018_fix_backend_schema_bugs.sql | Schema | Bug fixes untuk backend schema. |
| 019_audit_fixes.sql | Audit | Fixes untuk fitur audit. |
| 020_fix_rpc_signatures.sql | RPC | Fixes untuk RPC signatures. |
| 021_rpc_json.sql | RPC | Tambahan JSON RPC. |
| 022_align_table_columns.sql | Schema | Penyesuaian kolom tabel. |
| 023_rpc_stubs.sql | RPC | Stubs untuk fungsi RPC. |
| 024_course_review_workflow.sql | Workflow | Workflow untuk course review. |
| 025_personal_and_multi_tenant.sql | Schema | Dukungan personal dan multi-tenant. |
| 026_join_code_and_slugify.sql | Feature | Join code dan slugify. |
| 027_p2_backlog.sql | Schema | Schema untuk P2 backlog. |
| 028_p3_tenant_settings_and_roles.sql | Schema | Settings dan roles untuk tenant (P3). |
| 029_add_admin_notification_types.sql | Notifications | Tambahan tipe notifikasi untuk admin. |
| 030_admin_stub_tables_and_rpcs.sql | Admin | Stub tables dan RPCs untuk admin. |
| 031_qa_schema_gaps.sql | Schema | Penutupan celah schema untuk QA. |
| 032_qa_rpcs.sql | RPC | RPC tambahan untuk QA. |
| 033_fix_search_questions_return_json.sql | RPC | Fix return JSON untuk pencarian soal. |
| 034_lesson_progress_monitor_rpc.sql | RPC | RPC untuk monitor progres pelajaran. |
| 035_admin_backfill.sql | Admin | Backfill data untuk admin. |
| 036_confirm_demo_seed_users.sql | Seed | Konfirmasi data user untuk demo seed. |
| 037_qa_sweep_fixes.sql | QA | Fixes dari sweep QA. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Seed | Seed modul, rpc hilang, dan auth uid. |
| 038_fix_get_tenant_users_user_id_alias.sql | RPC | Fix alias user_id di get_tenant_users. |
| 039_academic_years.sql | Schema | Tabel academic_years. |
| 040_semesters_link_academic_year.sql | Schema | Relasi semesters dan academic_year. |
| 041_grade_levels.sql | Schema | Tabel grade_levels. |
| 042_rombel.sql | Schema | Tabel rombel. |
| 043_subjects_and_curriculum_items.sql | Schema | Tabel subjects dan curriculum_items. |
| 044_timetable_slots.sql | Schema | Tabel timetable_slots. |
| 045_dossiers.sql | Schema | Tabel dossiers. |
| 046_rbac_10_role_matrix.sql | RBAC | Role matrix RBAC 10. |
| 047_cp_tagging.sql | Feature | Tagging CP. |
| 048_gradebook_dual_mode.sql | Feature | Mode ganda gradebook. |
| 049_nilai_per_cp.sql | Feature | Nilai per CP. |
| 050_akm_question_type.sql | Schema | Tipe pertanyaan AKM. |
| 051_p5_module.sql | Module | Modul P5. |
| 052_domain_events_outbox.sql | Event | Outbox event domain. |
| 053_rapor_kurmer.sql | Feature | Rapor Kurikulum Merdeka. |
| 054_finance_midtrans.sql | Finance | Integrasi Midtrans. |
| 055_bos_expense_tracking.sql | Finance | Tracking pengeluaran BOS. |
| 056_ppdb_flow.sql | Feature | Alur PPDB. |
| 057_integrations.sql | Integration | Tabel integrations. |
| 058_ai_polish.sql | AI | Peningkatan fitur AI. |
| 059_audit_rate_limit_perf.sql | Performance | Audit dan rate limit performance. |
| 060_counseling_parent_links_sikap.sql | Feature | Konseling, parent links, dan sikap. |
| 061_app_audit_triggers.sql | Audit | Audit triggers. |
| 062_rapor_autogen_rpc.sql | RPC | RPC autogen rapor. |
| 063_rombel_attendance.sql | Feature | Kehadiran rombel. |
| 064_stub_tables.sql | Schema | Tabel stub tambahan. |
| 065_gradebook_baseline.sql | Gradebook | Baseline gradebook. |
| 066_role_enum_completeness.sql | Schema | Kelengkapan enum role. |
| 067_idempotent_auto_modules.sql | Feature | Modul otomatis idempotent. |
| 068_sync_user_roles_to_granular.sql | Sync | Sinkronisasi role user. |
| 069_classes_rombel_id.sql | Schema | Kolom rombel_id pada classes. |
| 070_event_handler_idempotency.sql | Event | Idempotensi event handler. |
| 071_ai_rate_limit.sql | AI | Rate limit fitur AI. |
| 072_parent_invoices_rpc.sql | Finance | RPC faktur orang tua. |
| 073_refresh_tokens_session_metadata.sql | Auth | Metadata sesi dan token refresh. |
| 074_tenant_invites_and_settings.sql | Tenant | Undangan dan pengaturan tenant. |
| 075_tenant_invites_global_unique_code.sql | Tenant | Kode unik undangan tenant. |
| 076_invalidate_refresh_tokens_post_rotation.sql | Auth | Invalidate token setelah rotasi. |
| 077_plagiarism_checks.sql | Feature | Pengecekan plagiasi. |
| 078_scorm_runtime_data.sql | SCORM | Data runtime SCORM. |
