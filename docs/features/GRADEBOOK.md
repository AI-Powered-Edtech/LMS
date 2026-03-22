# Buku Nilai (gradebook)

## Overview

Buku nilai digital untuk guru. Pencatatan nilai per kategori, kalkulasi otomatis, dan pelaporan ke orang tua.

Modul ini merupakan bagian dari arsitektur feature-module EduSync LMS, terletak di `src/features/gradebook/`. Setiap feature module memiliki struktur standar: api/, queries/, hooks/, types/, components/, dan **tests**/.

## Domain

**Assessment** — Modul ini termasuk dalam domain Assessment bersama dengan feature terkait lainnya.

## Arsitektur

```
src/features/gradebook/
├── api/           # Supabase service layer (query, mutation, RPC calls)
├── queries/       # React Query hooks dengan query keys
├── hooks/         # Custom React hooks untuk state & logic
├── types/         # TypeScript interfaces & type definitions
├── components/    # React components (dark mode + skeleton loading)
└── __tests__/     # Unit tests (vitest + mock supabase)
```

### Interaksi dengan Supabase

Semua data di-query melalui Supabase JS client dengan RLS enforcement. Setiap query menggunakan `tenant_id` untuk isolasi multi-tenant.

### Tenant Isolation

Tabel yang digunakan oleh gradebook dilindungi oleh RLS policy:

```sql
CREATE POLICY "tenant_isolation" ON grade_entries
  USING (tenant_id = (SELECT get_my_tenant_id()));
```

## Database Tables

- `grade_entries` — Tabel grade entries untuk Buku Nilai
- `grade_categories` — Tabel grade categories untuk Buku Nilai

## RPC / Edge Functions

Fungsi-fungsi database yang terkait dengan gradebook:

- `get_gradebook_stats()` — Statistik aggregat
- `search_gradebook()` — Full-text search

## UI Pages

| Route                      | Deskripsi                      | Role    |
| -------------------------- | ------------------------------ | ------- |
| `/#/app/student/gradebook` | Halaman Buku Nilai untuk siswa | Student |
| `/#/app/teacher/gradebook` | Halaman Buku Nilai untuk guru  | Teacher |
| `/#/app/admin/gradebook`   | Halaman Buku Nilai untuk admin | Admin   |

## Komponen

- **GradebookSkeleton** — Loading skeleton
- **GradebookCard** — Kartu item
- **GradebookTable** — Tabel data
- **GradebookStats** — Kartu statistik
- **GradebookFilterBar** — Bar pencarian dan filter

## Dependencies

Feature yang di-depend oleh gradebook:

- **administration** — Administrasi
- **ai-tutor** — AI Tutor
- **analytics** — Analitik
- **announcements** — Pengumuman
- **assignments** — Tugas

Feature yang depend ke gradebook:

- **calendar** — Kalender
- **classroom** — Kelas
- **courses** — Kursus
- **dashboards** — Dashboard
- **discussions** — Diskusi

## Known Issues

- Query large dataset perlu pagination (limit 50 per page)
- RLS policy harus di-test setelah setiap schema migration

## Testing

```bash
npx vitest run src/features/gradebook
```

## Related Features

Semua 24 feature module dalam EduSync LMS yang saling terintegrasi:

- **administration** — Administrasi: Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data
- **ai-tutor** — AI Tutor: Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa
- **analytics** — Analitik: Dashboard analitik komprehensif untuk guru dan admin
- **announcements** — Pengumuman: Sistem pengumuman sekolah
- **assignments** — Tugas: Manajemen tugas dari pembuatan hingga penilaian
- **calendar** — Kalender: Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah
- **classroom** — Kelas: Manajemen kelas virtual dan fisik
- **courses** — Kursus: Core learning module
- **dashboards** — Dashboard: Dashboard kustom dengan widget builder
- **discussions** — Diskusi: Forum diskusi per kursus
- **gamification** — Gamifikasi: Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard
- **gradebook** — Buku Nilai: Buku nilai digital untuk guru
- **guidance** — Panduan: Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)
- **lessons** — Pelajaran: Konten pelajaran dengan block-based editor
- **moderation** — Moderasi: Moderasi konten user-generated (diskusi, komentar)
- **notifications** — Notifikasi: Sistem notifikasi real-time dengan bell icon dan panel
- **onboarding** — Onboarding: Wizard onboarding untuk pengguna baru
- **progress** — Kemajuan Belajar: Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran
- **question-bank** — Bank Soal: Repositori soal yang bisa digunakan ulang di berbagai kuis
- **quizzes** — Kuis: Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal
- **recommendations** — Rekomendasi: Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa
- **reports** — Laporan: Generator laporan akademik, keuangan (SPP), PPDB, dan custom
- **storage** — Penyimpanan: Manajemen file dan media untuk materi pembelajaran
- **struggle** — Deteksi Kesulitan: Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa

## Referensi

- [ARCHITECTURE.md](../ARCHITECTURE.md) — Arsitektur sistem
- [DATABASE.md](../DATABASE.md) — Referensi tabel dan RPC
- [SECURITY.md](../SECURITY.md) — Model keamanan dan RLS
- [AUTH.md](../AUTH.md) — Flow autentikasi
- [TESTING.md](../TESTING.md) — Panduan testing
