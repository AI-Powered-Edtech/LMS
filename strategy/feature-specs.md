# Missing Features — Design & Flow Specification

> Spesifikasi desain dan flow untuk fitur-fitur yang belum ada di EduSync LMS.
> Terakhir diperbarui: Maret 2026

---

## 4a. Parent Portal (Portal Orang Tua)

### Kenapa Penting untuk Pasar Indonesia

Orang tua Indonesia memiliki keterlibatan tinggi dalam pendidikan anak. WhatsApp group kelas (guru-orang tua) sudah menjadi norma di hampir semua sekolah. Orang tua secara aktif memantau nilai, kehadiran, dan perilaku anak. Tanpa akses langsung ke data ini dalam LMS, orang tua tetap bergantung pada WhatsApp yang tidak terstruktur — informasi hilang, sulit dicari, dan guru kewalahan menjawab pertanyaan berulang.

Kompetitor yang sudah menyediakan parent portal (Google Classroom, Canvas, Schoology) menunjukkan bahwa fitur ini meningkatkan retention sekolah sebagai pelanggan, karena orang tua menjadi stakeholder tambahan yang mendorong penggunaan platform.

### User Flow Lengkap

#### Flow 1: Registrasi & Linking

```
[Orang Tua menerima undangan via WhatsApp/SMS dari sekolah]
    ↓
[Klik link undangan → Landing page Portal Orang Tua]
    ↓
[Pilih metode registrasi]
    ├── Via Nomor HP (OTP WhatsApp/SMS) ← RECOMMENDED
    ├── Via Email + Password
    └── Via Google Account
    ↓
[Isi profil minimal: Nama, Hubungan dengan siswa]
    ↓
[Link ke anak]
    ├── Auto-link: Jika undangan sudah berisi kode siswa → langsung terhubung
    └── Manual link: Masukkan Kode Siswa (diberikan sekolah) → verifikasi oleh admin/guru
    ↓
[Dashboard Orang Tua → Selesai]
```

#### Flow 2: Dashboard Harian

```
[Login / Buka app]
    ↓
[Dashboard Utama — Overview Anak]
    ├── Kartu Ringkasan Hari Ini
    │   ├── Status kehadiran: ✅ Hadir / ❌ Tidak hadir / ⏳ Belum absen
    │   ├── Tugas hari ini: 2 tugas baru, 1 deadline besok
    │   └── Nilai terbaru: Quiz Matematika — 85/100
    │
    ├── Progress Minggu Ini
    │   ├── Tugas dikerjakan: 8/10 (80%)
    │   ├── Rata-rata nilai quiz: 78
    │   └── Streak belajar: 5 hari 🔥
    │
    ├── Pengumuman Sekolah
    │   └── [List pengumuman terbaru]
    │
    └── Quick Actions
        ├── [Lihat Semua Nilai]
        ├── [Lihat Kehadiran]
        ├── [Hubungi Guru]
        └── [Lihat Jadwal]
```

#### Flow 3: Komunikasi dengan Guru

```
[Dashboard → Hubungi Guru]
    ↓
[Pilih guru / wali kelas]
    ↓
[Tulis pesan (text only, max 500 karakter)]
    ↓
[Guru menerima notifikasi di panel guru]
    ↓
[Guru reply → Orang tua dapat notifikasi WhatsApp/push]
```

### Fitur Detail

**1. Dashboard Ringkasan**

- Overview harian: kehadiran, tugas, nilai terbaru
- Progress mingguan: persentase tugas selesai, trend nilai
- Traffic light system: Hijau (semua baik), Kuning (perlu perhatian), Merah (ada masalah)
- Support multi-anak (jika orang tua punya lebih dari 1 anak di sekolah)

**2. Lihat Nilai**

- Daftar nilai per mata pelajaran
- Trend nilai (grafik sederhana naik/turun)
- Perbandingan dengan rata-rata kelas (opsional, bisa di-disable sekolah)
- Detail nilai per assessment (quiz, tugas, ujian)

**3. Lihat Kehadiran**

- Kalender kehadiran (hijau = hadir, merah = absen, kuning = izin/sakit)
- Rekap bulanan: total hadir, izin, sakit, alpha
- Notifikasi real-time saat anak tidak hadir

**4. Lihat Progress Belajar**

- Course yang sedang diambil anak
- Persentase penyelesaian per kursus
- Achievement/badges yang didapat (gamification)
- Rekomendasi: "Anak Anda bisa meningkatkan di Matematika Bab 5"

