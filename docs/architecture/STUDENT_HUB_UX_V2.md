# EduSync Student Learning Hub UX v2

Dokumen ini menjelaskan strategi pembaruan UI/UX untuk **Student Dashboard (Hub)**. Tujuannya adalah memperjelas perbedaan konseptual antara mode *Learning* (belajar materi) dan mode *Assessment* (ujian/kuis), serta meningkatkan tingkat retensi siswa dengan meminjam pola desain dari aplikasi berfokus pada keterlibatan seperti Duolingo atau Notion.

---

## 1. Pemisahan Konsep Dasar (Mental Model)

Siswa tidak boleh lagi bingung membedakan antara materi pembelajaran mandiri dan ujian terstruktur. Kita memperjelas ini melalui taksonomi visual, label, dan ikonografi.

| Aspek | Smart Player (Learning) | Quiz Center (Assessment) |
| :--- | :--- | :--- |
| **Sumber Data** | Dibuat melalui `Course Builder` oleh Guru | Dibuat melalui `Quiz Manager` oleh Guru |
| **Tujuan Utama** | Konsumsi materi (Video, Artikel, Diskusi) | Evaluasi kompetensi (Pilihan Ganda, Esai) |
| **State Siswa** | Santai, eksploratif, bisa di-*pause* | Tegang, berbatas waktu (*timed*), *high-stakes* |
| **Tag Visual UX** | Label: `[ Learning ]` / Ikon: `▶️` | Label: `[ Assessment ]` / Ikon: `🧠` atau `📝` |

---

## 2. Struktur Baru Student Hub (Dashboard)

Halaman utama (`/student/dashboard`) tidak lagi berupa daftar kartu fitur datar, melainkan *action-oriented feed* yang memandu siswa menjawab satu pertanyaan: **"Apa yang harus saya kerjakan sekarang?"**

### A. The "Up Next" Hero Section
Bagian teratas (*above the fold*) mendedikasikan ruang besar untuk **1 Tugas atau Kuis paling mendesak**.
- Menampilkan penghitung waktu mundur ("*Due in 14 hours*").
- Tombol aksi primer raksasa: **"Take Quiz Now"** atau **"Resume Lesson"**.

### B. Action Cards (Card Navigation)
Kartu navigasi fitur kini memiliki label dan deskripsi yang eksplisit untuk menghilangkan ambiguitas:

1. **Smart Player Card**
   - **Label Tag**: `[ Learning ]`
   - **Judul**: Course & Modules
   - **Deskripsi**: "Lanjutkan materi pelajaran, tonton video, dan baca artikel dari gurumu."
   - **CTA Button**: "Continue Learning ▶️"

2. **Quiz Center Card**
   - **Label Tag**: `[ Assessment ]`
   - **Judul**: Quizzes & Exams
   - **Deskripsi**: "Kerjakan kuis berbatas waktu dan ujian formatif."
   - **CTA Button**: "View Quizzes 📝"

3. **Assignment Center Card**
   - **Label Tag**: `[ Homework ]`
   - **Judul**: Assignments
   - **Deskripsi**: "Kumpulkan dokumen tugas dan proyek akhirmu di sini."
   - **CTA Button**: "View Assignments 📤"

---

## 3. Sidebar Navigation Structure (Student View)

Sidebar harus mencerminkan pembagian fungsionalitas ini secara logis, meninggalkan menu lama yang membingungkan:

```text
(Student Sidebar)
🏠 Hub                   (Dashboard utama, deadline terdekat)
📚 My Courses            (Akses ke Smart Player)
🧠 Quiz Center           (Daftar kuis aktif & riwayat kuis)
📝 Assignments           (Pengumpulan tugas proyek)
📊 My Grades             (Rapot dan umpan balik)
🏆 Achievements          (Gamifikasi: Streaks, Badges, Leaderboard)
```

---

## 4. Pola Interaksi (UX Patterns) ala Duolingo/Notion

1. **Streaks & Daily Goals (Gamification)**
   - Di pojok kanan atas (*Topbar*), tampilkan ikon api (🔥) yang menunjukkan "Streak Belajar".
   - Jika siswa menyelesaikan *minimal 1 modul materi* atau *mengumpulkan 1 kuis*, *streak* bertambah. Ini menumbuhkan kebiasaan harian (Habit Loop).

2. **Progress Rings (Visual Cue)**
   - Di setiap kartu *Course* pada halaman "My Courses", gunakan indikator progres melingkar (*circular progress bar*) daripada *bar* horizontal biasa. Lingkaran yang tidak tertutup memicu efek psikologis (Zeigarnik effect) yang mendorong siswa untuk menyelesaikannya.

3. **Empty States yang Menyenangkan**
   - Jika tidak ada tugas atau kuis yang aktif, jangan tampilkan tabel kosong yang membosankan.
   - Tampilkan ilustrasi maskot EduSync yang sedang bersantai dengan teks: *"You're all caught up! Time to relax or review your past materials."*

4. **Tanda "New" (Pulsing Dot)**
   - Saat guru baru saja menerbitkan kuis baru atau membagikan nilai, berikan indikator titik merah berdenyut (*pulsing notification dot*) di sidebar yang bersangkutan.

---

## 5. Ringkasan Kesalahan Anti-Pattern yang Dihindari

- ❌ **Mencampur Kuis di dalam Course Builder**: Siswa menjadi terkejut jika di tengah-tengah membaca artikel tiba-tiba dihadapkan dengan ujian berwaktu. Kuis (`Quiz Center`) dipisahkan secara entitas dari Materi (`Course Builder`).
- ❌ **Bahasa yang Ambigu**: Menghindari pemakaian kata "Mulai Sesi" untuk kedua kartu. Sekarang menggunakan "Continue Learning" (Materi) dan "Take Quiz" (Ujian).
- ❌ **Daftar Tugas Berbasis Tanggal Dibuat**: *To-Do list* tidak lagi diurutkan berdasarkan *kapan* guru membuatnya, melainkan murni diurutkan berdasarkan kalender *deadline* terdekat.

Pendekatan V2 ini mendudukkan EduSync bukan sekadar sebagai laci penyimpanan file (*repository*), melainkan sebagai asisten pembelajaran (*learning companion*) yang aktif.
