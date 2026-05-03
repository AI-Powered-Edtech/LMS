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
| 018_fix_backend_schema_bugs.sql | Schema | Perbaikan bug pada backend schema. |
| 019_audit_fixes.sql | Schema | Perbaikan trigger dan rule untuk fungsi audit. |
| 020_fix_rpc_signatures.sql | Schema | Sinkronisasi parameter RPC signature. |
| 021_rpc_json.sql | Schema | Penyesuaian output format JSON dari RPC. |
| 022_align_table_columns.sql | Schema | Penyesuaian kolom tabel untuk keselarasan fitur. |
| 023_rpc_stubs.sql | Schema | RPC stubs sementara untuk development. |
| 024_course_review_workflow.sql | Workflow | Status dan approval flow untuk review course. |
| 025_personal_and_multi_tenant.sql | Multi-tenant | Pemisahan context tenant. |
| 026_join_code_and_slugify.sql | Feature | Menambahkan kode join kelas dan routing slug. |
| 027_p2_backlog.sql | Schema | Migration backlog P2. |
| 028_p3_tenant_settings_and_roles.sql | Schema | Pengaturan roles dan settings per tenant. |
| 029_add_admin_notification_types.sql | Schema | Tipe notifikasi admin baru. |
| 030_admin_stub_tables_and_rpcs.sql | Schema | Tabel admin stubs. |
| 031_qa_schema_gaps.sql | Schema | QA schema fixes. |
| 032_qa_rpcs.sql | Schema | Perbaikan fungsi RPC QA. |
| 033_fix_search_questions_return_json.sql | Schema | Perbaikan output pencarian bank soal. |
| 034_lesson_progress_monitor_rpc.sql | Feature | RPC progress monitor lesson. |
| 035_admin_backfill.sql | Feature | Skema backfill admin. |
| 036_confirm_demo_seed_users.sql | Seed | Validasi seed user akun demo. |
| 037_qa_sweep_fixes.sql | Schema | Sweep fixes QA sprint. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Schema | Fix ID pengguna modul. |
| 038_fix_get_tenant_users_user_id_alias.sql | Schema | Perbaikan alias list user. |
| 039_academic_years.sql | Feature | Struktur tahun akademik. |
| 040_semesters_link_academic_year.sql | Feature | Relasi semester ke tahun akademik. |
| 041_grade_levels.sql | Feature | Penambahan master data tingkat kelas. |
| 042_rombel.sql | Feature | Schema Rombongan Belajar. |
| 043_subjects_and_curriculum_items.sql | Feature | Skema mata pelajaran dan target kurikulum. |
| 044_timetable_slots.sql | Feature | Jadwal pelajaran slot. |
| 045_dossiers.sql | Feature | Tabel biodata/dossiers siswa dan pengajar. |
| 046_rbac_10_role_matrix.sql | Auth | Matriks perizinan role. |
| 047_cp_tagging.sql | Feature | Capaian Pembelajaran tagging. |
| 048_gradebook_dual_mode.sql | Feature | Skema transisi untuk gradebook mode dual. |
| 049_nilai_per_cp.sql | Feature | Nilai granular tingkat CP. |
| 050_akm_question_type.sql | Feature | Tipe soal AKM kompleks. |
| 051_p5_module.sql | Feature | Tabel modul P5 Projek Penguatan Profil Pelajar Pancasila. |
| 052_domain_events_outbox.sql | System | Tabel outbox domain events untuk asinkronus processing. |
| 053_rapor_kurmer.sql | Feature | Rapor spesifik Kurikulum Merdeka. |
| 054_finance_midtrans.sql | Feature | Integrasi status Midtrans dan transaksi keuangan. |
| 055_bos_expense_tracking.sql | Feature | Tracking dana BOS. |
| 056_ppdb_flow.sql | Feature | Penerimaan Peserta Didik Baru (PPDB). |
| 057_integrations.sql | Feature | Skema tabel integrasi LTI eksternal. |
| 058_ai_polish.sql | AI | Parameter history AI authoring assist. |
| 059_audit_rate_limit_perf.sql | System | Limit request dan rate logging. |
| 060_counseling_parent_links_sikap.sql | Feature | Evaluasi sikap counseling. |
| 061_app_audit_triggers.sql | Schema | Triggers spesifik log events. |
| 062_rapor_autogen_rpc.sql | Feature | RPC automasi nilai rapor. |
| 063_rombel_attendance.sql | Feature | Absensi per rombel. |
| 064_stub_tables.sql | Schema | Tabel fitur coming-soon. |
| 065_gradebook_baseline.sql | Schema | Baseline skor gradebook. |
| 066_role_enum_completeness.sql | Feature | Normalisasi role constraints. |
| 067_idempotent_auto_modules.sql | System | Event idempotency log. |
| 068_sync_user_roles_to_granular.sql | System | Migrasi ke granular roles. |
| 069_classes_rombel_id.sql | Feature | Hubungan class dengan rombel. |
| 070_event_handler_idempotency.sql | System | Skema asinkron handling event. |
| 071_ai_rate_limit.sql | Feature | Rate limits untuk request AI. |
| 072_parent_invoices_rpc.sql | Feature | Laporan tagihan finance orang tua. |
| 073_refresh_tokens_session_metadata.sql | Auth | Tabel sesi perangkat dan token refresh. |
| 074_tenant_invites_and_settings.sql | Feature | Schema undangan dan profil tenant. |
| 075_tenant_invites_global_unique_code.sql | Feature | Unik code global validasi pendaftaran tenant. |

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
