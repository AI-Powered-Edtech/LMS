# EduSync LMS — Accessibility Guide

Panduan aksesibilitas (a11y) untuk EduSync LMS. Semua komponen harus memenuhi WCAG 2.1 Level AA.

## A11y Standards

| Feature         | Keyboard Nav | Screen Reader | Color Contrast | Focus Management |
| --------------- | ------------ | ------------- | -------------- | ---------------- |
| administration  | ✅           | ✅            | ✅ AA          | ✅               |
| ai-tutor        | ✅           | ✅            | ✅ AA          | ✅               |
| analytics       | ✅           | ✅            | ✅ AA          | ✅               |
| announcements   | ✅           | ✅            | ✅ AA          | ✅               |
| assignments     | ✅           | ✅            | ✅ AA          | ✅               |
| calendar        | ✅           | ✅            | ✅ AA          | ✅               |
| classroom       | ✅           | ✅            | ✅ AA          | ✅               |
| courses         | ✅           | ✅            | ✅ AA          | ✅               |
| dashboards      | ✅           | ✅            | ✅ AA          | ✅               |
| discussions     | ✅           | ✅            | ✅ AA          | ✅               |
| gamification    | ✅           | ✅            | ✅ AA          | ✅               |
| gradebook       | ✅           | ✅            | ✅ AA          | ✅               |
| guidance        | ✅           | ✅            | ✅ AA          | ✅               |
| lessons         | ✅           | ✅            | ✅ AA          | ✅               |
| moderation      | ✅           | ✅            | ✅ AA          | ✅               |
| notifications   | ✅           | ✅            | ✅ AA          | ✅               |
| onboarding      | ✅           | ✅            | ✅ AA          | ✅               |
| progress        | ✅           | ✅            | ✅ AA          | ✅               |
| question-bank   | ✅           | ✅            | ✅ AA          | ✅               |
| quizzes         | ✅           | ✅            | ✅ AA          | ✅               |
| recommendations | ✅           | ✅            | ✅ AA          | ✅               |
| reports         | ✅           | ✅            | ✅ AA          | ✅               |
| storage         | ✅           | ✅            | ✅ AA          | ✅               |
| struggle        | ✅           | ✅            | ✅ AA          | ✅               |

## Implementation Guidelines

### Keyboard Navigation

Semua interaksi harus bisa dilakukan via keyboard. Gunakan `tabIndex`, `onKeyDown`, dan focus trapping pada modal.

### Screen Reader Support

Gunakan semantic HTML, ARIA labels, dan live regions. Skeleton components menggunakan `role="status"` dan `aria-busy="true"`.

### Dark Mode

Semua feature mendukung dark mode. Pastikan color contrast ratio ≥ 4.5:1 untuk teks normal dan ≥ 3:1 untuk teks besar di kedua mode.

## Feature-Specific A11y

- **administration**: Administrasi — Mendukung keyboard navigation dan screen reader
- **ai-tutor**: AI Tutor — Mendukung keyboard navigation dan screen reader
- **analytics**: Analitik — Mendukung keyboard navigation dan screen reader
- **announcements**: Pengumuman — Mendukung keyboard navigation dan screen reader
- **assignments**: Tugas — Mendukung keyboard navigation dan screen reader
- **calendar**: Kalender — Mendukung keyboard navigation dan screen reader
- **classroom**: Kelas — Mendukung keyboard navigation dan screen reader
- **courses**: Kursus — Mendukung keyboard navigation dan screen reader
- **dashboards**: Dashboard — Mendukung keyboard navigation dan screen reader
- **discussions**: Diskusi — Mendukung keyboard navigation dan screen reader
- **gamification**: Gamifikasi — Mendukung keyboard navigation dan screen reader
- **gradebook**: Buku Nilai — Mendukung keyboard navigation dan screen reader
- **guidance**: Panduan — Mendukung keyboard navigation dan screen reader
- **lessons**: Pelajaran — Mendukung keyboard navigation dan screen reader
- **moderation**: Moderasi — Mendukung keyboard navigation dan screen reader
- **notifications**: Notifikasi — Mendukung keyboard navigation dan screen reader
- **onboarding**: Onboarding — Mendukung keyboard navigation dan screen reader
- **progress**: Kemajuan Belajar — Mendukung keyboard navigation dan screen reader
- **question-bank**: Bank Soal — Mendukung keyboard navigation dan screen reader
- **quizzes**: Kuis — Mendukung keyboard navigation dan screen reader
- **recommendations**: Rekomendasi — Mendukung keyboard navigation dan screen reader
- **reports**: Laporan — Mendukung keyboard navigation dan screen reader
- **storage**: Penyimpanan — Mendukung keyboard navigation dan screen reader
- **struggle**: Deteksi Kesulitan — Mendukung keyboard navigation dan screen reader

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
