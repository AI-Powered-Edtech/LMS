# EduSync Complete User Journey Map (Student → Teacher → Admin)

Dokumen ini memetakan **End-to-End User Journey** dari tiga aktor utama di EduSync. Pemetaan ini berfokus pada aliran aktivitas (Activity Flow) yang menghubungkan aksi satu peran dengan peran lainnya (cross-role interaction), serta memberikan visibilitas terhadap pain-points dan titik optimasi UX.

---

## 1. 🔄 The Core Loop (Assignment & Feedback Cycle)
Ini adalah tulang punggung LMS EduSync. Siklus yang mulus di sini menentukan retensi pengguna.

### 👩‍🏫 A. Teacher: Penciptaan Tugas
1. **Navigasi**: Teacher masuk ke `/teacher/courses/:id` $\rightarrow$ Tab "Assignments".
2. **Aksi**: Klik "Create Assignment".
3. **Input**: Mengisi Judul, Deskripsi (Rich Text), Tenggat Waktu (Date/Time picker), Poin Maksimal, dan melampirkan file referensi.
4. **Distribusi**: Memilih opsi "Assign to All Students" atau "Assign to Specific Groups/Students".
5. **Konfirmasi**: Menekan "Publish".
   * $\rightarrow$ **System Trigger**: LMS membuat *push notification* & email untuk semua siswa terdaftar.

### 👨‍🎓 B. Student: Pengerjaan & Pengumpulan
1. **Penemuan**: Student melihat *badge* notifikasi merah di lonceng (Topbar) atau melihat tugas di Hub (Widget "Upcoming Deadlines").
2. **Akses**: Klik tugas $\rightarrow$ Diarahkan ke `/student/assignments/:id`.
3. **Pengerjaan**: 
   - Membaca instruksi dan mengunduh referensi.
   - Menulis langsung di editor teks, atau mengunggah file (PDF/Word).
4. **Autosave / Draft**: *Bekerja di latar belakang tanpa mengganggu UX pengguna.*
5. **Pengumpulan**: Menekan "Submit Assignment".
   * $\rightarrow$ **UX Improvement**: Muncul animasi konfirmasi kecil (confetti/ceklis hijau) yang memicu *dopamine hit*.
   * $\rightarrow$ **System Trigger**: Status berubah menjadi `SUBMITTED`. Guru menerima notifikasi.

### 👩‍🏫 C. Teacher: Evaluasi (SpeedGrader)
1. **Navigasi**: Buka notifikasi atau menu `/teacher/gradebook`.
2. **Akses**: Klik nama tugas. Layar beralih ke mode **SpeedGrader** (Split screen: Kiri PDF viewer/Jawaban siswa, Kanan panel nilai).
3. **Aksi**: 
   - Membaca tugas.
   - Memberikan anotasi (jika PDF) atau komentar *inline*.
   - Memasukkan angka di kotak nilai (misal: 85/100).
   - Mengetik *general feedback* penyemangat.
4. **Iterasi**: Klik "Submit & Next Student" untuk langsung memuat murid berikutnya tanpa *loading screen* penuh.
   * $\rightarrow$ **System Trigger**: Nilai tersimpan di DB. Status menjadi `GRADED`.

### 👨‍🎓 D. Student: Refleksi & Kemajuan
1. **Penemuan**: Menerima notifikasi: "Your assignment has been graded!"
2. **Akses**: Mengklik notifikasi menuju `/student/grades/:assignment_id`.
3. **Aksi**: 
   - Melihat nilai akhir.
   - Membaca *feedback* dari guru.
4. **Gamifikasi**: 
   - Jika nilai $> 80$, layar memicu *event* pemberian "Excellence Badge" atau penambahan EXP poin siswa.

---

## 2. 📚 Course Discovery & Enrollment Journey

### 🛡️ A. Admin: Setup Tahun Ajaran
1. Membuka `/admin/classes`.
2. Membuat kerangka kelas kosong untuk semester baru (misal: "Matematika Kelas 8A - Ganjil 2026").
3. Menugaskan (*assign*) Teacher spesifik ke kelas tersebut.

