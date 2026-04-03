# EduSync LMS — Data Flow Guide

Panduan alur data dan state management di EduSync LMS.

## State Management Architecture

| Layer        | Technology      | Feature Modules             |
| ------------ | --------------- | --------------------------- |
| Server State | React Query v5  | Semua 24 feature modules    |
| Local State  | Zustand v5      | quizzes (quiz player store) |
| URL State    | React Router v7 | Semua route-aware features  |

## Data Flow per Feature

### administration

```
User Action → administration Component → administration Hook/Query → administration Service → Supabase (RLS) → PostgreSQL
```

Data Administrasi mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### ai-tutor

```
User Action → ai-tutor Component → ai-tutor Hook/Query → ai-tutor Service → Supabase (RLS) → PostgreSQL
```

Data AI Tutor mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### analytics

```
User Action → analytics Component → analytics Hook/Query → analytics Service → Supabase (RLS) → PostgreSQL
```

Data Analitik mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### announcements

```
User Action → announcements Component → announcements Hook/Query → announcements Service → Supabase (RLS) → PostgreSQL
```

Data Pengumuman mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### assignments

```
User Action → assignments Component → assignments Hook/Query → assignments Service → Supabase (RLS) → PostgreSQL
```

Data Tugas mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### calendar

```
User Action → calendar Component → calendar Hook/Query → calendar Service → Supabase (RLS) → PostgreSQL
```

Data Kalender mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### classroom

```
User Action → classroom Component → classroom Hook/Query → classroom Service → Supabase (RLS) → PostgreSQL
```

Data Kelas mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### courses

```
User Action → courses Component → courses Hook/Query → courses Service → Supabase (RLS) → PostgreSQL
```

Data Kursus mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### dashboards

```
User Action → dashboards Component → dashboards Hook/Query → dashboards Service → Supabase (RLS) → PostgreSQL
```

Data Dashboard mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### discussions

```
User Action → discussions Component → discussions Hook/Query → discussions Service → Supabase (RLS) → PostgreSQL
```

Data Diskusi mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### gamification

```
User Action → gamification Component → gamification Hook/Query → gamification Service → Supabase (RLS) → PostgreSQL
```

Data Gamifikasi mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### gradebook

```
User Action → gradebook Component → gradebook Hook/Query → gradebook Service → Supabase (RLS) → PostgreSQL
```

Data Buku Nilai mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### guidance

```
User Action → guidance Component → guidance Hook/Query → guidance Service → Supabase (RLS) → PostgreSQL
```

Data Panduan mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### lessons

```
User Action → lessons Component → lessons Hook/Query → lessons Service → Supabase (RLS) → PostgreSQL
```

Data Pelajaran mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### moderation

```
User Action → moderation Component → moderation Hook/Query → moderation Service → Supabase (RLS) → PostgreSQL
```

Data Moderasi mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### notifications

```
User Action → notifications Component → notifications Hook/Query → notifications Service → Supabase (RLS) → PostgreSQL
```

Data Notifikasi mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### onboarding

```
User Action → onboarding Component → onboarding Hook/Query → onboarding Service → Supabase (RLS) → PostgreSQL
```

Data Onboarding mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### progress

```
User Action → progress Component → progress Hook/Query → progress Service → Supabase (RLS) → PostgreSQL
```

Data Kemajuan Belajar mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### question-bank

```
User Action → question-bank Component → question-bank Hook/Query → question-bank Service → Supabase (RLS) → PostgreSQL
```

Data Bank Soal mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### quizzes

```
User Action → quizzes Component → quizzes Hook/Query → quizzes Service → Supabase (RLS) → PostgreSQL
```

Data Kuis mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### recommendations

```
User Action → recommendations Component → recommendations Hook/Query → recommendations Service → Supabase (RLS) → PostgreSQL
```

Data Rekomendasi mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### reports

```
User Action → reports Component → reports Hook/Query → reports Service → Supabase (RLS) → PostgreSQL
```

Data Laporan mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### storage

```
User Action → storage Component → storage Hook/Query → storage Service → Supabase (RLS) → PostgreSQL
```

Data Penyimpanan mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

### struggle

```
User Action → struggle Component → struggle Hook/Query → struggle Service → Supabase (RLS) → PostgreSQL
```

Data Deteksi Kesulitan mengalir dari UI melalui React Query hooks ke Supabase service layer. RLS policies memastikan tenant isolation pada level database.

## Realtime Subscriptions

Feature berikut menggunakan Supabase Realtime untuk live updates:

- **notifications** — Real-time notification delivery
- **discussions** — Live comment updates
- **analytics** — Live activity feed
- **dashboards** — Real-time widget data
- **announcements** — New announcement alerts

## Event Batching

High-frequency events dari **analytics**, **progress**, dan **struggle** menggunakan client-side batching sebelum dikirim ke Edge Functions.

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 24 feature module yang saling terintegrasi:

| Feature         | Domain         | Deskripsi                                                                                                                  |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| administration  | Admin          | Administrasi — Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data                                              |
| ai-tutor        | Learning       | AI Tutor — Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa                                    |
| analytics       | Analytics      | Analitik — Dashboard analitik komprehensif untuk guru dan admin                                                            |
| announcements   | Communication  | Pengumuman — Sistem pengumuman sekolah                                                                                     |
| assignments     | Assessment     | Tugas — Manajemen tugas dari pembuatan hingga penilaian                                                                    |
| calendar        | Academic       | Kalender — Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah             |
| classroom       | Academic       | Kelas — Manajemen kelas virtual dan fisik                                                                                  |
| courses         | Academic       | Kursus — Core learning module                                                                                              |
| dashboards      | Analytics      | Dashboard — Dashboard kustom dengan widget builder                                                                         |
| discussions     | Communication  | Diskusi — Forum diskusi per kursus                                                                                         |
| gamification    | Engagement     | Gamifikasi — Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard                                  |
| gradebook       | Assessment     | Buku Nilai — Buku nilai digital untuk guru                                                                                 |
| guidance        | Admin          | Panduan — Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)                                                 |
| lessons         | Learning       | Pelajaran — Konten pelajaran dengan block-based editor                                                                     |
| moderation      | Admin          | Moderasi — Moderasi konten user-generated (diskusi, komentar)                                                              |
| notifications   | Communication  | Notifikasi — Sistem notifikasi real-time dengan bell icon dan panel                                                        |
| onboarding      | Admin          | Onboarding — Wizard onboarding untuk pengguna baru                                                                         |
| progress        | Learning       | Kemajuan Belajar — Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran                        |
| question-bank   | Assessment     | Bank Soal — Repositori soal yang bisa digunakan ulang di berbagai kuis                                                     |
| quizzes         | Assessment     | Kuis — Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal               |
| recommendations | Learning       | Rekomendasi — Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa                             |
| reports         | Analytics      | Laporan — Generator laporan akademik, keuangan (SPP), PPDB, dan custom                                                     |
| storage         | Infrastructure | Penyimpanan — Manajemen file dan media untuk materi pembelajaran                                                           |
| struggle        | Analytics      | Deteksi Kesulitan — Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa |

Setiap feature module mengikuti arsitektur standar dengan folder: api/, queries/, hooks/, types/, components/, dan **tests**/. Semua feature mendukung dark mode dan skeleton loading screens.