**5. Komunikasi**

- Pesan ke wali kelas / guru mata pelajaran
- Thread conversation (bukan chat real-time — async messaging)
- Notifikasi reply via WhatsApp
- Appointment booking untuk pertemuan (opsional)

**6. Notifikasi**

- Digest harian (1x sore): rangkuman kehadiran + tugas + nilai hari ini
- Alert penting: anak tidak hadir, nilai di bawah KKM, deadline terlewat
- Channel: Push notification + WhatsApp (pilih salah satu atau dua-duanya)
- Orang tua bisa atur frekuensi notifikasi

### Wireframe Deskriptif — Dashboard Orang Tua (Mobile)

```
┌─────────────────────────────────┐
│  EduSync — Portal Orang Tua     │
│  Selamat sore, Ibu Sari        │
├─────────────────────────────────┤
│                                 │
│  [Foto] Ahmad Rizki — Kelas 8A │
│  ──────────────────────────────│
│                                 │
│  📊 HARI INI                    │
│  ┌─────────┬─────────┬────────┐│
│  │ Hadir ✅│ 2 Tugas │ Quiz  ││
│  │         │ Baru    │ 85/100││
│  └─────────┴─────────┴────────┘│
│                                 │
│  📈 MINGGU INI                  │
│  Tugas: ████████░░ 80%         │
│  Nilai: ████████░░ Rata-rata 78│
│  Streak: 🔥🔥🔥🔥🔥 5 hari     │
│                                 │
│  📢 PENGUMUMAN                  │
│  • Ujian Tengah Semester 15 Apr │
│  • Rapat Orang Tua 20 Apr      │
│                                 │
│  ──────────────────────────────│
│  [Nilai] [Kehadiran] [Guru] [+]│
│                                 │
└─────────────────────────────────┘
```

### Pertimbangan Privasi & Keamanan

1. **Verifikasi Relasi** — Orang tua harus diverifikasi oleh admin sekolah sebelum bisa melihat data anak. Kode undangan unik per siswa.
2. **Read-Only Default** — Orang tua hanya bisa melihat data, tidak bisa mengubah apapun.
3. **Data Minimization** — Orang tua hanya melihat data anaknya sendiri, tidak bisa akses data siswa lain.
4. **Audit Trail** — Setiap akses orang tua tercatat di audit log.
5. **Consent** — Siswa di atas 15 tahun bisa memilih data mana yang visible untuk orang tua (sesuai UU PDP Indonesia).
6. **RLS Policy** — Parent role dengan policy: hanya bisa SELECT data anak yang ter-link.
7. **Token Expiry** — Session orang tua expire lebih cepat (7 hari vs 30 hari untuk guru).

### Database Schema (Proposed)

```sql
-- Tabel relasi orang tua - siswa
CREATE TABLE parent_student_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_user_id UUID REFERENCES auth.users(id),
    student_user_id UUID REFERENCES auth.users(id),
    relationship TEXT NOT NULL, -- 'ayah', 'ibu', 'wali'
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    invite_code TEXT UNIQUE,
    tenant_id UUID REFERENCES tenants(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: orang tua hanya lihat link miliknya
ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parents_own_links" ON parent_student_links
    FOR SELECT USING (parent_user_id = auth.uid());
```

---

## 4b. Mobile App Experience

### Analisis: Native App vs PWA

| Aspek                  | PWA                          | Native App                    |
| ---------------------- | ---------------------------- | ----------------------------- |
| **Biaya Development**  | 40-60% lebih murah           | Mahal (iOS + Android)         |
| **Time to Market**     | 2-3 bulan                    | 6-9 bulan                     |
| **Install Size**       | < 1 MB                       | 50-150 MB                     |
| **Update**             | Otomatis (server-side)       | Butuh download dari store     |
| **Offline**            | Service Worker (terbatas)    | Full native offline           |
| **Push Notification**  | ✅ (Android), ⚠️ (iOS 16.4+) | ✅ Full                       |
| **Camera/QR**          | ✅ Via Web API               | ✅ Full native                |
| **Performance**        | Baik (90% native feel)       | Optimal                       |
| **App Store Presence** | Tidak ada (bisa sideload)    | Ada di Play Store / App Store |
| **Discoverability**    | Rendah                       | Tinggi (app store search)     |

### Rekomendasi: PWA Dulu, Native Kemudian

