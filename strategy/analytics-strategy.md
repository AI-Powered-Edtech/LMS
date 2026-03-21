# Data & Analytics Strategy — EduSync LMS

> Strategi analytics per role, predictive analytics, benchmarking, dan report export.
> Terakhir diperbarui: Maret 2026

---

## 1. Data Insights yang Paling Dibutuhkan

### 1.1 Apa yang Guru Indonesia Butuhkan

Berdasarkan persona guru (Bu Ratna) dan konteks pendidikan Indonesia:

**Pertanyaan utama guru:**

1. "Siswa mana yang kesulitan dan butuh bantuan?" — Ini pertanyaan #1 yang harus dijawab analytics
2. "Materi mana yang paling sulit dipahami siswa?" — Untuk perbaikan pengajaran
3. "Berapa persen siswa yang sudah menyelesaikan materi minggu ini?" — Tracking progress kelas
4. "Apakah ada siswa yang tidak aktif?" — Deteksi dini ketidakhadiran digital
5. "Bagaimana trend nilai kelas saya dari waktu ke waktu?" — Evaluasi efektivitas pengajaran

**Status EduSync:** Sebagian besar sudah terjawab melalui modul analytics yang ada (struggle detection, engagement segments, course analytics). Gap utama di presentation layer — data ada tapi belum di-surface dengan cara yang mudah dicerna guru non-teknis.

### 1.2 Apa yang Kepala Sekolah Butuhkan

**Pertanyaan utama kepala sekolah:**

1. "Berapa persen guru yang aktif menggunakan platform?" — Measure adopsi
2. "Bagaimana perbandingan performance antar kelas/guru?" — Evaluasi mutu
3. "Berapa rata-rata nilai per mata pelajaran di sekolah?" — Overview akademik
4. "Apakah ada trend peningkatan/penurunan dari semester lalu?" — Trend analysis
5. "Data apa yang bisa saya presentasikan ke yayasan/dinas?" — Reporting compliance

**Status EduSync:** Admin analytics dashboard sudah ada tapi belum cukup untuk reporting ke stakeholder eksternal. Butuh executive summary dan export format yang sesuai.

### 1.3 Apa yang Dinas Pendidikan Butuhkan

**Pertanyaan utama dinas:**

1. Rata-rata kehadiran per sekolah
2. Rata-rata nilai per mata pelajaran per jenjang
3. Jumlah siswa aktif menggunakan teknologi
4. Compliance terhadap kurikulum (CP coverage)
5. Perbandingan antar sekolah dalam kabupaten

**Status EduSync:** Belum ada. Ini adalah fitur jangka panjang untuk Enterprise tier.

---

## 2. Dashboard Analytics per Role

### 2.1 Dashboard Siswa — "Progress Saya"

**Prinsip desain:** Sederhana, visual, motivational. Siswa tidak butuh angka kompleks — mereka butuh tahu "apakah saya on track?"

```
┌──────────────────────────────────────┐
│  📊 Progress Belajar Saya            │
│                                      │
│  ▶ Minggu Ini                        │
│  ┌──────────────────────────────────┐│
│  │ Lesson selesai:  ████████░░ 80% ││
│  │ Quiz dikerjakan: ██████░░░░ 60% ││
│  │ Tugas submit:    ██████████ 100%││
│  └──────────────────────────────────┘│
│                                      │
│  📈 Kekuatan & Kelemahan             │
│  ┌────────────────┬─────────────────┐│
│  │ 💪 Kuat        │ ⚡ Perlu Latihan││
│  │ • Aljabar      │ • Geometri     ││
│  │ • B. Inggris   │ • Fisika Bab 3 ││
│  └────────────────┴─────────────────┘│
│                                      │
│  🎯 Rekomendasi                      │
│  "Coba review Geometri — kamu bisa  │
│   meningkatkan 15% dengan latihan   │
│   soal di Bab 4."                   │
│                                      │
│  📅 Trend Nilai (3 bulan terakhir)   │
│  90│      ╭─╮                        │
│  80│  ╭───╯ ╰──╮                     │
│  70│──╯        ╰──                   │
│    └──┬──┬──┬──┬──┬──               │
│      Jan Feb Mar                     │
│                                      │
│  🏆 Pencapaian Terbaru               │
│  🥇 Perfect Score — Matematika Quiz 5│
│  🔥 Streak 14 hari                   │
│  📚 Menyelesaikan Kursus B. Indonesia│
└──────────────────────────────────────┘
```

