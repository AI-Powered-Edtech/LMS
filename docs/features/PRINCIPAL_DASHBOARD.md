# Principal Dashboard

## Overview

Dashboard eksekutif untuk Kepala Sekolah/Principal yang memberikan pandangan menyeluruh terhadap kinerja sekolah, adopsi LMS, dan dampak akademik. Semua akses bersifat **read-only** — principal tidak dapat memodifikasi data akademik.

---

## Features

### Executive Dashboard (`/app/principal`)

Dashboard satu halaman dengan komponen:

- **Adoption Metrics**: Guru aktif, siswa aktif, trend adopsi bulanan, persentase kelas menggunakan LMS
- **Academic Overview**: Rata-rata nilai keseluruhan, jumlah siswa berisiko, proyeksi kelulusan
- **ROI Calculator**: Estimasi penghematan biaya cetak, efisiensi waktu guru, kepuasan orang tua
- **Teacher Leaderboard**: Ranking adopsi LMS per guru dan kelas
- **Achievement Highlights**: Kelas terbaik, course paling aktif, siswa berprestasi
- **Quick Actions**: Download report, export untuk yayasan, jadwalkan auto-report

### Before-After Analytics (`/app/principal/analytics`)

- Perbandingan data akademik sebelum dan sesudah implementasi LMS
- Metrics: nilai rata-rata, tingkat kehadiran, engagement siswa, kepuasan guru/orang tua
- Visualisasi: before/after charts, trend lines, delta indicators
- Export data untuk presentasi ke yayasan/dinas pendidikan

### Report Generator (`/app/principal/report`)

- Laporan eksekutif bulanan dalam format PDF (print-friendly)
- Template dengan branding sekolah, logo, header resmi
- Konten: adoption metrics, academic performance, ROI, hasil survey kepuasan
- Export ke PDF atau Excel
- Schedule: auto-generate setiap akhir bulan dan kirim email ke stakeholder

### Survey Kepuasan (`/app/principal/survey`)

- Kelola survey kepuasan untuk guru, siswa, dan orang tua
- Template survey bawaan: kepuasan LMS, kemudahan penggunaan, saran perbaikan
- Distribusi: in-app notification, email, WhatsApp
- Dashboard hasil: response rate, score breakdown, trend dari waktu ke waktu

---

## Database Tables

| Tabel                     | Deskripsi                                                                   |
| ------------------------- | --------------------------------------------------------------------------- |
| `principal_settings`      | Konfigurasi dashboard kepala sekolah (jadwal laporan, preferensi tampilan)  |
| `school_baseline_metrics` | Data baseline sebelum LMS diimplementasikan (untuk before-after comparison) |
| `satisfaction_surveys`    | Definisi survey kepuasan per tenant (judul, target role, status)            |
| `survey_responses`        | Jawaban survey dari responden beserta timestamp                             |

---

## RPCs

| RPC                        | Deskripsi                                                                        |
| -------------------------- | -------------------------------------------------------------------------------- |
| `get_executive_overview()` | Ringkasan semua metrics eksekutif (adoption, academic, ROI) untuk seluruh tenant |

---

## Edge Functions

| Function                    | Deskripsi                                                               |
| --------------------------- | ----------------------------------------------------------------------- |
| `generate-executive-report` | Generate laporan eksekutif bulanan PDF (dipanggil manual atau via cron) |

---

## Routes

| Path                       | Komponen               | Deskripsi                        |
| -------------------------- | ---------------------- | -------------------------------- |
| `/app/principal`           | `ExecutiveDashboard`   | Dashboard utama eksekutif        |
| `/app/principal/analytics` | `BeforeAfterAnalytics` | Perbandingan before-after LMS    |
| `/app/principal/report`    | `ReportPreview`        | Preview laporan (print-friendly) |
| `/app/principal/survey`    | `SurveyPage`           | Kelola survey kepuasan           |

---

## Feature Module

```
src/features/principal/
├── api/
│   ├── executiveApi.ts       ← Executive overview data
│   └── surveyApi.ts          ← Survey management
├── components/
│   ├── ExecutiveDashboard.tsx
│   ├── AdoptionMetrics.tsx
│   ├── ROICalculator.tsx
│   ├── TeacherLeaderboard.tsx
│   ├── BeforeAfterAnalytics.tsx
│   ├── ReportScheduler.tsx
│   ├── SurveyBuilder.tsx
│   └── SurveyResults.tsx
├── hooks/
│   └── useExecutiveData.ts
└── index.ts
```

---

## Security & RLS

- Principal mendapat akses **read-only** ke semua data dalam tenant-nya
- Tidak dapat membuat, mengubah, atau menghapus data akademik apapun
- `get_executive_overview()` menggunakan `SECURITY DEFINER` dengan validasi `tenant_id`
- Akses lintas tenant dilarang secara ketat via RLS
- Data baseline (`school_baseline_metrics`) hanya bisa diisi oleh admin tenant
