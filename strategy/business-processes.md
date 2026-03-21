# Business Process & Workflow Mapping — EduSync LMS

> Mapping proses bisnis lengkap untuk satu tahun ajaran di sekolah Indonesia menggunakan EduSync.
> Terakhir diperbarui: Maret 2026

---

## Legenda Status EduSync

- ✅ **Sudah bisa** — Fitur ada dan functional
- ⚠️ **Partial** — Fitur ada tapi belum lengkap / butuh improvement
- ❌ **Belum bisa** — Fitur belum tersedia

---

## 1. Setup Awal Tahun Ajaran

### Flowchart

```
[1] Admin login → Buka Admin Dashboard
        ↓
[2] Setup Profil Sekolah
    • Nama sekolah, alamat, logo
    • Tahun ajaran aktif
    • Semester aktif
        ↓
[3] Buat Kelas
    • Per tingkat dan rombel (8A, 8B, 8C...)
    • Set jadwal pelajaran per kelas
    • Set kapasitas maksimal
        ↓
[4] Import Data Siswa
    ├── Manual: tambah satu per satu
    ├── Bulk: upload CSV/Excel
    └── Dapodik: import dari NPSN (jika terintegrasi)
        ↓
[5] Buat Akun Guru
    ├── Manual: email + password
    └── Bulk: upload CSV
        ↓
[6] Assign Guru ke Kelas
    • Guru mapel → kelas yang diajar
    • Wali kelas → kelas yang diwalikan
        ↓
[7] Distribusi Akses
    • Share join code ke siswa (via WhatsApp)
    • Share login info ke guru
    • (Opsional) Undang orang tua ke parent portal
        ↓
[8] Verifikasi
    • Cek semua kelas terisi siswa ✓
    • Cek semua kelas punya guru ✓
    • Cek siswa bisa login ✓
    • Setup selesai ✓
```

### Status per Step

| Step                       | Actor      | Status EduSync | Catatan                                                      |
| -------------------------- | ---------- | -------------- | ------------------------------------------------------------ |
| 1. Admin login             | Admin      | ✅             | Multi-role auth + admin dashboard                            |
| 2. Setup profil sekolah    | Admin      | ⚠️             | Tenant ada, tapi konfigurasi sekolah (logo, alamat) terbatas |
| 3. Buat kelas              | Admin      | ✅             | Class management lengkap dengan jadwal dan kapasitas         |
| 4. Import siswa — manual   | Admin      | ✅             | User management tersedia                                     |
| 4. Import siswa — bulk CSV | Admin      | ⚠️             | Bulk import ada tapi error handling perlu improvement        |
| 4. Import siswa — Dapodik  | Admin      | ❌             | Integrasi Dapodik belum ada                                  |
| 5. Buat akun guru          | Admin      | ✅             | User management dengan role assignment                       |
| 6. Assign guru ke kelas    | Admin      | ✅             | Class management support guru assignment                     |
| 7. Distribusi join code    | Admin/Guru | ✅             | Join code system tersedia                                    |
| 7. Undang orang tua        | Admin      | ❌             | Parent portal belum ada                                      |
| 8. Verifikasi setup        | Admin      | ⚠️             | Tidak ada setup verification checklist                       |

### Gap Analysis & Rekomendasi

| Gap                          | Prioritas | Rekomendasi                                                            |
| ---------------------------- | --------- | ---------------------------------------------------------------------- |
| Setup verification checklist | P1        | Buat "Setup Wizard" yang guide admin step-by-step dan cek completeness |
| Dapodik import               | P2        | Integrasi API Dapodik untuk auto-populate siswa dan guru               |
| School profile config        | P1        | Tambah halaman setting sekolah (logo, alamat, visi-misi)               |
| Bulk import error handling   | P1        | Preview data sebelum import, row-level error reporting                 |

---

## 2. Pembuatan Konten Pembelajaran

### Flowchart