**Data points:**

- Progress per kursus (% lesson selesai)
- Rata-rata quiz score per mata pelajaran
- Strength/weakness analysis (berdasarkan quiz score per topik)
- Trend nilai 3-6 bulan
- Rekomendasi next action (dari recommendation engine yang sudah ada)
- Streak dan achievement terbaru

**Status EduSync:** Sebagian besar data sudah tersedia. Yang perlu dibangun: strength/weakness visualization dan trend chart di student dashboard.

### 2.2 Dashboard Guru — "Kelas Saya"

**Prinsip desain:** Actionable insights. Guru tidak punya waktu baca grafik rumit — mereka butuh "siapa yang perlu saya bantu hari ini?"

```
┌──────────────────────────────────────────┐
│  📊 Analytics Kelas 8A — Matematika      │
│                                          │
│  ⚡ PERHATIAN SEGERA                      │
│  ┌──────────────────────────────────────┐│
│  │ 🔴 3 siswa at-risk (tidak aktif >7hr)││
│  │ 🟡 5 siswa struggling (score <60)    ││
│  │ [Lihat Detail]                       ││
│  └──────────────────────────────────────┘│
│                                          │
│  📈 Ringkasan Kelas                      │
│  ┌──────┬──────┬──────┬──────┐          │
│  │ 32   │ 78%  │ 75   │ 89%  │          │
│  │Siswa │Aktif │Avg   │Tugas │          │
│  │      │      │Score │Submit│          │
│  └──────┴──────┴──────┴──────┘          │
│                                          │
│  📊 Segmen Engagement                    │
│  ┌──────────────────────────────────────┐│
│  │ Aktif    ████████████░░░░ 40% (13)  ││
│  │ Berkembang████████░░░░░░░ 25% (8)   ││
│  │ Perlu    ██████░░░░░░░░░ 20% (6)    ││
│  │ Pasif    █████░░░░░░░░░░ 15% (5)    ││
│  └──────────────────────────────────────┘│
│                                          │
│  📚 Efektivitas Konten                   │
│  Lesson paling sulit: Bab 5 — Persamaan │
│  (rata-rata quiz score: 58, completion   │
│   rate: 65%)                             │
│  💡 "Pertimbangkan review materi Bab 5"  │
│                                          │
│  [Export Laporan]  [Lihat Per Siswa]     │
└──────────────────────────────────────────┘
```

**Data points:**

- At-risk students alert (dari struggle detection yang sudah ada)
- Class summary metrics: total siswa, % aktif, avg score, tugas submission rate
- Engagement segments (sudah ada: Aktif, Berkembang, Perlu Perhatian, Pasif)
- Content effectiveness: lesson/quiz mana yang paling sulit/mudah
- Per-student drill-down
- Trend per minggu/bulan
- Comparison antar kelas yang diajar guru yang sama

**Status EduSync:** Hampir semua data point sudah tersedia di analytics module. Yang perlu dibangun: "PERHATIAN SEGERA" alert card di atas dashboard, content effectiveness analysis.

### 2.3 Dashboard Admin — "Overview Sekolah"

**Prinsip desain:** Bird's eye view. Admin butuh overview cepat dan kemampuan drill-down.

