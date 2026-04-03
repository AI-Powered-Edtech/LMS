# Parent Portal

## Overview

Parent Portal memungkinkan orang tua/wali siswa memantau perkembangan anak secara real-time melalui antarmuka mobile-first yang sederhana. Orang tua dapat melihat nilai, kehadiran, tugas, dan berkomunikasi langsung dengan guru tanpa perlu akun email — cukup menggunakan nomor HP.

---

## Authentication

- **OTP-based registration** via nomor HP (WhatsApp/SMS)
- Auto-link ke profil siswa via tabel `student_parent_links`
- Setelah verifikasi OTP, akun parent dibuat dan langsung ter-link ke data anak
- Fallback: invite link dari sekolah (jika WhatsApp API tidak tersedia)

---

## Features

### Dashboard Utama

- **Traffic Light System**: Hijau (semua baik), Kuning (perlu perhatian), Merah (perlu intervensi)
- Nilai terbaru per mata pelajaran dengan trend arrow
- Status kehadiran minggu ini (grid hari)
- Daftar tugas yang overdue atau belum dikumpulkan

### Nilai (`/app/parent/nilai`)

- Detail nilai per mata pelajaran (semua subject)
- Trend nilai dari waktu ke waktu
- Breakdown per assignment dan kuis

### Kehadiran (`/app/parent/kehadiran`)

- Kalender kehadiran bulanan
- Status per hari: hadir / tidak hadir / izin / sakit
- Rekapitulasi persentase kehadiran

### Pesan ke Guru (`/app/parent/pesan`)

- In-app messaging antara parent dan guru
- Thread per guru (bukan group chat)
- Notifikasi real-time saat guru membalas
- Template pesan cepat: "Anak saya sakit", "Minta jadwal meeting", dll.

### Laporan Bulanan (`/app/parent/laporan`)

- Auto-generate laporan bulanan per anak
- Format PDF dengan branding sekolah
- Konten: nilai, kehadiran, pencapaian, ringkasan aktivitas
- Download dari dashboard atau kirim via WhatsApp

### Pengaturan Notifikasi (`/app/parent/pengaturan`)

- Konfigurasi daily digest (waktu pengiriman, channel: WhatsApp/in-app)
- Toggle jenis notifikasi yang ingin diterima
- Kelola preferensi laporan bulanan

---

## Database Tables

| Tabel                     | Deskripsi                                                            |
| ------------------------- | -------------------------------------------------------------------- |
| `student_parent_links`    | Relasi orang tua ↔ siswa (dengan keterangan hubungan: ayah/ibu/wali) |
| `parent_otp_codes`        | OTP sementara untuk proses registrasi via nomor HP                   |
| `parent_digest_settings`  | Preferensi notifikasi harian per parent                              |
| `parent_teacher_threads`  | Thread percakapan parent ↔ guru per siswa                            |
| `parent_teacher_messages` | Pesan individual dalam setiap thread                                 |

---

## RPCs

| RPC                                  | Deskripsi                                                        |
| ------------------------------------ | ---------------------------------------------------------------- |
| `get_my_children()`                  | Fetch daftar anak yang ter-link ke akun parent yang sedang login |
| `request_parent_otp(p_phone)`        | Kirim OTP ke nomor HP untuk proses registrasi                    |
| `verify_parent_otp(p_phone, p_code)` | Verifikasi OTP dan aktifkan akun parent                          |

---

## Edge Functions

| Function                 | Deskripsi                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| `send-whatsapp-otp`      | Kirim OTP via WhatsApp API (Wablas/Fonnte)                         |
| `send-parent-digest`     | Generate dan kirim ringkasan harian via WhatsApp (cron: 17:00 WIB) |
| `generate-parent-report` | Generate laporan bulanan PDF per anak                              |

---

## Routes

| Path                          | Komponen                  | Deskripsi                                         |
| ----------------------------- | ------------------------- | ------------------------------------------------- |
| `/register-parent`            | `ParentRegistration`      | Registrasi OTP (public)                           |
| `/app/parent`                 | `ParentDashboard`         | Dashboard utama (traffic light, nilai, kehadiran) |
| `/app/parent/nilai`           | `ChildGradeView`          | Detail nilai per mata pelajaran                   |
| `/app/parent/kehadiran`       | `ChildAttendanceCalendar` | Kalender kehadiran                                |
| `/app/parent/pesan`           | `MessageTeacher`          | Daftar percakapan dengan guru                     |
| `/app/parent/pesan/:threadId` | `MessageThreadView`       | In-app chat thread                                |
| `/app/parent/laporan`         | `MonthlyReportPage`       | Laporan bulanan PDF                               |
| `/app/parent/pengaturan`      | `DigestSettings`          | Pengaturan notifikasi                             |

---

## Feature Module

```
src/features/parent/
├── api/
│   ├── parentApi.ts         ← Data anak (nilai, kehadiran, tugas)
│   └── messageApi.ts        ← Messaging API
├── components/
│   ├── ParentDashboard.tsx
│   ├── TrafficLightIndicator.tsx
│   ├── ChildGradeCard.tsx
│   ├── ChildAttendanceGrid.tsx
│   ├── MessageTeacher.tsx
│   └── MonthlyReport.tsx
├── hooks/
│   └── useChildData.ts
└── index.ts
```

---

## Security & RLS

- Parent **hanya** dapat mengakses data anak yang terdaftar di `student_parent_links`
- Tidak ada akses lintas tenant
- Pesan parent–guru hanya visible untuk kedua belah pihak dalam thread
- OTP expire dalam 10 menit setelah dikirim
- RLS diterapkan di semua tabel domain parent
