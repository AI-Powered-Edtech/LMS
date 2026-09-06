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
| 018_fix_backend_schema_bugs.sql | Fix | Perbaikan bug pada backend schema |
| 019_audit_fixes.sql | Audit | Perbaikan pada tabel audit |
| 020_fix_rpc_signatures.sql | Schema | Update signature fungsi RPC |
| 021_rpc_json.sql | Schema | Update RPC yang menggunakan tipe JSON |
| 022_align_table_columns.sql | Schema | Penyesuaian nama kolom tabel |
| 023_rpc_stubs.sql | Schema | Pembuatan RPC stubs |
| 024_course_review_workflow.sql | Feature | Workflow untuk proses review kelas |
| 025_personal_and_multi_tenant.sql | Feature | Konfigurasi akun personal dan tenant |
| 026_join_code_and_slugify.sql | Feature | Menambah slugify function dan tabel join code |
| 027_p2_backlog.sql | Schema | Update skema dari backlog P2 |
| 028_p3_tenant_settings_and_roles.sql | Feature | Konfigurasi pengaturan dan role per tenant |
| 029_add_admin_notification_types.sql | Feature | Tambahan tipe notifikasi untuk admin |
| 030_admin_stub_tables_and_rpcs.sql | Schema | Schema untuk tabel stub admin |
| 031_qa_schema_gaps.sql | Schema | Menutup gap pada skema QA |
| 032_qa_rpcs.sql | Schema | Tambahan fungsi RPC QA |
| 033_fix_search_questions_return_json.sql | Fix | Perbaikan tipe kembalian fungsi RPC |
| 034_lesson_progress_monitor_rpc.sql | Feature | Fungsi untuk melacak progress lesson |
| 035_admin_backfill.sql | Data | Backfill pada level tenant admin |
| 036_confirm_demo_seed_users.sql | Data | Menambahkan demo user pada env lokal |
| 037_qa_sweep_fixes.sql | Fix | Perbaikan untuk pipeline sweep QA |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Fix | Update user id dan module stubs |
| 038_fix_get_tenant_users_user_id_alias.sql | Fix | Perbaikan get_tenant_users untuk user alias |
| 039_academic_years.sql | Schema | Menambah tabel tahun akademik |
| 040_semesters_link_academic_year.sql | Schema | Relasi semester ke tahun akademik |
| 041_grade_levels.sql | Schema | Menambah tingkatan kelas |
| 042_rombel.sql | Schema | Menambahkan Rombel (Rombongan Belajar) |
| 043_subjects_and_curriculum_items.sql | Schema | Schema untuk mapel dan kurikulum |
| 044_timetable_slots.sql | Schema | Tabel pengelolaan jadwal kelas |
| 045_dossiers.sql | Schema | Dokumen riwayat pelajar (dossiers) |
| 046_rbac_10_role_matrix.sql | Schema | RBAC roles mapping |
| 047_cp_tagging.sql | Feature | Kemampuan tag Capaian Pembelajaran |
| 048_gradebook_dual_mode.sql | Feature | Model ganda untuk sistem gradebook |
| 049_nilai_per_cp.sql | Schema | Pengelolaan nilai untuk tiap Capaian Pembelajaran |
| 050_akm_question_type.sql | Schema | Tambahan tipe soal AKM |
| 051_p5_module.sql | Schema | Module untuk project profil Pancasila |
| 052_domain_events_outbox.sql | Schema | Outbox pattern untuk event processing |
| 053_rapor_kurmer.sql | Feature | Pembuatan Rapor Kurikulum Merdeka |
| 054_finance_midtrans.sql | Integration | Integrasi pembayaran via Midtrans |
| 055_bos_expense_tracking.sql | Feature | Pelacakan dana BOS |
| 056_ppdb_flow.sql | Feature | Proses pendaftaran murid baru |
| 057_integrations.sql | Integration | Tabel untuk partner integration |
| 058_ai_polish.sql | Feature | Implementasi AI Polish |
| 059_audit_rate_limit_perf.sql | Performance | Memperbaiki performa query rate limit |
| 060_counseling_parent_links_sikap.sql | Feature | Data untuk konseling siswa |
| 061_app_audit_triggers.sql | Schema | Penambahan triggers untuk tabel audit |
| 062_rapor_autogen_rpc.sql | Feature | Automasi generate rapor siswa |
| 063_rombel_attendance.sql | Feature | Fitur presensi untuk rombel |
| 064_stub_tables.sql | Schema | Stub tables lainnya |
| 065_gradebook_baseline.sql | Schema | Baseline table gradebook |
| 066_role_enum_completeness.sql | Schema | Update tipe enumerasi role |
| 067_idempotent_auto_modules.sql | Feature | Script pembuat modul otomatis yang idempotent |
| 068_sync_user_roles_to_granular.sql | Sync | Sinkronisasi role dengan level akses granular |
| 069_classes_rombel_id.sql | Feature | Link class dengan Rombel ID |
| 070_event_handler_idempotency.sql | Fix | Penambahan kunci idempotency untuk handler event |
| 071_ai_rate_limit.sql | Feature | Skema rate limiting untuk penggunaan AI |
| 072_parent_invoices_rpc.sql | Feature | Pembuatan RPC terkait tagihan parent |
| 073_refresh_tokens_session_metadata.sql | Auth | Tabel metdata refresh token |
| 074_tenant_invites_and_settings.sql | Feature | Invitation system level tenant |
| 075_tenant_invites_global_unique_code.sql | Schema | Validasi invite code global unik |
| 076_invalidate_refresh_tokens_post_rotation.sql | Auth | Mekanisme validasi refresh token rotasi |
| 077_plagiarism_checks.sql | Integration | Tracking dan logging laporan sistem plagiarism check |
| 078_scorm_runtime_data.sql | Feature | Pengelolaan SCORM Runtime Data |