```
[1] Guru login → Dashboard Guru
        ↓
[2] Buat Course Baru
    • Judul, deskripsi, thumbnail
    • Pilih kelas tujuan
    • Status: Draft
        ↓
[3] Buat Modul (Bab/Unit)
    • Judul modul, deskripsi
    • Urutan modul (drag-drop)
    • Tambah modul sebanyak yang diperlukan
        ↓
[4] Buat Lesson per Modul
    • Pilih tipe: text, video, file, multi-block
    • Tambah konten (editor block-based)
    ├── Text block: rich text editor
    ├── Video block: embed YouTube/upload
    ├── File block: upload PDF/dokumen
    ├── Quiz block: embed quiz inline
    └── Assignment block: embed tugas
        ↓
[5] Buat Quiz / Soal
    ├── Buat dari scratch
    │   • Pilih tipe: pilihan ganda, essay, jawaban singkat
    │   • Set poin, passing score, timer
    │   • Tambah soal satu per satu
    └── Import dari Question Bank
        • Cari soal berdasarkan tag/topik
        • Pilih soal → tambah ke quiz
        ↓
[6] Buat Assignment (Tugas)
    • Instruksi tugas
    • Set deadline
    • Set max points
    • Pilih tipe submission: text/file/both
        ↓
[7] Review & Preview
    • Preview course sebagai siswa
    • Cek urutan lesson
    • Cek quiz berjalan
        ↓
[8] Publish Course
    • Ubah status: Draft → Published
    • Siswa di kelas tujuan langsung bisa akses
    • Notifikasi ke siswa: "Materi baru tersedia"
```

### Status per Step

| Step                          | Actor | Status EduSync | Catatan                                                             |
| ----------------------------- | ----- | -------------- | ------------------------------------------------------------------- |
| 1. Login guru                 | Guru  | ✅             |                                                                     |
| 2. Buat course                | Guru  | ✅             | Course CRUD lengkap                                                 |
| 3. Buat modul                 | Guru  | ✅             | Drag-drop ordering, `"order"` column                                |
| 4. Buat lesson                | Guru  | ✅             | Block-based system, multiple tipe                                   |
| 5a. Buat quiz dari scratch    | Guru  | ✅             | Quiz engine lengkap                                                 |
| 5b. Import dari question bank | Guru  | ✅             | Question bank tersedia                                              |
| 6. Buat assignment            | Guru  | ✅             | Assignment + group assignment                                       |
| 7. Preview                    | Guru  | ⚠️             | Preview mode ada tapi tidak bisa "lihat sebagai siswa" secara penuh |
| 8. Publish                    | Guru  | ✅             | Draft → Published workflow                                          |
| 8. Notifikasi ke siswa        | Auto  | ✅             | Notification system tersedia                                        |

### Gap Analysis & Rekomendasi

| Gap                                    | Prioritas | Rekomendasi                                                           |
| -------------------------------------- | --------- | --------------------------------------------------------------------- |
| AI content generation lebih integrated | P1        | "Generate soal dari materi lesson" 1-click di dalam course builder    |
| Template course per kurikulum          | P1        | Siapkan template course untuk Kurikulum Merdeka per mapel per jenjang |
| Collaborative content                  | P2        | Guru bisa kolaborasi buat course (co-teacher)                         |
| Version history                        | P2        | Undo/redo dan history perubahan pada course                           |
| Kurikulum Merdeka tagging              | P1        | Tag CP (Capaian Pembelajaran) pada setiap course dan lesson           |

---

## 3. Kegiatan Belajar Mengajar (KBM) Harian

### Flowchart — Perspektif Siswa

```
[1] Siswa login (pagi hari)
        ↓
[2] Lihat Dashboard
    • Kursus yang sedang diambil
    • Tugas dengan deadline hari ini
    • Quiz yang tersedia
    • Pengumuman terbaru
        ↓
[3] Absensi Kehadiran
    ├── Scan QR Code di kelas
    └── Guru manual input
        ↓
[4] Mulai Belajar
    • Pilih kursus → pilih modul → pilih lesson
    • Baca/tonton materi
    • Progress auto-track
        ↓
[5] Kerjakan Quiz (jika ada)
    • Start quiz → jawab soal → autosave → submit
    • Lihat hasil langsung (auto-grade)
    • Review jawaban benar/salah
        ↓
[6] Kerjakan Tugas (jika ada)
    • Baca instruksi
    • Submit jawaban (text/file)
    • Tunggu grading guru
        ↓
[7] Interaksi
    ├── Diskusi di forum (tanya jawab)
    ├── Tanya AI Tutor (jika stuck)
    └── Lihat leaderboard & badges
        ↓
[8] Selesai Hari Ini
    • Streak +1 ✅
    • XP bertambah
    • Progress updated
```

