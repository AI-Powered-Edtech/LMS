# Tugas (assignments)

## Overview

Manajemen tugas dari pembuatan hingga penilaian. Mendukung berbagai tipe tugas dan rubrik penilaian.

Modul ini merupakan bagian dari arsitektur feature-module EduSync LMS, terletak di `src/features/assignments/`. Setiap feature module memiliki struktur standar: api/, queries/, hooks/, types/, components/, dan **tests**/.

## Domain

**Assessment** — Modul ini termasuk dalam domain Assessment bersama dengan feature terkait lainnya.

## Arsitektur

```
src/features/assignments/
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

Tabel yang digunakan oleh assignments dilindungi oleh RLS policy:

```sql
CREATE POLICY "tenant_isolation" ON assignments
  USING (tenant_id = (SELECT get_my_tenant_id()));
```

## Database Tables

- `assignments` — Tabel assignments untuk Tugas
- `assignment_submissions` — Tabel assignment submissions untuk Tugas

## RPC / Edge Functions

Fungsi-fungsi database yang terkait dengan assignments:

- `get_assignments_stats()` — Statistik aggregat
- `search_assignments()` — Full-text search

## UI Pages

| Route                        | Deskripsi                 | Role    |
| ---------------------------- | ------------------------- | ------- |
| `/#/app/student/assignments` | Halaman Tugas untuk siswa | Student |
| `/#/app/teacher/assignments` | Halaman Tugas untuk guru  | Teacher |
| `/#/app/admin/assignments`   | Halaman Tugas untuk admin | Admin   |

## Komponen

- **AssignmentsSkeleton** — Loading skeleton
- **AssignmentsCard** — Kartu item
- **AssignmentsTable** — Tabel data
- **AssignmentsStats** — Kartu statistik
- **AssignmentsFilterBar** — Bar pencarian dan filter

## Dependencies

Feature yang di-depend oleh assignments:

- **administration** — Administrasi
- **ai-tutor** — AI Tutor
- **analytics** — Analitik
- **announcements** — Pengumuman
- **calendar** — Kalender

Feature yang depend ke assignments:

- **classroom** — Kelas
- **courses** — Kursus
- **dashboards** — Dashboard
- **discussions** — Diskusi
- **gamification** — Gamifikasi

## Known Issues

- Query large dataset perlu pagination (limit 50 per page)
- RLS policy harus di-test setelah setiap schema migration

## Testing

```bash
npx vitest run src/features/assignments
```

## Related Features

Semua 49 feature module dalam EduSync LMS yang saling terintegrasi:

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
- [DATABASE_ARCHITECTURE.md](../DATABASE_ARCHITECTURE.md) — Referensi tabel dan RPC
- [SECURITY.md](../SECURITY.md) — Model keamanan dan RLS
- [AUTH.md](../AUTH.md) — Flow autentikasi
- [TESTING.md](../TESTING.md) — Panduan testing
