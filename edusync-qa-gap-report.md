# EduSync LMS — Laporan QA Lengkap

**Tanggal:** 21 Maret 2026
**Tester:** Claude QA Agent
**Cakupan:** Semua role (Teacher, Student, Admin) — semua halaman & user flow
**Severity:** 🔴 Critical | 🟡 Major | 🟢 Minor | 🌐 Localization

---

## Ringkasan Eksekutif

| Kategori                             | Jumlah |
| ------------------------------------ | ------ |
| 🔴 Critical (crash / data loss)      | 4      |
| 🟡 Major (fitur rusak / broken UX)   | 14     |
| 🟢 Minor (polish / edge case)        | 9      |
| 🌐 Localization (teks Inggris di UI) | 21     |
| **Total**                            | **48** |

---

## 🔴 CRITICAL — Harus diperbaiki sebelum launch

### BUG-001 — SpeedGrader crash: TypeError saat student array kosong

**Role:** Teacher
**Halaman:** `/#/app/teacher/grader`
**Repro:** Buka SpeedGrader tanpa ada submission yang di-assign
**Error:** `TypeError: Cannot read properties of undefined (reading 'name')` — `currentStudent.name` di SpeedGrader.tsx baris 157, 510, 613, 619
**Root cause:** `currentStudent = students[currentStudentIdx]` (baris 113) tanpa null guard. Jika array kosong, `currentStudent` = `undefined`.
**Impact:** Halaman crash total, tidak bisa digunakan
**Fix:** Tambahkan null guard `if (!currentStudent) return <EmptyState />`

---

### BUG-002 — Scan Absensi crash: TypeError sama dengan SpeedGrader

**Role:** Teacher
**Halaman:** `/#/app/teacher/scan-attendance`
**Error:** Error boundary menampilkan "Terjadi Kesalahan" — same pattern dengan BUG-001
**Impact:** Fitur absensi tidak bisa digunakan sama sekali

---

### BUG-003 — Group Tasks crash: TypeError sama

**Role:** Teacher
**Halaman:** `/#/app/teacher/group-tasks`
**Error:** Error boundary — same crash pattern
**Impact:** Fitur tugas kelompok tidak bisa digunakan

---

### BUG-004 — Forum post gagal total (silent error)

**Role:** Teacher & Student
**Halaman:** `/#/forum`
**Repro:** Tulis pertanyaan/diskusi → klik "Posting Pertanyaan"
**Error:** Console: `discussionService.ts:50 Error saving discussion: Object`
**Impact:** Tidak ada satu pun diskusi yang bisa di-post. Tidak ada toast error ke user — gagal secara diam-diam
**Root cause:** Kemungkinan RLS policy Supabase tidak mengizinkan insert, atau column mismatch

---

## 🟡 MAJOR — Fitur Rusak / UX Terganggu

### BUG-005 — SpeedGrader card di Teaching Hub salah navigasi

**Role:** Teacher
**Halaman:** `/#/app/teacher` (Teaching Hub)
**Repro:** Klik card "SpeedGrader"
**Expected:** Navigasi ke `/#/app/teacher/grader`
**Actual:** Navigasi ke `/#/creator` (AI Creator) — routing salah

---

### BUG-006 — Kalender menampilkan tanggal hari ini yang salah

**Role:** Teacher (kemungkinan semua role)
**Halaman:** `/#/calendar`
**Bug:** Kalender menampilkan "hari ini" sebagai 4 Maret 2026, padahal tanggal sebenarnya adalah 21 Maret 2026
**Efek domino:** "Agenda Mendatang" menampilkan event 19-20 Maret sebagai "upcoming" padahal sudah lewat

---

### BUG-007 — Semua click target di Smart Player tidak responsif (koordinat)

**Role:** Student
**Halaman:** `/#/app/student/courses`
**Bug:** Klik pada module rows, lesson items, dan course cards menggunakan koordinat mouse tidak berfungsi. Hanya JS `.click()` yang bisa memicu aksi.
**Kemungkinan penyebab:** Overlay transparan atau z-index stacking yang menghalangi event klik
**Impact:** Pengguna tidak bisa navigasi lesson secara natural dari SmartPlayer

---

### BUG-008 — Diskusi tab di lesson viewer infinite loading