### Flowchart — Perspektif Guru

```
[1] Guru login (pagi hari)
        ↓
[2] Lihat Dashboard Guru
    • Kelas hari ini
    • Tugas yang perlu dinilai
    • Alert siswa at-risk
        ↓
[3] Buka Absensi Kelas
    • Scan QR atau manual input
    • Record kehadiran
        ↓
[4] Monitor Kelas
    • Lihat progress siswa di lesson
    • Cek siapa yang belum selesai
        ↓
[5] Grading
    ├── Quiz: auto-graded, review jika perlu
    ├── Assignment: Speed Grader → beri nilai + feedback
    └── Essay: AI-assisted grading → review + adjust
        ↓
[6] Komunikasi
    ├── Post pengumuman
    ├── Reply diskusi forum
    └── (Future) Reply pesan orang tua
        ↓
[7] Review Analytics
    • Cek engagement kelas
    • Follow up siswa at-risk
    • Adjust materi jika perlu
```

### Status per Step

| Step                 | Actor      | Status EduSync | Catatan                        |
| -------------------- | ---------- | -------------- | ------------------------------ |
| Siswa login          | Siswa      | ✅             |                                |
| Dashboard siswa      | Siswa      | ✅             | Comprehensive dashboard        |
| Absensi QR           | Siswa/Guru | ✅             | QR scan attendance             |
| Belajar lesson       | Siswa      | ✅             | Smart lesson player            |
| Kerjakan quiz        | Siswa      | ✅             | Quiz engine + autosave         |
| Submit tugas         | Siswa      | ✅             | Assignment submission          |
| Forum diskusi        | Siswa      | ✅             | Discussion forum               |
| AI Tutor             | Siswa      | ✅             | AI chatbot context-aware       |
| Gamification track   | Auto       | ✅             | XP, streak, badge, leaderboard |
| Dashboard guru       | Guru       | ✅             |                                |
| Grading — quiz       | Guru       | ✅             | Auto-grade + manual review     |
| Grading — assignment | Guru       | ✅             | Speed Grader                   |
| Grading — AI essay   | Guru       | ✅             | AI-assisted                    |
| Post pengumuman      | Guru       | ✅             | Announcement system            |
| Reply forum          | Guru       | ✅             | Discussion system              |
| Analytics kelas      | Guru       | ✅             | Comprehensive analytics        |
| Alert siswa at-risk  | Auto       | ✅             | Struggle detection             |

### Gap Analysis & Rekomendasi

| Gap                              | Prioritas | Rekomendasi                        |
| -------------------------------- | --------- | ---------------------------------- |
| Push notification untuk deadline | P0        | Implementasi PWA push notification |
| "Lanjutkan belajar" smart button | P0        | Auto-resume ke lesson terakhir     |
| Mobile-optimized daily workflow  | P0        | PWA untuk akses dari HP            |
| Video conference in lesson       | P1        | Embed Google Meet/Jitsi            |
| Parent daily summary             | P1        | Notifikasi harian ke orang tua     |

---

## 4. Assessment Cycle (Ujian & Penilaian)

### Flowchart

