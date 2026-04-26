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
| 018_fix_backend_schema_bugs.sql | Schema | Memperbaiki bug pada schema backend. |
| 019_audit_fixes.sql | Audit | Memperbaiki log audit dan dependensinya. |
| 020_fix_rpc_signatures.sql | RPC | Menyelaraskan argumen dan return type RPC. |
| 021_rpc_json.sql | RPC | Memperbarui RPC agar mendukung format data JSON. |
| 022_align_table_columns.sql | Schema | Menyesuaikan tipe data dan constraint kolom tabel. |
| 023_rpc_stubs.sql | RPC | Menambahkan stub RPC sementara untuk endpoint baru. |
| 024_course_review_workflow.sql | Feature | Menambahkan alur review untuk publikasi materi kursus. |
| 025_personal_and_multi_tenant.sql | Schema | Mendukung mode personal dan menyempurnakan batasan multi-tenant. |
| 026_join_code_and_slugify.sql | Feature | Menambahkan support `join_code` dan format slug unik. |
| 027_p2_backlog.sql | Schema | Migration backlog prioritas tahap 2. |
| 028_p3_tenant_settings_and_roles.sql | Schema | Menyempurnakan pengaturan tenant dan RBAC tahap 3. |
| 029_add_admin_notification_types.sql | Notifications | Tipe notifikasi khusus peran admin. |
| 030_admin_stub_tables_and_rpcs.sql | Admin | Stub untuk tabel dan fungsi spesifik dasbor admin. |
| 031_qa_schema_gaps.sql | QA | Memperbaiki celah skema yang ditemukan dari pengujian QA. |
| 032_qa_rpcs.sql | QA | RPC baru hasil siklus pengujian QA. |
| 033_fix_search_questions_return_json.sql | RPC | Menyesuaikan return data pencarian pertanyaan menjadi object JSON. |
| 034_lesson_progress_monitor_rpc.sql | RPC | Endpoint untuk melacak persentase progres lesson murid. |
| 035_admin_backfill.sql | Admin | Migrasi data lama terkait hak akses admin. |
| 036_confirm_demo_seed_users.sql | Seed | Mengonfirmasi status user bawaan untuk instance demo. |
| 037_qa_sweep_fixes.sql | QA | Perbaikan dari test suite *sweep* otomatis. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | RPC | Menambah modul seed dengan perbaikan `auth.uid()`. |
| 038_fix_get_tenant_users_user_id_alias.sql | RPC | Mengatasi ambiguitas alias kolom user ID. |
| 039_academic_years.sql | Schema | Tabel pengelolaan tahun ajaran (academic years). |
| 040_semesters_link_academic_year.sql | Schema | Relasi entitas semester ke tahun ajaran. |
| 041_grade_levels.sql | Schema | Tabel referensi tingkatan kelas (grade levels). |
| 042_rombel.sql | Feature | Tabel rombongan belajar (rombel) dan anggotanya. |
| 043_subjects_and_curriculum_items.sql | Curriculum | Tabel mata pelajaran dan elemen kurikulum standar. |
| 044_timetable_slots.sql | Feature | Tabel jadwal dan slot alokasi waktu mengajar. |
| 045_dossiers.sql | Feature | Pencatatan dokumen/dossier guru dan murid. |
| 046_rbac_10_role_matrix.sql | Auth | Matriks izin (permissions) lanjutan berbasis peran 1.0. |
| 047_cp_tagging.sql | Curriculum | Penandaan Capaian Pembelajaran (CP) pada tugas/kuis. |
| 048_gradebook_dual_mode.sql | Gradebook | Dukungan mode penilaian ganda (formatif & sumatif). |
| 049_nilai_per_cp.sql | Gradebook | Agregasi dan pencatatan nilai per Capaian Pembelajaran. |
| 050_akm_question_type.sql | Feature | Tabel/tipe pendukung soal Asesmen Kompetensi Minimum (AKM). |
| 051_p5_module.sql | Feature | Dukungan modul Projek Penguatan Profil Pelajar Pancasila (P5). |
| 052_domain_events_outbox.sql | System | Tabel outbox pattern untuk event driven domain logic. |
| 053_rapor_kurmer.sql | Feature | Struktur data rapor Kurikulum Merdeka. |
| 054_finance_midtrans.sql | Integration | Tabel untuk pencatatan pembayaran Midtrans. |
| 055_bos_expense_tracking.sql | Feature | Tabel laporan pengeluaran dana BOS (Bantuan Operasional Sekolah). |
| 056_ppdb_flow.sql | Feature | Tabel dukungan untuk sistem Penerimaan Peserta Didik Baru (PPDB). |
| 057_integrations.sql | Integration | Manajemen token/kunci aplikasi pihak ketiga. |
| 058_ai_polish.sql | Feature | Perbaikan skema untuk fitur AI polishing teks. |
| 059_audit_rate_limit_perf.sql | Performance | Optimalisasi audit dan pembatasan laju request (rate limit). |
| 060_counseling_parent_links_sikap.sql | Feature | Data konseling, akses wali murid, dan nilai sikap. |
| 061_app_audit_triggers.sql | System | Pemicu (triggers) database untuk mengisi tabel log audit. |
| 062_rapor_autogen_rpc.sql | RPC | Endpoint pembuat laporan rapor otomatis akhir semester. |
| 063_rombel_attendance.sql | Feature | Pencatatan absensi spesifik tingkat rombel. |
| 064_stub_tables.sql | Schema | Penambahan placeholder untuk fitur masa depan. |
| 065_gradebook_baseline.sql | Gradebook | Nilai dasar dan rentang bobot penilaian. |
| 066_role_enum_completeness.sql | Schema | Melengkapi tipe enumerasi `app_role`. |
| 067_idempotent_auto_modules.sql | System | Modifikasi modul agar mendukung eksekusi ulang (idempotent). |
| 068_sync_user_roles_to_granular.sql | Auth | Sinkronisasi data role aplikasi dengan permission granular. |
| 069_classes_rombel_id.sql | Schema | Mengikat kelas ke rombel induknya. |
| 070_event_handler_idempotency.sql | System | Mencegah duplikasi data dalam proses penanganan event. |
| 071_ai_rate_limit.sql | Feature | Threshold rate limiter spesifik query AI. |
| 072_parent_invoices_rpc.sql | RPC | Menarik riwayat tagihan bulanan siswa untuk wali murid. |
| 073_refresh_tokens_session_metadata.sql | Auth | Pelacakan metadata dari perangkat penyimpan token refresh. |
| 074_tenant_invites_and_settings.sql | Schema | Memperluas skema undangan dan konfigurasi spesifik tenant. |
| 075_tenant_invites_global_unique_code.sql | Schema | Memastikan kode tautan bergabung dengan tenant unik secara global. |

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