**Fase 1 (0-3 bulan): PWA**

- Alasan: Cepat, murah, sudah punya codebase React
- Cakupan: Install prompt, offline basic, push notification (Android)
- Cocok untuk: Mayoritas user Android di Indonesia
- Contoh sukses: Tokopedia PWA meningkatkan engagement signifikan di Indonesia

**Fase 2 (6-12 bulan): Native App (jika data menunjukkan kebutuhan)**

- Trigger: Jika iOS user > 20% atau offline mode jadi critical
- Pendekatan: React Native atau Capacitor (wrap PWA)
- Priority: Android dulu (90%+ market share Indonesia)

### User Flow Mobile-First untuk Siswa

#### Quick Check Grades (< 30 detik)

```
[Buka app / notification tap]
    ↓
[Dashboard — langsung lihat nilai terbaru di atas]
    ↓
[Tap nilai → Detail quiz/tugas]
    ↓
[Lihat jawaban benar/salah → Selesai]
```

#### Submit Assignment Mobile

```
[Notification: "Tugas Bahasa Indonesia deadline besok"]
    ↓
[Tap → Halaman tugas]
    ↓
[Baca instruksi]
    ↓
[Pilih metode submit]
    ├── Ketik jawaban (text editor)
    ├── Upload file (dari HP)
    ├── Foto dokumen (kamera langsung)
    └── Voice note (untuk presentasi oral)
    ↓
[Preview → Submit → Konfirmasi]
```

#### Quiz on the Go

```
[Notification: "Quiz Fisika tersedia — deadline 2 jam"]
    ↓
[Tap → Mulai Quiz]
    ↓
[Jawab soal satu per satu (mobile-optimized layout)]
    ├── Autosave setiap jawaban ← Sudah ada di EduSync!
    ├── Timer visible di header
    └── Swipe left/right untuk navigasi soal
    ↓
[Review jawaban → Submit]
    ↓
[Lihat skor langsung (jika auto-grade)]
```

### Push Notification Strategy

| Event              | Waktu                           | Target                  | Channel         |
| ------------------ | ------------------------------- | ----------------------- | --------------- |
| Tugas baru         | Saat publish                    | Siswa                   | Push + In-app   |
| Deadline H-1       | Sore H-1                        | Siswa yang belum submit | Push            |
| Nilai keluar       | Saat guru publish               | Siswa                   | Push + In-app   |
| Streak reminder    | 20:00 jika belum aktif hari ini | Siswa                   | Push            |
| Pengumuman penting | Saat publish                    | Semua                   | Push            |
| Anak tidak hadir   | Saat absen tercatat             | Orang tua               | WhatsApp + Push |
| Rangkuman harian   | 16:00                           | Orang tua               | WhatsApp        |

### Offline Mode — Apa yang Bisa Diakses

| Fitur                 | Offline | Keterangan                                       |
| --------------------- | ------- | ------------------------------------------------ |
| Baca lesson (text)    | ✅      | Cache via Service Worker                         |
| Lihat nilai           | ✅      | Cache data terakhir                              |
| Lihat jadwal/kalender | ✅      | Cache data terakhir                              |
| Kerjakan quiz         | ⚠️      | Start online, answers cached, submit saat online |
| Submit tugas          | ⚠️      | Queue offline, auto-submit saat online           |
| Forum/diskusi         | ❌      | Butuh real-time                                  |
| AI Tutor              | ❌      | Butuh API call                                   |
| Video lesson          | ⚠️      | Hanya jika sudah di-download                     |

### Implementasi Teknis PWA

```
Tambahan ke project:
1. manifest.json — app name, icons, theme color, start_url
2. Service Worker — cache strategy (stale-while-revalidate untuk API, cache-first untuk assets)
3. Install prompt — banner "Tambahkan ke Home Screen"
4. Push notification — Firebase Cloud Messaging (FCM)
5. Offline indicator — banner "Anda sedang offline"
```

---

## 4c. Content Marketplace

### Model Marketplace

**Konsep:** Platform di mana guru, penerbit, dan EduSync sendiri bisa menyediakan konten pelajaran (soal, materi, RPP) yang bisa digunakan oleh guru lain.

### Siapa yang Jual?