```
┌──────────────────────────────────────────┐
│  📊 Dashboard Sekolah — SMA Example      │
│  Semester 1, 2025/2026                   │
│                                          │
│  📈 RINGKASAN                            │
│  ┌──────┬──────┬──────┬──────┐          │
│  │ 600  │ 40   │ 24   │ 92%  │          │
│  │Siswa │Guru  │Kelas │Adopt │          │
│  │Aktif │Aktif │      │Rate  │          │
│  └──────┴──────┴──────┴──────┘          │
│                                          │
│  👩‍🏫 AKTIVITAS GURU                      │
│  Guru paling aktif: Bu Ratna (32 login)  │
│  Guru tidak aktif >14 hari: 3 orang     │
│  Rata-rata konten dibuat: 5 lesson/guru  │
│  [Lihat Detail Guru]                     │
│                                          │
│  📊 PERFORMA AKADEMIK                    │
│  ┌──────────────────────────────────────┐│
│  │ Mapel         │ Avg Score │ Trend   ││
│  │ Matematika    │ 72        │ ↑ +3    ││
│  │ B. Indonesia  │ 78        │ → 0     ││
│  │ IPA           │ 68        │ ↓ -2    ││
│  │ B. Inggris    │ 75        │ ↑ +5    ││
│  └──────────────────────────────────────┘│
│                                          │
│  ⚠️ PERLU PERHATIAN                      │
│  • 45 siswa (7.5%) at-risk              │
│  • 3 guru tidak aktif >2 minggu         │
│  • Kehadiran kelas 9B turun 15%         │
│  [Detail]                                │
│                                          │
│  [Export Laporan Semester] [Cetak PDF]    │
└──────────────────────────────────────────┘
```

**Data points:**

- School-wide metrics: siswa aktif, guru aktif, adoption rate
- Teacher activity monitoring: login frequency, konten dibuat, grading speed
- Akademik per mata pelajaran: rata-rata nilai, trend
- At-risk aggregation: total siswa struggling, trend
- Kehadiran: rate per kelas, per minggu
- Compliance: % guru yang sudah membuat kursus, % kelas yang aktif

**Status EduSync:** Admin analytics dashboard sudah ada tapi belum sekomprehensif ini. Teacher activity monitoring perlu ditambahkan.

### 2.4 Dashboard Orang Tua — "Anak Saya" (PROPOSED)

**Prinsip desain:** Super sederhana, non-technical. Traffic light system.

```
┌──────────────────────────────────────┐
│  👨‍👩‍👦 Progress Ahmad — Minggu Ini     │
│                                      │
│  ┌──────────────────────────────────┐│
│  │ 🟢 Kehadiran: 5/5 hari          ││
│  │ 🟢 Tugas: 8/10 dikerjakan       ││
│  │ 🟡 Nilai Quiz: 68 (rata-rata)   ││
│  │ 🟢 Streak Belajar: 12 hari      ││
│  └──────────────────────────────────┘│
│                                      │
│  💬 Catatan dari Guru                │
│  "Ahmad aktif di kelas. Perlu       │
│   latihan tambahan di Fisika."      │
│                                      │
│  📊 Nilai Terbaru                    │
│  • Matematika Quiz 7: 85/100 🟢    │
│  • B. Inggris Tugas 3: 70/100 🟡   │
│  • Fisika Quiz 5: 55/100 🔴        │
│                                      │
│  [Lihat Semua Nilai] [Chat Guru]     │
└──────────────────────────────────────┘
```

**Prinsip traffic light:**

- 🟢 Hijau: Di atas rata-rata kelas atau target tercapai
- 🟡 Kuning: Mendekati batas (60-75 atau 70-85% completion)
- 🔴 Merah: Di bawah KKM atau tidak memenuhi target

**Status EduSync:** Belum ada. Tergantung pada implementasi Parent Portal.

---

## 3. Predictive Analytics — Early Warning System

### 3.1 Siswa At-Risk Detection (Sudah Ada, Perlu Diperkuat)

**Saat ini:** Struggle score 0-11 berdasarkan quiz failure rate, engagement rendah, dan inactivity.