**Role:** Student
**Halaman:** Smart Player → tab "Diskusi"
**Bug:** Tab Diskusi menampilkan "Memuat diskusi..." selamanya, tidak pernah selesai
**Impact:** Siswa tidak bisa berdiskusi tentang materi pelajaran dari dalam lesson viewer

---

### BUG-009 — Tutor AI suggestion pill menyebabkan tab switch ke Materi

**Role:** Student
**Halaman:** Smart Player → tab "Tutor AI"
**Bug:** Klik pada suggestion pill ("Apa inti pembelajaran dari materi ini?") menyebabkan halaman kembali ke tab "Materi" alih-alih mengisi input Tutor AI
**Root cause:** Event propagation tidak di-stop — klik bubble ke parent tab switcher

---

### BUG-010 — Settings sub-tab tidak berfungsi (semua role)

**Role:** Teacher, Student (kemungkinan Admin juga)
**Halaman:** `/#/settings`
**Bug:** Klik pada tab "Notifikasi", "Keamanan", "Bahasa & Wilayah" tidak mengubah konten — tetap menampilkan Akun & Profil
**Impact:** 3 dari 5 tab Settings tidak bisa diakses. Fitur-fitur ini tidak bisa digunakan pengguna.

---

### BUG-011 — Quiz counter "0 Selesai" meskipun kuis sudah completed

**Role:** Student
**Halaman:** `/#/app/student/quizzes`
**Bug:** Stat panel menampilkan "0 SELESAI" tapi kedua kuis di daftar menunjukkan badge "SELESAI"
**Impact:** Dashboard statistik tidak akurat, mengurangi kepercayaan pengguna

---

### BUG-012 — `/app/student/profile` mengembalikan 404

**Role:** Student
**Bug:** URL `/#/app/student/profile` memberikan halaman 404. Profil sebenarnya ada di `/#/profile`. Tidak ada link dari sidebar student ke profil.
**Impact:** Pengguna tidak dapat menemukan profil dari navigasi student. Jika ada link internal yang mengarah ke `/app/student/profile`, akan 404.

---

### BUG-013 — Admin Aksi Cepat buttons tidak navigasi ke mana pun

**Role:** Admin
**Halaman:** `/#/app/admin` (scrolled down)
**Bug:** Tombol "Konfigurasi Sekolah", "Manajemen Akun Staf", "Laporan Audit Log", "Backup Database" tidak memiliki navigasi — klik tidak melakukan apa-apa
**Impact:** Admin hub tidak berguna sebagai launching pad ke fitur-fitur administrasi

---

### BUG-014 — Admin sidebar hanya menampilkan "Administrasi" — tidak ada navigasi ke sub-halaman

**Role:** Admin
**Bug:** Sidebar admin hanya punya satu item ("Administrasi"). Tidak ada link ke Users, Finance, PPDB, Moderation, Audit, dll. Admin harus hafal URL secara manual.
**Impact:** UX admin sangat terbatas — tidak bisa navigasi antar modul

---

### BUG-015 — Manajemen Pengguna menampilkan 0 users (data tidak muncul)

**Role:** Admin
**Halaman:** `/#/app/admin/users`
**Bug:** Total Users: 0, Active Users: 0, Admins: 0 — padahal ada setidaknya 3 akun aktif (teacher, student, admin)
**Kemungkinan:** RLS policy terlalu ketat, atau query tidak menggunakan service role key

---

### BUG-016 — "Pusat Tugas" Teacher mengembalikan 404

**Role:** Teacher
**Halaman:** `/#/app/teacher/tasks`
**Bug:** Route tidak terdaftar — 404
**Impact:** Fitur manajemen tugas guru tidak dapat diakses melalui rute yang diharapkan

---

### BUG-017 — XP tidak bertambah setelah kuis selesai (real-time update)

**Role:** Student
**Bug:** Setelah menyelesaikan kuis (100%, 3/3 benar), XP counter di header tetap "50 XP" — tidak ada perubahan real-time
**Catatan:** XP mungkin sudah diset sebelumnya dari seed data, namun tidak ada animasi/feedback XP reward

---

### BUG-018 — Onboarding modal tidak memiliki tombol "Lewati"

**Role:** Student
**Halaman:** Smart Player (pertama kali)
**Bug:** Modal "Cara menggunakan Lesson Viewer" tidak bisa di-skip langsung — harus di-X atau menunggu
**Impact:** Pengguna yang sudah familiar harus menutup tooltip secara manual setiap kali membuka lesson baru

---

