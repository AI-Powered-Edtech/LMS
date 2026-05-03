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
| 018_fix_backend_schema_bugs.sql | Fix | Perbaikan skema yang ditemukan saat pengujian backend VIL. |
| 019_audit_fixes.sql | Audit | Penambahan kolom dan tabel yang diperlukan untuk modul audit log. |
| 020_fix_rpc_signatures.sql | RPC | Penyelarasan signature RPC agar konsisten dengan payload backend. |
| 021_rpc_json.sql | RPC | Dukungan format JSON untuk input/output RPC agar kompatibel dengan API. |
| 022_align_table_columns.sql | Schema | Penyelarasan penamaan dan tipe data kolom tabel di seluruh domain. |
| 023_rpc_stubs.sql | RPC | Pembuatan RPC stub untuk memfasilitasi endpoint yang belum diimplementasikan di backend. |
| 024_course_review_workflow.sql | Feature | Tabel dan status enum untuk mendukung workflow review (draft, review, published). |
| 025_personal_and_multi_tenant.sql | Multi-Tenant | Skema dasar untuk mode operasional personal (single-tenant fallback) dan multi-tenant. |
| 026_join_code_and_slugify.sql | Feature | Menambahkan generate join code dan slug URL (misalnya, di rombel/courses). |
| 027_p2_backlog.sql | Schema | Penambahan skema dan fungsi-fungsi backlog Phase 2. |
| 028_p3_tenant_settings_and_roles.sql | Settings | Perluasan pengaturan tenant dan pengelolaan role (Phase 3). |
| 029_add_admin_notification_types.sql | Notifications| Tipe dan kategori notifikasi khusus untuk level admin. |
| 030_admin_stub_tables_and_rpcs.sql | Admin | Tabel stub dan fungsi RPC sementara untuk dashboard admin. |
| 031_qa_schema_gaps.sql | QA | Penutupan celah skema (schema gaps) hasil audit QA. |
| 032_qa_rpcs.sql | QA | Fungsi-fungsi RPC tambahan hasil temuan fase Quality Assurance. |
| 033_fix_search_questions_return_json.sql | RPC | Memperbaiki tipe kembalian RPC pencarian pertanyaan (question bank) ke JSON/JSONB. |
| 034_lesson_progress_monitor_rpc.sql | RPC | RPC khusus untuk query dan pembaruan statistik progress lesson (materi belajar). |
| 035_admin_backfill.sql | Admin | Backfill data admin awal (setup superadmin dsb.). |
| 036_confirm_demo_seed_users.sql | Seed | Verifikasi dan sinkronisasi seed users lingkungan demonstrasi. |
| 037_qa_sweep_fixes.sql | QA | Perbaikan massal (sweep) berbasis umpan balik QA. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | RPC | Pengisian RPC dan skema modul yang sempat terlewat beserta penggunaan auth.uid(). |
| 038_fix_get_tenant_users_user_id_alias.sql | RPC | Koreksi alias query RPC get_tenant_users (menyesuaikan kolom id dengan entitas frontend). |
| 039_academic_years.sql | Domain | Tabel `academic_years` untuk data induk tahun ajaran. |
| 040_semesters_link_academic_year.sql | Domain | Relasi `semesters` dengan tabel `academic_years`. |
| 041_grade_levels.sql | Domain | Pengelolaan level kelas / jenjang (Grade Levels). |
| 042_rombel.sql | Domain | Konsep "Rombel" (Rombongan Belajar) alias grup/kelas lokal tenant Indonesia. |
| 043_subjects_and_curriculum_items.sql | Domain | Mata pelajaran (`subjects`) dan entitas turunan kurikulum (`curriculum_items`). |
| 044_timetable_slots.sql | Domain | Struktur penjadwalan kelas / jam pelajaran (`timetable_slots`). |
| 045_dossiers.sql | Domain | Rekam jejak/berkas digital (`dossiers`) siswa maupun staf. |
| 046_rbac_10_role_matrix.sql | Auth | Modifikasi matriks role-based access control (RBAC) 1.0 (5 role inti + capabilities). |
| 047_cp_tagging.sql | Feature | Menambahkan kemampuan *tagging* Capaian Pembelajaran (CP) ke elemen kurikulum/kuis. |
| 048_gradebook_dual_mode.sql | Feature | Kolom dan setup pendukung gradebook ganda (Kurikulum Merdeka vs. Standar). |
| 049_nilai_per_cp.sql | Domain | Tabel dan struktur rekap `nilai` spesifik di level Capaian Pembelajaran (CP). |
| 050_akm_question_type.sql | Feature | Setup format dan tipe soal khusus AKM (Asesmen Kompetensi Minimum). |
| 051_p5_module.sql | Feature | Skema/fitur Modul P5 (Projek Penguatan Profil Pelajar Pancasila). |
| 052_domain_events_outbox.sql | System | Tabel outbox pola *transactional outbox* untuk events log. |
| 053_rapor_kurmer.sql | Feature | Fitur pelaporan Rapor Kurikulum Merdeka (Kurmer). |
| 054_finance_midtrans.sql | Feature | Struktur data tracking pembayaran dan tagihan Midtrans. |
| 055_bos_expense_tracking.sql | Feature | Pelacakan pengeluaran dana BOS (Bantuan Operasional Sekolah). |
| 056_ppdb_flow.sql | Feature | Tabel dan logika dasar untuk workflow PPDB (Penerimaan Peserta Didik Baru). |
| 057_integrations.sql | Integrations | Metadata token dan credentials platform integrasi eksternal lainnya. |
| 058_ai_polish.sql | Feature | Kolom history dan logging untuk aksi "AI Polish / Rewrite". |
| 059_audit_rate_limit_perf.sql | Performance | Penyempurnaan performa tabel log audit beserta rate limiter. |
| 060_counseling_parent_links_sikap.sql | Domain | Tabel konseling, akses pelaporan (parent links), dan metrik evaluasi sikap. |
| 061_app_audit_triggers.sql | System | Trigger khusus audit database yang men-track `updated_at` dan entitas pengubah. |
| 062_rapor_autogen_rpc.sql | Feature | RPC yang bertugas melakukan komputasi dan autogenerate dokumen rapor. |
| 063_rombel_attendance.sql | Domain | Pencatatan rekap absensi di level rombel (Rombongan Belajar). |
| 064_stub_tables.sql | Schema | Kumpulan stub tables lainnya guna memenuhi tipe TS yang digenerate GraphQL/Supabase. |
| 065_gradebook_baseline.sql | Domain | Schema gradebook baseline dan bobot (weights). |
| 066_role_enum_completeness.sql | Auth | Melengkapi enumerasi ENUM user roles (student, teacher, principal, parent, admin). |
| 067_idempotent_auto_modules.sql | Modules | Fungsi otomatis idempotency pada task modul-modul belajar. |
| 068_sync_user_roles_to_granular.sql | Sync | Skrip migrasi/sync data *user roles* statis menjadi bentuk role permissions (granular). |
| 069_classes_rombel_id.sql | Relation | Menambahkan dan mem-validasi *foreign key* `rombel_id` di tabel classes. |
| 070_event_handler_idempotency.sql | System | Memastikan tabel internal queues/events tahan terhadap replikasi/pesan ganda. |
| 071_ai_rate_limit.sql | Auth | Logika spesifik *rate limiting* pemakaian proxy LLM / AI per user/tenant. |
| 072_parent_invoices_rpc.sql | RPC | Fungsi RPC khusus guna rekap tagihan (invoice) portal orangtua (Parent Portal). |
| 073_refresh_tokens_session_metadata.sql | Auth | Extended columns untuk `refresh_tokens` guna mendukung session metadata & revocation. |
| 074_tenant_invites_and_settings.sql | Domain | Ekstensi pengelolaan setting per-tenant (preferences, logo, themes). |
| 075_tenant_invites_global_unique_code.sql | Domain | Update constraint token invitasikan per-tenant agar terjamin unique secara global. |