```
[1] Guru Membuat Ujian
    ├── Pilih tipe: Quiz (auto-grade) atau Assignment (manual)
    ├── Set parameter:
    │   • Waktu mulai & selesai
    │   • Durasi timer
    │   • Passing score
    │   • Max attempts
    │   • Randomize soal? Randomize opsi?
    └── Pilih soal dari question bank atau buat baru
        ↓
[2] Assign ke Kelas
    • Pilih kelas mana yang mendapat ujian
    • Set deadline per kelas (jika berbeda)
    • Publish → notifikasi ke siswa
        ↓
[3] Siswa Mengerjakan
    • Login → lihat ujian di dashboard
    • Start quiz → timer mulai
    • Jawab soal → autosave setiap 30 detik
    • Submit sebelum timer habis
    • (Jika timer habis → auto-submit)
        ↓
[4] Auto-Grading
    • Pilihan ganda & jawaban singkat → auto-grade
    • Skor langsung muncul untuk siswa
    • Quiz statistics auto-update
        ↓
[5] Manual Review (jika ada essay/tugas)
    ├── Speed Grader: review satu per satu
    ├── AI Essay Grading: suggest score + feedback
    └── Guru adjust score & tambah feedback
        ↓
[6] Publikasi Nilai
    • Guru publish nilai → masuk ke gradebook
    • Siswa dapat notifikasi nilai
    • (Future) Orang tua dapat notifikasi
        ↓
[7] Analisis Hasil
    • Quiz statistics: avg score, distribution, item analysis
    • Identifikasi soal sulit (low correct rate)
    • Identifikasi siswa at-risk (consistently low)
    • Guru adjust teaching strategy
```

### Status per Step

| Step                 | Actor | Status EduSync | Catatan                      |
| -------------------- | ----- | -------------- | ---------------------------- |
| 1. Buat ujian        | Guru  | ✅             | Quiz manager + question bank |
| 2. Assign ke kelas   | Guru  | ✅             | Quiz assignment to classes   |
| 3. Siswa mengerjakan | Siswa | ✅             | Timer, autosave, auto-submit |
| 4. Auto-grading      | Auto  | ✅             | MC + short answer auto-grade |
| 5. Manual review     | Guru  | ✅             | Speed Grader + AI essay      |
| 6. Publikasi nilai   | Guru  | ✅             | Gradebook + notification     |
| 7. Analisis hasil    | Guru  | ✅             | Quiz stats + analytics       |

### Gap Analysis & Rekomendasi

| Gap                                 | Prioritas | Rekomendasi                                      |
| ----------------------------------- | --------- | ------------------------------------------------ |
| Item analysis per soal              | P1        | "Soal #5 hanya 30% benar — pertimbangkan revisi" |
| Ujian anti-cheating                 | P2        | Tab-switch detection, randomize lebih agresif    |
| Remedial auto-assign                | P2        | Siswa yang gagal auto-dapat remedial quiz        |
| Ujian terjadwal (scheduled publish) | P1        | Set publish time di masa depan                   |
| Nilai ke format e-Rapor             | P1        | Export nilai semester ke format Kemendikbud      |

---

## 5. Semester Close (Akhir Semester)

### Flowchart

```
[1] Rekap Nilai
    • Guru finalize semua nilai di gradebook
    • Cek: ada tugas yang belum dinilai?
    • Cek: ada siswa yang belum submit?
    ├── Warning: "5 tugas belum dinilai"
    └── Deadline: guru harus selesaikan grading
        ↓
[2] Generate Rapor
    ├── Auto-calculate: rata-rata per mapel per siswa
    ├── (Future) Generate deskripsi naratif per mapel (AI-assisted)
    ├── Input catatan wali kelas
    └── Review & approve rapor
        ↓
[3] Distribusi Rapor
    ├── (Future) Export PDF → cetak untuk rapat orang tua
    ├── (Future) Publish di parent portal
    └── (Current) Export CSV untuk input manual ke e-Rapor
        ↓
[4] Arsip Data Semester
    • Course di-archive (status: archived)
    • Data tetap tersimpan untuk referensi
    • Analytics semester tetap bisa diakses
        ↓
[5] Setup Semester Baru
    • Clone course structure ke semester baru
    • Reset progress siswa
    • Update kelas (siswa naik kelas jika perlu)
    • Assign guru semester baru (jika ada perubahan)
        ↓
[6] Evaluasi Semester
    • Report: overview performance sekolah
    • Bandingkan vs semester sebelumnya
    • Identifikasi area improvement
    • Presentasi ke kepala sekolah/yayasan
```

### Status per Step

