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
| 018_fix_backend_schema_bugs.sql | Schema | Perbaikan bug pada skema backend. |
| 019_audit_fixes.sql | Audit | Perbaikan tabel audit. |
| 020_fix_rpc_signatures.sql | RPC | Penyesuaian signature RPC. |
| 021_rpc_json.sql | RPC | Konversi input/output RPC menjadi format JSON. |
| 022_align_table_columns.sql | Schema | Penyelarasan kolom pada tabel. |
| 023_rpc_stubs.sql | RPC | Penambahan stub untuk fungsi-fungsi RPC baru. |
| 024_course_review_workflow.sql | Feature | Menambahkan workflow review untuk kursus. |
| 025_personal_and_multi_tenant.sql | Schema | Modifikasi skema untuk tenant personal dan multi-tenant. |
| 026_join_code_and_slugify.sql | Feature | Kode bergabung dan slugifikasi. |
| 027_p2_backlog.sql | Schema | Migrasi untuk backlog P2. |
| 028_p3_tenant_settings_and_roles.sql | Schema | Pengaturan tenant dan peran untuk P3. |
| 029_add_admin_notification_types.sql | Feature | Tambahan tipe notifikasi untuk admin. |
| 030_admin_stub_tables_and_rpcs.sql | Schema | Stub tabel dan RPC untuk antarmuka admin. |
| 031_qa_schema_gaps.sql | Schema | Penambalan celah pada skema QA. |
| 032_qa_rpcs.sql | RPC | Tambahan RPC untuk keperluan QA. |
| 033_fix_search_questions_return_json.sql | RPC | Memperbaiki pencarian pertanyaan agar mengembalikan JSON. |
| 034_lesson_progress_monitor_rpc.sql | RPC | RPC untuk memantau progres pelajaran. |
| 035_admin_backfill.sql | Data | Backfill data untuk fungsi admin. |
| 036_confirm_demo_seed_users.sql | Data | Konfirmasi data seeding pengguna demo. |
| 037_qa_sweep_fixes.sql | Fixes | Pembersihan dan perbaikan QA. |
| 037_seed_modules_missing_rpcs_and_auth_uid.sql | Schema | Mengatasi RPC yang kurang dan auth uid pada module seed. |
| 038_fix_get_tenant_users_user_id_alias.sql | RPC | Perbaikan alias user id untuk mendapatkan pengguna di suatu tenant. |

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
