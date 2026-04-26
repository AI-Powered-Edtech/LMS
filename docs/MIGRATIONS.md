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
| 018_fix_backend_schema_bugs.sql | Schema | Memperbaiki bug pada skema database backend. |
| 019_audit_fixes.sql | Audit | Memperbaiki masalah audit. |
| 020_fix_rpc_signatures.sql | Schema | Memperbaiki signature RPC. |
| 021_rpc_json.sql | Schema | Menambahkan dukungan JSON untuk RPC. |
| 022_align_table_columns.sql | Schema | Menyelaraskan kolom tabel. |
| 023_rpc_stubs.sql | Schema | Menambahkan stubs RPC. |
| 024_course_review_workflow.sql | Feature | Menambahkan alur kerja course review. |
| 025_personal_and_multi_tenant.sql | Feature | Mendukung tenant personal dan multi-tenant. |
| 026_join_code_and_slugify.sql | Feature | Menambahkan fungsi join code dan slugify. |
| 027_p2_backlog.sql | Schema | Menggabungkan skema P2 backlog. |
| 028_p3_tenant_settings_and_roles.sql | Feature | Menambahkan pengaturan tenant dan peran. |
| 029_add_admin_notification_types.sql | Feature | Menambahkan tipe notifikasi admin. |
| 030_admin_stub_tables_and_rpcs.sql | Schema | Tabel stub admin dan RPC. |
| 031_qa_schema_gaps.sql | Schema | Memperbaiki gap skema QA. |
| 032_qa_rpcs.sql | Schema | Memperbaiki RPC untuk QA. |
| 033_fix_search_questions_return_json.sql | Schema | Memperbaiki tipe return JSON untuk pencarian pertanyaan. |
| 034_lesson_progress_monitor_rpc.sql | Feature | Menambahkan RPC monitor progres pelajaran. |
| 035_admin_backfill.sql | Data | Melakukan backfill data admin. |
| 036_confirm_demo_seed_users.sql | Data | Mengonfirmasi pengguna seed demo. |
| 037_qa_sweep_fixes.sql | Schema | Memperbaiki perbaikan sweep QA. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Schema | Menambahkan modul seed, RPC yang hilang dan auth UID. |
| 038_fix_get_tenant_users_user_id_alias.sql | Schema | Memperbaiki alias `user_id` untuk fungsi get tenant users. |
| 039_academic_years.sql | Schema | Tabel data akademik tahunan. |
| 040_semesters_link_academic_year.sql | Schema | Relasi semester ke tahun akademik. |
| 041_grade_levels.sql | Schema | Tabel data tingkat kelas (grade levels). |
| 042_rombel.sql | Schema | Tabel Rombongan Belajar (Rombel). |
| 043_subjects_and_curriculum_items.sql | Schema | Tabel mata pelajaran dan item kurikulum. |
| 044_timetable_slots.sql | Schema | Tabel slot jadwal pelajaran. |
| 045_dossiers.sql | Schema | Tabel arsip / dossier siswa dan guru. |
| 046_rbac_10_role_matrix.sql | Auth | Matriks peran kontrol akses berbasis peran (RBAC). |
| 047_cp_tagging.sql | Feature | Penandaan Capaian Pembelajaran (CP). |
| 048_gradebook_dual_mode.sql | Feature | Buku nilai dengan mode ganda (dual mode). |
| 049_nilai_per_cp.sql | Schema | Tabel data nilai per Capaian Pembelajaran. |
| 050_akm_question_type.sql | Schema | Tabel dan enum tipe soal AKM. |
| 051_p5_module.sql | Feature | Modul Proyek Penguatan Profil Pelajar Pancasila (P5). |
| 052_domain_events_outbox.sql | System | Tabel event domain dan outbox. |
| 053_rapor_kurmer.sql | Feature | Struktur Rapor Kurikulum Merdeka. |
| 054_finance_midtrans.sql | Feature | Integrasi pembayaran keuangan (Midtrans). |
| 055_bos_expense_tracking.sql | Feature | Tabel pelacakan dana BOS. |
| 056_ppdb_flow.sql | Feature | Alur pendaftaran peserta didik baru (PPDB). |
| 057_integrations.sql | Feature | Tabel manajemen integrasi (SSO / LTI). |
| 058_ai_polish.sql | Feature | Tabel untuk pemolesan dan rekomendasi AI. |
| 059_audit_rate_limit_perf.sql | Performance | Peningkatan batasan rate limit audit. |
| 060_counseling_parent_links_sikap.sql | Feature | Konseling, relasi orang tua, dan nilai sikap. |
| 061_app_audit_triggers.sql | Audit | Trigger tambahan untuk audit log aplikasi. |
| 062_rapor_autogen_rpc.sql | Feature | RPC pembuatan rapor otomatis. |
| 063_rombel_attendance.sql | Feature | Presensi Rombongan Belajar (Rombel). |
| 064_stub_tables.sql | Schema | Pembuatan tabel placeholder tambahan. |
| 065_gradebook_baseline.sql | Feature | Standar dasar buku nilai (gradebook). |
| 066_role_enum_completeness.sql | Schema | Penambahan kelengkapan pada enum Role. |
| 067_idempotent_auto_modules.sql | System | Menjadikan inisiasi auto-modules bersifat idempoten. |
| 068_sync_user_roles_to_granular.sql | Auth | Sinkronisasi tipe Role dengan hak akses spesifik. |
| 069_classes_rombel_id.sql | Schema | Menambahkan relasi Class ke Rombel ID. |
| 070_event_handler_idempotency.sql | System | Peningkatan mekanisme idempotensi handler event. |
| 071_ai_rate_limit.sql | System | Penyesuaian skema limit penggunaan fitur AI. |
| 072_parent_invoices_rpc.sql | Feature | RPC tagihan keungan untuk akses orang tua. |
| 073_refresh_tokens_session_metadata.sql | Auth | Menambahkan metadata sesi ke token otentikasi. |
| 074_tenant_invites_and_settings.sql | Feature | Pengaturan konfigurasi lanjutan dan undangan Tenant. |
| 075_tenant_invites_global_unique_code.sql | System | Memastikan kode undangan unik secara global. |

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