| Step                         | Actor      | Status EduSync | Catatan                                            |
| ---------------------------- | ---------- | -------------- | -------------------------------------------------- |
| 1. Rekap nilai               | Guru       | ✅             | Gradebook tersedia                                 |
| 1. Warning belum dinilai     | System     | ⚠️             | Tidak ada reminder khusus end-of-semester          |
| 2. Generate rapor            | Guru/Admin | ❌             | Rapor digital belum ada                            |
| 2. AI narrative              | AI         | ❌             | AI deskripsi rapor belum ada                       |
| 3. Distribusi — PDF          | Admin      | ❌             | Export rapor PDF belum ada                         |
| 3. Distribusi — parent       | Admin      | ❌             | Parent portal belum ada                            |
| 3. Distribusi — CSV e-Rapor  | Admin      | ⚠️             | Export CSV bisa tapi belum format e-Rapor          |
| 4. Arsip semester            | Admin      | ⚠️             | Course bisa di-archive tapi tidak ada bulk archive |
| 5. Clone course              | Guru       | ❌             | Clone/duplicate course belum ada                   |
| 5. Reset progress            | Admin      | ❌             | Bulk reset student progress belum ada              |
| 5. Update kelas (naik kelas) | Admin      | ⚠️             | Manual move siswa antar kelas                      |
| 6. Evaluasi semester         | Admin      | ⚠️             | Analytics ada tapi belum ada semester comparison   |

### Gap Analysis & Rekomendasi

| Gap                            | Prioritas | Rekomendasi                                                  |
| ------------------------------ | --------- | ------------------------------------------------------------ |
| **Rapor digital generation**   | P0        | Template rapor sesuai Kemendikbud + PDF export               |
| **Clone course structure**     | P1        | 1-click duplicate course ke semester baru (tanpa data siswa) |
| **Bulk archive semester**      | P1        | "Arsipkan Semua Kursus Semester 1" button                    |
| **Semester transition wizard** | P1        | Step-by-step: archive → clone → reset → reassign             |
| **Semester comparison report** | P1        | "Semester 1 vs Semester 2" analytics                         |
| **AI rapor narrative**         | P2        | AI generate deskripsi per mapel dari data nilai              |
| **Bulk kenaikan kelas**        | P1        | Move siswa batch dari 8A ke 9A                               |

---

## 6. PPDB (Penerimaan Peserta Didik Baru)

### Flowchart

```
[1] Admin Setup PPDB
    • Buat periode PPDB (tanggal buka-tutup)
    • Set jalur penerimaan (zonasi, prestasi, afirmasi)
    • Set kuota per jalur
    • Set dokumen yang diperlukan
        ↓
[2] Calon Siswa Mendaftar
    • Akses halaman pendaftaran (public link)
    • Isi formulir: data diri, asal sekolah, pilihan jurusan
    • Upload dokumen (ijazah, KK, akta, foto)
    • Submit pendaftaran
        ↓
[3] Verifikasi Berkas
    • Admin review dokumen per pendaftar
    • Status: Lengkap / Kurang / Ditolak
    • Notifikasi ke pendaftar jika kurang
        ↓
[4] Seleksi
    ├── Otomatis: ranking berdasarkan nilai/jarak/prestasi
    └── Manual: panitia review dan putuskan
        ↓
[5] Pengumuman
    • Publish hasil seleksi
    • Notifikasi ke semua pendaftar
    • Diterima → instruksi daftar ulang
    • Tidak diterima → notifikasi
        ↓
[6] Daftar Ulang & Enrollment
    • Siswa diterima → create user account
    • Assign ke kelas
    • Masuk ke EduSync sebagai siswa aktif
    • (Opsional) Undang orang tua ke parent portal
```

### Status per Step