### 👩‍🏫 B. Teacher: Persiapan Materi
1. Teacher login, melihat "Matematika Kelas 8A" di *dashboard* mereka dengan status "Draft".
2. Buka **Course Builder** (`/teacher/courses/:id/builder`).
3. Menggunakan antarmuka *Drag-and-Drop* untuk menyusun Modul $\rightarrow$ Pelajaran $\rightarrow$ Kuis.
4. Setelah siap, klik "Publish Course".
5. Guru menyalin **Join Code** (kode 6 digit unik) untuk dibagikan ke siswa di grup WhatsApp/Papan Tulis.

### 👨‍🎓 C. Student: Bergabung ke Kelas
1. Login untuk pertama kali setelah registrasi.
2. Di layar *Onboarding* (atau via tombol "+" di Hub), memasukkan **Join Code**.
3. Sistem memvalidasi kode.
4. Layar memuat *cover image* kelas yang indah, menyambut: "Welcome to Matematika Kelas 8A!".

---

## 3. 🚨 Edge Cases & Exceptions Journey

### ⚠️ A. Kuis Melewati Batas Waktu (Student)
1. Student sedang mengerjakan Kuis di `/student/quiz/:id`.
2. *Countdown Timer* di Topbar berkedip merah saat sisa waktu 1 menit.
3. Waktu habis (00:00).
4. **UX**: Layar terkunci dengan *overlay modal* yang tidak bisa ditutup: *"Time is up! Submitting your answers..."*
5. Sistem mengumpulkan jawaban terakhir via *autosave buffer*.
6. Student dialihkan ke halaman hasil kuis dengan pesan: *"Quiz auto-submitted due to time limit."*

### ⚠️ B. Upaya Akses URL Terlarang (Student $\rightarrow$ Teacher Route)
1. Siswa nakal mengetikkan `edusync.app/teacher/gradebook` di URL bar.
2. **UX**: `<RoleRoute>` mencegat secara instan.
3. Alih-alih me-logout siswa (yang membuat frustrasi), sistem merender halaman ilustrasi Maskot Detektif bertuliskan: *"Oops! That area is for Teachers only."* dengan tombol kembali ke *Student Hub*.

### ⚠️ C. Konflik Multitenant (Guru yang Mengajar di 2 Sekolah)
1. Guru A terdaftar di "Tenant SMA X" dan "Tenant SMP Y".
2. Login $\rightarrow$ Sistem menyadari adanya ambiguitas (User punya $>1$ Tenant aktif).
3. **UX**: Diarahkan ke `/workspace-selector`.
4. Guru disajikan kartu besar: "[Logo] Mengajar di SMA X" atau "[Logo] Mengajar di SMP Y".
5. Guru memilih SMA X $\rightarrow$ Masuk ke Dashboard.
6. Kapan pun guru ingin pindah, ia cukup menekan *Dropdown Tenant* di pojok kiri atas *Topbar* untuk bertukar ruang kerja tanpa perlu *login* ulang.

---

## 4. Analisis Titik UX Paling Krusial (Friction Points)
Berdasarkan Journey di atas, berikut adalah area UI yang membutuhkan perhatian khusus (*high engineering & design priority*):

1. **Course Builder (Teacher):** Harus terasa seperti menyusun Lego. *Drag-and-drop* harus mulus, minim latensi jaringan. *Save state* harus optimis.
2. **SpeedGrader (Teacher):** Guru benci mengeklik terlalu banyak untuk menilai. Transisi "*Next Student*" harus terjadi $\le 500ms$ (Bisa menggunakan strategi pramuat / *pre-fetching* data murid berikutnya).
3. **Task Hub (Student):** Siswa sering lupa tugas. UI harus mendikte "Apa yang harus saya kerjakan sekarang?" secara imperatif, diurutkan mutlak berdasarkan kalender terdekat, bukan sekadar daftar panjang tanpa konteks.
4. **Quiz Engine (Student):** Tidak boleh ada *layout shift* (lompatan tombol) saat pindah soal. *Autosave indicator* harus terlihat samar ("*Saved at 10:41*") untuk memberikan ketenangan pikiran.
