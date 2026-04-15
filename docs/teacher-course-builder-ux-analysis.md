# Laporan Analisis UI/UX Course Builder (Sisi Guru)

**Tanggal Analisis**: 15 April 2026
**Status Fitur**: 🟡 **Fungsional Dasar (Early Stage)**
**Tujuan**: Mengevaluasi kematangan fitur pembuatan kursus dan mengidentifikasi area perbaikan untuk mencapai standar LMS profesional.

---

## 1. Ringkasan Eksekutif
Fitur Course Builder saat ini sudah memiliki fondasi teknis yang kuat, terutama pada sistem *state management*, kolaborasi real-time, dan integrasi *drag-and-drop*. Namun, dari sisi pengalaman pengguna (UX), fitur ini masih terasa seperti "kumpulan fungsi" daripada sebuah alur kerja yang kohesif. Terdapat banyak *friction points* pada manajemen silabus dan beberapa pengaturan krusial yang masih absen.

---

## 2. Analisis Alur Inisiasi & Pengaturan
**Status: 🟢 Cukup Baik (Minim Hambatan)**

### Temuan Utama:
- **Kelebihan**: Proses pembuatan awal sangat cepat. Guru hanya butuh judul untuk mulai membangun materi. Fitur *auto-save* pada pengaturan kursus sangat membantu mencegah kehilangan data.
- **Kelemahan**: 
  - Tidak ada fitur **Hapus Kursus** (Danger Zone) di dalam pengaturan.
  - Tidak ada opsi untuk **Unggah Gambar Sampul (Thumbnail)**; hanya mengandalkan gradien warna acak.
  - Input "Mata Pelajaran" masih berupa teks bebas, berisiko menyebabkan inkonsistensi data.

---

## 3. Analisis Manajemen Silabus (Curriculum)
**Status: 🔴 Perlu Perbaikan Signifikan (High Friction)**

### Temuan Utama:
- **Kelemahan Interaksi**:
  - **Modul Anonim**: Guru bisa menambah modul, tapi tidak ada UI untuk mengubah nama modul tersebut di sidebar.
  - **Drag-and-Drop Terbatas**: Materi (Lesson) tidak bisa dipindahkan antar modul (hanya bisa diurutkan ulang di dalam modul yang sama).
  - **Edit Judul Tersembunyi**: Mengubah nama materi harus masuk ke editor konten, tidak bisa langsung di sidebar.
- **Kelemahan Visual**:
  - Sidebar belum mendukung *Dark Mode*, menyebabkan ketidaknyamanan visual saat tema gelap aktif.
  - Masih menggunakan `window.confirm()` bawaan browser untuk aksi hapus, yang merusak estetika desain modern.

---

## 4. Analisis Editor Konten (Blocks, Quizzes, Assignments)
**Status: 🟡 Baik (Fungsional tapi Terfragmentasi)**

### Temuan Utama:
- **Block Editor**: Sangat intuitif dengan sistem penambahan blok yang rapi. Fitur kolaborasi (*CollaboratorCursor*) adalah nilai tambah yang besar.
- **Quiz Builder**: Sangat komprehensif. Dukungan bank soal dan berbagai tipe pertanyaan (Essay, MCQ, Short Answer) sudah setara dengan standar industri.
- **Assignment Builder**: Minimalis dan fokus pada instruksi. Namun, integrasi pengumpulan file masih perlu diperjelas di sisi UI guru.

---

## 5. Rekomendasi Strategis (Roadmap Kematangan)

### Prioritas 1: Menghilangkan Hambatan Utama (Quick Wins)
1. **Sediakan UI Edit Nama Modul**: Tambahkan ikon pensil atau fitur *double-click* untuk mengubah nama modul di sidebar.
2. **Implementasikan "Danger Zone"**: Tambahkan opsi hapus kursus dengan konfirmasi modal kustom yang cantik.
3. **Dukungan Thumbnail**: Tambahkan *field* unggah gambar di pengaturan kursus.

### Prioritas 2: Peningkatan Fleksibilitas
1. **Cross-Module Drag-and-Drop**: Perbaiki logika `handleDragEnd` agar materi bisa dipindahkan ke modul lain.
2. **Badge Status & Filter**: Tambahkan indikator status (Draft/Live) pada kartu kursus di dashboard dan fitur filter berdasarkan kategori/status.

### Prioritas 3: Poles Desain (Visual Polish)
1. **Konsistensi Tema**: Terapkan dukungan mode gelap pada `BuilderSidebar` dan seragamkan *border-radius* di seluruh aplikasi.
2. **Modal Konfirmasi Kustom**: Ganti semua `confirm()` browser dengan komponen modal UI yang konsisten dengan tema EduSync.

---

## Kesimpulan
Course Builder ini adalah "intan mentah". Dengan memperbaiki hambatan interaksi pada manajemen silabus dan melengkapi pengaturan dasar (seperti thumbnail dan penghapusan), fitur ini akan segera siap untuk bersaing dengan LMS komersial lainnya. Profil guru akan sangat terbantu dengan alur yang lebih fleksibel dan visual yang lebih konsisten.