| Step                    | Actor       | Status EduSync | Catatan                                            |
| ----------------------- | ----------- | -------------- | -------------------------------------------------- |
| 1. Setup PPDB           | Admin       | ✅             | PPDB Dashboard tersedia                            |
| 2. Formulir pendaftaran | Calon siswa | ⚠️             | Form ada tapi customization terbatas               |
| 3. Verifikasi berkas    | Admin       | ⚠️             | Workflow ada tapi document preview terbatas        |
| 4. Seleksi otomatis     | System      | ⚠️             | Basic ranking ada, tapi belum full zonasi/prestasi |
| 5. Pengumuman           | Admin       | ⚠️             | Bisa publish tapi notifikasi ke pendaftar terbatas |
| 6. Enrollment otomatis  | Admin       | ⚠️             | Manual create user, belum auto-enroll dari PPDB    |

### Gap Analysis & Rekomendasi

| Gap                               | Prioritas | Rekomendasi                                              |
| --------------------------------- | --------- | -------------------------------------------------------- |
| Auto-enrollment dari PPDB ke user | P1        | Siswa diterima → auto-create account → auto-assign kelas |
| Zonasi mapping                    | P2        | Integrasi peta untuk verifikasi jarak rumah-sekolah      |
| Public announcement page          | P1        | Halaman publik untuk cek hasil seleksi (tanpa login)     |
| Daftar ulang online               | P2        | Flow daftar ulang + upload bukti pembayaran              |
| PPDB reporting ke dinas           | P2        | Export data PPDB sesuai format dinas pendidikan          |

---

## Ringkasan Status Keseluruhan

### Per Proses Bisnis

| Proses              | Steps Total | ✅ Bisa      | ⚠️ Partial   | ❌ Belum    | Coverage |
| ------------------- | ----------- | ------------ | ------------ | ----------- | -------- |
| 1. Setup Awal       | 10          | 5            | 3            | 2           | 65%      |
| 2. Pembuatan Konten | 9           | 8            | 1            | 0           | 94%      |
| 3. KBM Harian       | 16          | 15           | 0            | 1           | 94%      |
| 4. Assessment Cycle | 7           | 7            | 0            | 0           | 100%     |
| 5. Semester Close   | 11          | 1            | 5            | 5           | 32%      |
| 6. PPDB             | 6           | 1            | 5            | 0           | 58%      |
| **Total**           | **59**      | **37 (63%)** | **14 (24%)** | **8 (13%)** | **74%**  |

### Insight Utama

1. **KBM harian dan Assessment sudah sangat kuat** (94-100% coverage) — core learning experience EduSync sudah solid.
2. **Pembuatan konten juga kuat** (94%) — course builder dan quiz engine sudah comprehensive.
3. **Semester Close adalah gap terbesar** (32%) — proses akhir semester (rapor, arsip, transition) hampir sepenuhnya belum ada. Ini adalah pain point terbesar untuk admin dan guru di akhir semester.
4. **Setup awal cukup** (65%) — bisa berjalan tapi butuh streamlining (wizard, bulk import, Dapodik).
5. **PPDB perlu maturation** (58%) — fitur ada tapi perlu polishing.

### Top 10 Gaps yang Harus Ditutup

| Rank | Gap                                  | Proses         | Prioritas | Impact        |
| ---- | ------------------------------------ | -------------- | --------- | ------------- |
| 1    | Rapor digital (PDF + e-Rapor format) | Semester Close | P0        | Sangat Tinggi |
| 2    | Clone course ke semester baru        | Semester Close | P1        | Tinggi        |
| 3    | Semester transition wizard           | Semester Close | P1        | Tinggi        |
| 4    | Bulk kenaikan kelas                  | Semester Close | P1        | Tinggi        |
| 5    | Push notification (PWA)              | KBM Harian     | P0        | Sangat Tinggi |
| 6    | Parent portal + notifikasi           | All proses     | P0        | Sangat Tinggi |
| 7    | Setup verification checklist         | Setup Awal     | P1        | Medium        |
| 8    | Dapodik import                       | Setup Awal     | P2        | Medium        |
| 9    | Auto-enrollment dari PPDB            | PPDB           | P1        | Medium        |
| 10   | Kurikulum Merdeka tagging            | Konten         | P1        | Tinggi        |

---

_Dokumen ini sebaiknya di-review bersama admin sekolah dan guru untuk validasi apakah flow sudah sesuai dengan realita operasional sekolah mereka. Setiap sekolah mungkin memiliki variasi proses._