| Seller        | Konten                                             | Revenue Share              | Quality Control          |
| ------------- | -------------------------------------------------- | -------------------------- | ------------------------ |
| **Guru**      | Soal, materi lesson, RPP, template quiz            | 70% guru / 30% EduSync     | Peer review + moderation |
| **Penerbit**  | Bank soal besar, buku digital, video               | 60% penerbit / 40% EduSync | Editorial review         |
| **EduSync**   | Template kursus, konten AI-generated, starter pack | 100% EduSync               | Internal QA              |
| **Komunitas** | Konten gratis open-source                          | Gratis                     | Community voting         |

### Revenue Sharing Model

```
Harga konten: Rp 10.000 - Rp 500.000 (tergantung tipe)
    ↓
Payment gateway: -3% fee
    ↓
Platform fee: 30% (EduSync)
    ↓
Creator payout: 67% dari harga
    ↓
Payout: Bulanan via transfer bank
```

### Alignment dengan Kurikulum Merdeka

Setiap konten di marketplace harus di-tag dengan:

- **Jenjang:** SD / SMP / SMA / SMK
- **Mata Pelajaran:** Sesuai struktur Kurikulum Merdeka
- **Fase:** A (kelas 1-2), B (3-4), C (5-6), D (7-9), E (10), F (11-12)
- **Capaian Pembelajaran (CP):** Tag spesifik per CP
- **Tipe:** Materi, Soal, RPP, Media, Template

### Quality Control & Review Process

```
[Creator submit konten]
    ↓
[Auto-check: format, plagiarisme, kelengkapan metadata]
    ↓
[Peer review: 2 guru reviewer]
    ├── Approved → Published
    ├── Revision needed → Return to creator
    └── Rejected → Notifikasi dengan alasan
    ↓
[Published → Community rating & review]
    ↓
[Konten dengan rating < 3.0 setelah 10 review → Auto-unpublish for review]
```

---

## 4d. Integration Hub

### Integrasi yang Dibutuhkan

| Integrasi                 | Deskripsi                                        | Impact        | Effort | Prioritas |
| ------------------------- | ------------------------------------------------ | ------------- | ------ | --------- |
| **Dapodik**               | Sync data sekolah, guru, siswa dari Dapodik      | Tinggi        | Tinggi | P1        |
| **e-Rapor**               | Export nilai ke format e-Rapor Kemendikbud       | Sangat Tinggi | Medium | P1        |
| **Google Workspace**      | SSO, Google Drive, Google Meet, Classroom import | Tinggi        | Medium | P1        |
| **Microsoft 365**         | SSO, OneDrive, Teams                             | Medium        | Medium | P2        |
| **WhatsApp Business API** | Notifikasi ke orang tua dan siswa                | Sangat Tinggi | Medium | P0        |
| **Payment Gateway**       | Midtrans/Xendit untuk pembayaran SPP             | Medium        | Low    | P2        |
| **Zoom**                  | Video conference dalam lesson                    | Medium        | Low    | P2        |
| **SIPD**                  | Pelaporan ke pemerintah daerah                   | Low           | Tinggi | P3        |

### Prioritas Berdasarkan Impact vs Effort

```
                    HIGH IMPACT
                        │
    WhatsApp API ●      │      ● e-Rapor
    (P0)                │      (P1)
                        │
    Google Workspace ●  │      ● Dapodik
    (P1)                │      (P1)
LOW EFFORT ─────────────┼──────────── HIGH EFFORT
                        │
    Zoom ●              │      ● Microsoft 365
    (P2)                │      (P2)
                        │
    Payment GW ●        │      ● SIPD
    (P2)                │      (P3)
                        │
                    LOW IMPACT
```

### Detail: Dapodik Integration

**Pendekatan:** Bukan real-time sync (Dapodik tidak punya webhook), melainkan import/export periodik.

```
[Admin klik "Import dari Dapodik"]
    ↓
[Input NPSN sekolah]
    ↓
[EduSync query API publik Dapodik → data sekolah, guru, siswa]
    ↓
[Preview data: nama, NIS/NIP, kelas]
    ↓
[Admin review & konfirmasi]
    ↓
[Bulk create/update user accounts]
    ↓
[Log hasil import: X berhasil, Y gagal, Z sudah ada]
```

### Detail: e-Rapor Export

```
[Guru/Admin → Menu "Generate Rapor"]
    ↓
[Pilih: Kelas, Semester, Format]
    ↓
[Sistem aggregate: nilai quiz + tugas + kehadiran]
    ↓
[Mapping ke format e-Rapor Kemendikbud]
    ├── Capaian Pembelajaran per mata pelajaran
    ├── Deskripsi naratif (bisa AI-generated)
    ├── Kehadiran
    └── Catatan guru
    ↓
[Preview rapor digital]
    ↓
[Export: PDF (cetak) atau CSV (import ke e-Rapor)]
```