## 🟢 MINOR — Polish & Edge Case

### BUG-019 — "Estimasi XP: -50 XP" tampil negatif di card sertifikat

**Role:** Student
**Halaman:** Dashboard Student
**Bug:** Badge XP di course certificate card menampilkan nilai negatif "-50 XP"
**Fix:** Cek logika kalkulasi XP untuk sertifikat (kemungkinan nilai dibalik)

---

### BUG-020 — Icon module "Module 3" menampilkan angka "2"

**Role:** Student/Teacher
**Halaman:** Smart Player (left panel)
**Bug:** Module 3 menampilkan badge angka "2" — off-by-one error dalam numbering logic

---

### BUG-021 — Icon ⚠️ di empty state "Tidak ada tugas mendesak" misleading

**Role:** Student
**Halaman:** Dashboard Student
**Bug:** Warning icon (⚠️) digunakan untuk state positif. Ganti dengan ✅ atau icon kalender
**Guideline:** Icon warning seharusnya digunakan untuk masalah, bukan "all clear"

---

### BUG-022 — "ALPHA" attendance status salah eja (seharusnya "ALPA")

**Role:** Student
**Halaman:** `/#/app/student/attendance`
**Bug:** Label status "ALPHA" seharusnya "ALPA" dalam Bahasa Indonesia

---

### BUG-023 — Calendar tidak bisa diakses dari sidebar (semua role)

**Halaman:** Sidebar navigation
**Bug:** Tidak ada link kalender di sidebar. Hanya bisa diakses via Social Hub → Jadwal

---

### BUG-024 — "Leaderboard" bar chart area kosong/broken

**Role:** Student
**Halaman:** `/#/app/student/leaderboard`
**Bug:** Area di bawah user card menampilkan kotak biru kosong — chart tidak render

---

### BUG-025 — "Isi Video Dummy" dev button tidak berfungsi

**Role:** Student
**Halaman:** Smart Player → Video lesson
**Bug:** Tombol dev helper tidak melakukan apa pun (kemungkinan RLS atau fungsi belum diimplementasi)

---

### BUG-026 — Module kosong "Module 3" masih tampil (0 pelajaran)

**Role:** Teacher/Student
**Halaman:** Course Detail / Smart Player
**Bug:** Module tanpa konten tetap terlihat. Perlu disembunyikan atau diberi label "Segera Hadir"

---

### BUG-027 — "Status Integrasi PDDIKTI" terminologi salah untuk LMS sekolah

**Role:** Admin
**Halaman:** `/#/app/admin`
**Bug:** PDDIKTI adalah sistem untuk Perguruan Tinggi (universitas), bukan sekolah K-12. Untuk sekolah seharusnya "Dapodik" atau "Data Pokok Pendidikan"

---

## 🌐 LOCALIZATION — Teks Inggris di UI Bahasa Indonesia

Berikut semua string yang perlu diterjemahkan:

| #   | Lokasi                   | Teks Inggris                                                                        | Saran Terjemahan              |
| --- | ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------- |
| L01 | Teacher → Teaching Hub   | "AI Course & Quiz Generator" (judul halaman)                                        | "Generator Kursus & Kuis AI"  |
| L02 | Teacher → Leaderboard    | Heading "Leaderboard"                                                               | "Papan Peringkat"             |
| L03 | Student → Smart Player   | Lesson type "Article"                                                               | "Artikel"                     |
| L04 | Student → Profile        | Badge "Scholar"                                                                     | "Cendekiawan"                 |
| L05 | Student → Profile        | Badge "Course Master"                                                               | "Master Kursus"               |
| L06 | Student → Profile        | Badge "Unstoppable"                                                                 | "Tak Terhentikan"             |
| L07 | Student → Profile        | Badge "On Fire"                                                                     | "Membara"                     |
| L08 | Student → Profile        | Badge "Sharp Shooter"                                                               | "Penembak Jitu"               |
| L09 | Student → Profile        | Badge "Speed Learner"                                                               | "Pelajar Cepat"               |
| L10 | Student → Profile        | Badge "Bookworm"                                                                    | "Kutu Buku"                   |
| L11 | Student → Profile        | Stat label "STREAK HARI"                                                            | "HARI BERTURUT-TURUT"         |
| L12 | Student → Grades         | "Simulasi Nilai (What-If Grades)"                                                   | "Simulasi Nilai"              |
| L13 | Student → Grades         | "WHAT-IF SCORE"                                                                     | "NILAI SIMULASI"              |
| L14 | Student → Gamifikasi hub | Card "Leaderboard"                                                                  | "Papan Peringkat"             |
| L15 | Student → Leaderboard    | "Streak" filter                                                                     | "Rentetan" / "Berturut-turut" |
| L16 | Admin → Feature toggles  | "AI Creator"                                                                        | "Generator Konten AI"         |
| L17 | Admin → Feature toggles  | "SpeedGrader"                                                                       | "Penilaian Cepat"             |
| L18 | Admin → Users            | "Total Users", "Pending Invites", "Active Users", "Admins", "ROLE"                  | Terjemahkan semua             |
| L19 | Admin → Analytics        | "enroll" dan "lesson" dalam kalimat Indonesia                                       | "mendaftar" dan "pelajaran"   |
| L20 | Admin → Finance/Billing  | "Export" button                                                                     | "Ekspor"                      |
| L21 | Admin → Documents        | "Smart Document Editor", "Placeholder Autocomplete", "Rich Text Editor", "Reviewer" | Terjemahkan semua             |