**Enhancement yang direkomendasikan:**

#### Multi-Factor Risk Score

| Faktor                | Weight | Pengukuran                         | Threshold         |
| --------------------- | ------ | ---------------------------------- | ----------------- |
| Quiz performance      | 25%    | Rata-rata 3 quiz terakhir          | < 60 = high risk  |
| Assignment submission | 20%    | % tugas on-time                    | < 50% = high risk |
| Login frequency       | 15%    | Login/minggu vs rata-rata kelas    | < 50% avg = risk  |
| Lesson progress       | 15%    | % lesson selesai vs timeline       | < 50% = risk      |
| Attendance            | 15%    | % kehadiran bulan ini              | < 80% = risk      |
| Engagement drop       | 10%    | Penurunan aktivitas vs minggu lalu | > 50% drop = risk |

#### Predictive Triggers

```
IF risk_score > 7 (dari 10):
    → Alert ke guru: "⚠️ Ahmad mungkin butuh bantuan"
    → Suggest action: "Hubungi Ahmad atau orang tuanya"
    → Notif ke orang tua (jika parent portal aktif)

IF risk_score 4-7:
    → Yellow flag di dashboard guru
    → Personalized recommendation ke siswa
    → Kurangi difficulty (jika AI tutor aktif)

IF risk_score < 4:
    → Hijau, no action needed
```

#### Trend-Based Prediction

Bukan hanya snapshot saat ini, tapi prediksi berdasarkan trend:

- "Berdasarkan trend 2 minggu terakhir, 5 siswa berisiko gagal di Ujian Tengah Semester"
- "Kelas 8B menunjukkan penurunan engagement 20% — pertimbangkan variasi metode pengajaran"

### 3.2 Content Effectiveness Prediction

Prediksi materi mana yang akan sulit dipahami siswa:

- Jika lesson X memiliki completion rate < 60% dan quiz setelahnya rata-rata < 65%, flag sebagai "materi sulit"
- Suggest guru: "Bab 5 terbukti sulit — pertimbangkan video penjelasan tambahan atau review session"

### 3.3 Churn Prediction (untuk Business)

Prediksi sekolah yang berisiko churn (berhenti berlangganan):

- Teacher login menurun > 30% dalam sebulan
- Tidak ada konten baru dibuat dalam 2 minggu
- Support ticket meningkat
- Action: Customer Success team proaktif menghubungi sekolah

---

## 4. Benchmarking

### 4.1 Intra-School Benchmarking

**Perbandingan antar kelas:**

- Rata-rata nilai per mata pelajaran per kelas
- Engagement rate per kelas
- Completion rate per kelas
- "Kelas 8A memiliki rata-rata Matematika 78, dibanding rata-rata sekolah 72"

**Perbandingan antar guru (hanya visible untuk admin):**

- Kecepatan grading
- Jumlah konten dibuat
- Student engagement di kelas guru tersebut
- Ini sensitif — hanya untuk admin, bukan publik

### 4.2 Inter-School Benchmarking (Multi-Tenant)

**Prinsip:** Anonymized, aggregated, opt-in.

- Sekolah bisa opt-in untuk di-benchmark
- Data di-anonymize: "Sekolah Anda di peringkat 15 dari 50 sekolah di Jawa Timur"
- Metrics: rata-rata engagement, completion rate, quiz score
- Tidak expose nama sekolah lain atau data mentah

**Benefit untuk EduSync:** Data aggregat ini bisa menjadi selling point untuk sekolah baru ("Rata-rata sekolah yang pakai EduSync meningkatkan engagement 40%").

---

## 5. Report Export

### Format yang Dibutuhkan