---

## 4e. Komunikasi Real-time

### Apakah Perlu Chat di Dalam LMS?

**Argumen Pro:**

- Mengurangi ketergantungan pada WhatsApp
- Data komunikasi terdokumentasi dalam platform
- Moderasi dan keamanan lebih terkontrol
- Guru bisa set "office hours"

**Argumen Kontra:**

- WhatsApp sudah deeply embedded di culture Indonesia
- Membangun chat dari nol = effort besar
- User tidak mau pindah ke platform chat baru
- Maintenance dan scaling real-time infrastructure mahal

### Rekomendasi: Hybrid Approach

Daripada membangun chat full, gunakan pendekatan hybrid:

1. **WhatsApp Integration (P0)** — Kirim notifikasi terstruktur via WhatsApp Business API
2. **Async Messaging (P1)** — Pesan antar guru-siswa dan guru-ortu dalam platform (bukan real-time chat, lebih seperti email thread)
3. **Announcement Broadcast (Sudah Ada)** — Perkuat fitur pengumuman yang sudah ada
4. **Real-time Chat (P3)** — Pertimbangkan di masa depan jika demand tinggi

### Flow Komunikasi

#### Guru Broadcast ke Kelas

```
[Guru → Pengumuman kelas]
    ↓
[Tulis pesan + attachment (opsional)]
    ↓
[Pilih channel distribusi]
    ├── ✅ In-app notification (default)
    ├── ☐ WhatsApp (jika terintegrasi)
    └── ☐ Email
    ↓
[Publish → Semua siswa & orang tua di kelas menerima]
```

#### Guru-Siswa 1:1 (Async)

```
[Siswa → Pilih guru → "Tanya Guru"]
    ↓
[Tulis pertanyaan (text + gambar)]
    ↓
[Guru dapat notifikasi → Reply saat available]
    ↓
[Thread conversation tersimpan → Searchable]
```

#### Guru-Orang Tua (via Parent Portal)

```
[Orang tua → "Hubungi Wali Kelas"]
    ↓
[Tulis pesan tentang anak]
    ↓
[Guru dapat notifikasi → Reply]
    ↓
[Notifikasi reply ke orang tua via WhatsApp + in-app]
```

### Moderasi & Keamanan

1. **Content Filter** — Auto-detect kata-kata tidak pantas (blocklist Bahasa Indonesia)
2. **Report System** — Siswa/ortu bisa report pesan yang tidak pantas → masuk ke moderation queue (sudah ada fitur moderasi)
3. **No Direct Message Siswa-Siswa** — Komunikasi siswa hanya melalui forum (group), bukan DM
4. **Teacher Office Hours** — Guru bisa set jam available untuk menerima pesan
5. **Audit Log** — Semua pesan tercatat di audit log untuk compliance
6. **Admin Override** — Admin bisa melihat semua komunikasi jika ada report

---

## Ringkasan Prioritas Implementasi

| Fitur                   | Effort        | Impact        | Prioritas | Timeline   |
| ----------------------- | ------------- | ------------- | --------- | ---------- |
| Parent Portal MVP       | Medium        | Sangat Tinggi | P0        | 0-3 bulan  |
| PWA + Push Notification | Medium        | Sangat Tinggi | P0        | 0-3 bulan  |
| WhatsApp Notification   | Medium        | Tinggi        | P0        | 1-3 bulan  |
| Async Messaging         | Medium        | Medium        | P1        | 3-6 bulan  |
| e-Rapor Export          | Medium        | Tinggi        | P1        | 3-6 bulan  |
| Google Workspace SSO    | Low           | Tinggi        | P1        | 2-4 bulan  |
| Content Marketplace MVP | Tinggi        | Medium        | P2        | 6-12 bulan |
| Dapodik Import          | Tinggi        | Medium        | P2        | 6-9 bulan  |
| Native Mobile App       | Sangat Tinggi | Tinggi        | P2        | 9-12 bulan |
| Real-time Chat          | Tinggi        | Low-Medium    | P3        | 12+ bulan  |

---

_Setiap fitur harus divalidasi dengan user research (interview guru, siswa, orang tua, admin) sebelum development dimulai. Build → Measure → Learn._