---

## 📊 Halaman yang Berfungsi dengan Baik ✅

**TEACHER:**

- Dashboard guru dengan sapaan personal dan agenda hari
- Teaching Hub 12 card tool (kecuali routing SpeedGrader)
- AI Creator (membuat kuis dari dokumen — berfungsi)
- Buku Nilai (daftar nilai siswa)
- Kalender (tampil, meski tanggal "hari ini" salah)
- Jadwal & Pengumuman (render benar)
- Analytics Guru (Dasbor Analitik)

**STUDENT:**

- Smart Player — konten artikel dan video render dengan benar
- Smart Player — Quiz: pilih jawaban, kirim, dapat skor (100% berfungsi)
- Tutor AI — chat interface berfungsi, pesan sambutan tampil
- Profil Pengguna — XP bar, streak, lencana, statistik
- Gamifikasi hub (2 card)
- Sertifikat halaman (empty state benar)
- Kehadiran (rekap dengan empty state benar)
- Nilai (Simulasi What-If berfungsi)
- Kuis & Evaluasi hub (list kuis tersedia)
- Social Hub → Forum Diskusi, Jadwal, Pengumuman
- Settings → Akun & Profil (edit nama, foto)

**ADMIN:**

- Administrasi Terpusat (feature toggles)
- Moderasi Konten (dengan seed data nyata)
- Keuangan & SPP (data lengkap, chart berfungsi)
- PPDB Online (1.245 data pendaftar)
- Keuangan & Pembayaran/Billing (invoice list)
- Manajemen Surat & Dokumen (template, approval workflow)
- Kelola Materi/Courses (daftar kursus)
- Audit Log (empty state benar)

---

## 🎯 Prioritas Perbaikan

### Sprint 1 — Must Fix (Pre-Launch Blockers)

1. **BUG-001/002/003** — Fix null guard di SpeedGrader, ScanAbsensi, GroupTasks
2. **BUG-004** — Fix forum post (debug RLS + `discussionService.ts`)
3. **BUG-007** — Fix invisible click overlay di Smart Player
4. **BUG-010** — Fix Settings tab navigation

### Sprint 2 — High Priority

5. **BUG-005** — Fix SpeedGrader routing dari Teaching Hub
6. **BUG-006** — Fix kalender tanggal "hari ini"
7. **BUG-008** — Fix Diskusi tab infinite loading di lesson viewer
8. **BUG-009** — Fix event propagation di Tutor AI suggestion pills
9. **BUG-013/014** — Tambah navigasi lengkap di sidebar admin
10. **BUG-015** — Fix User Management tidak memuat data

### Sprint 3 — Polish

11. **BUG-011** — Fix quiz completion counter
12. **BUG-012** — Fix/redirect `/app/student/profile`
13. **BUG-016** — Implementasi atau redirect `/app/teacher/tasks`
14. **BUG-018** — Tambah tombol "Lewati" di onboarding modal
15. **BUG-019** — Fix XP negatif di certificate card
16. **BUG-020** — Fix module numbering off-by-one
17. **L01–L21** — Sweep localization strings

---

_Laporan ini mencakup 48 temuan dari pengujian menyeluruh semua role pada 21 Maret 2026. Total halaman yang diuji: 35+ halaman/flow._