| Laporan                | Format                         | Audience                | Frekuensi         |
| ---------------------- | ------------------------------ | ----------------------- | ----------------- |
| **Progress Siswa**     | PDF                            | Orang tua               | Bulanan           |
| **Rapor Semester**     | PDF + CSV (e-Rapor compatible) | Orang tua + Dinas       | Per semester      |
| **Rekap Nilai Kelas**  | Excel (XLSX)                   | Guru                    | On-demand         |
| **Laporan Kehadiran**  | PDF + Excel                    | Admin, Dinas            | Bulanan           |
| **Analytics Summary**  | PDF                            | Kepala Sekolah, Yayasan | Bulanan/Quarterly |
| **Teacher Activity**   | PDF                            | Admin/Kepsek            | Bulanan           |
| **School Performance** | PDF                            | Yayasan, Dinas          | Per semester      |

### Template Rapor Semester (untuk integrasi e-Rapor)

```
┌──────────────────────────────────────────┐
│         LAPORAN HASIL BELAJAR            │
│        Semester 1 — 2025/2026            │
│                                          │
│  Nama    : Ahmad Rizki                   │
│  Kelas   : 8A                            │
│  NIS     : 12345                         │
│  Sekolah : SMP Example                   │
│                                          │
│  ┌──────────────┬──────┬────────────────┐│
│  │ Mata Pelajaran│Nilai│ Deskripsi      ││
│  ├──────────────┼──────┼────────────────┤│
│  │ Matematika   │ 78   │ Ahmad menguasai││
│  │              │      │ aljabar dengan ││
│  │              │      │ baik. Perlu    ││
│  │              │      │ latihan di     ││
│  │              │      │ geometri.      ││
│  ├──────────────┼──────┼────────────────┤│
│  │ B. Indonesia │ 85   │ ...            ││
│  └──────────────┴──────┴────────────────┘│
│                                          │
│  Kehadiran: 95% (Sakit: 2, Izin: 1)    │
│  Catatan Wali Kelas: ...                 │
│                                          │
│  ________________    ________________    │
│  Wali Kelas          Kepala Sekolah      │
└──────────────────────────────────────────┘
```

### Implementasi Export

**Teknologi:**

- PDF: Client-side generation dengan library seperti `jspdf` + `html2canvas` atau server-side dengan Puppeteer (Supabase Edge Function)
- Excel: `xlsx` library (sudah umum di React ecosystem)
- CSV: Native JavaScript generation
- Scheduled reports: Menggunakan Supabase scheduled functions

**Flow:**

```
[Guru/Admin klik "Export Laporan"]
    ↓
[Pilih: Tipe laporan, Kelas, Rentang waktu, Format]
    ↓
[Generate di background (jika besar)]
    ↓
[Download ready → notifikasi + link download]
```

---

## 6. Rekomendasi Prioritas

### P0 — Harus Segera (0-3 bulan)

1. **Actionable Alert Card** di guru dashboard — "3 siswa perlu perhatian" di paling atas
2. **Content effectiveness view** — lesson/quiz mana yang paling sulit
3. **Progress report PDF export** — guru bisa export progress siswa per kelas

### P1 — Sangat Penting (3-6 bulan)

4. **Teacher activity dashboard** — admin bisa monitor adopsi guru
5. **School-wide analytics** — overview per mata pelajaran dan per kelas
6. **Enhanced risk scoring** — multi-factor model (bukan hanya quiz-based)
7. **Rapor semester export** — format e-Rapor compatible
8. **Parent analytics dashboard** — sederhana, traffic light

### P2 — Nice to Have (6-12 bulan)

9. **Intra-school benchmarking** — compare kelas vs kelas
10. **Trend-based prediction** — "5 siswa berisiko gagal UTS"
11. **Scheduled report generation** — auto-generate dan kirim laporan bulanan
12. **Inter-school benchmarking** — anonymized comparison (opt-in)
13. **Custom report builder** — admin bisa buat laporan kustom

---

_Analytics harus serve the user, bukan impress the user. Prioritaskan actionable insights (apa yang harus dilakukan guru SEKARANG) dibanding comprehensive data (semua angka sekaligus)._
