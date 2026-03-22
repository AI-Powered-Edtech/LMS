# Dashboard (dashboards)

## Overview

Dashboard kustom dengan widget builder. Guru dan admin bisa membuat dashboard sesuai kebutuhan monitoring.

Modul ini merupakan bagian dari arsitektur feature-module EduSync LMS, terletak di `src/features/dashboards/`. Setiap feature module memiliki struktur standar: api/, queries/, hooks/, types/, components/, dan **tests**/.

## Domain

**Analytics** — Modul ini termasuk dalam domain Analytics bersama dengan feature terkait lainnya.

## Arsitektur

```
src/features/dashboards/
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

Tabel yang digunakan oleh dashboards dilindungi oleh RLS policy:

```sql
CREATE POLICY "tenant_isolation" ON dashboards
  USING (tenant_id = (SELECT get_my_tenant_id()));
```

## Database Tables

- `dashboards` — Tabel dashboards untuk Dashboard
- `dashboard_widgets` — Tabel dashboard widgets untuk Dashboard

## RPC / Edge Functions

Fungsi-fungsi database yang terkait dengan dashboards:

- `get_dashboards_stats()` — Statistik aggregat
- `search_dashboards()` — Full-text search

## UI Pages

| Route                       | Deskripsi                     | Role    |
| --------------------------- | ----------------------------- | ------- |
| `/#/app/student/dashboards` | Halaman Dashboard untuk siswa | Student |
| `/#/app/teacher/dashboards` | Halaman Dashboard untuk guru  | Teacher |
| `/#/app/admin/dashboards`   | Halaman Dashboard untuk admin | Admin   |

## Komponen

- **DashboardsSkeleton** — Loading skeleton
- **DashboardsCard** — Kartu item
- **DashboardsTable** — Tabel data
- **DashboardsStats** — Kartu statistik
- **DashboardsFilterBar** — Bar pencarian dan filter

## Dependencies

Feature yang di-depend oleh dashboards:

- **administration** — Administrasi
- **ai-tutor** — AI Tutor
- **analytics** — Analitik
- **announcements** — Pengumuman
- **assignments** — Tugas

Feature yang depend ke dashboards:

- **calendar** — Kalender
- **classroom** — Kelas
- **courses** — Kursus
- **discussions** — Diskusi
- **gamification** — Gamifikasi

## Known Issues

- Query large dataset perlu pagination (limit 50 per page)
- RLS policy harus di-test setelah setiap schema migration

## Testing

```bash
npx vitest run src/features/dashboards
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
