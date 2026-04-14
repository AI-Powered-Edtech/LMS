# Tasks
- [x] Task 1: Menjalankan Development Server dan Inisiasi Browser Agent.
  - [x] SubTask 1.1: Jalankan perintah `npm run dev` (atau pnpm dev) di *background*.
  - [x] SubTask 1.2: Pastikan server *ready* di `localhost:5173`.
- [x] Task 2: Refactor UI menjadi Compact Design
  - [x] SubTask 2.1: Gunakan skill `frontend-skill` dan analisa UI saat ini.
  - [x] SubTask 2.2: Terapkan perubahan desain kompak di semua halaman.
- [x] Task 3: Uji Coba Alur Otentikasi.
  - [x] SubTask 3.1: Login sebagai Student, Teacher, dan Admin.
  - [x] SubTask 3.2: Catat dan perbaiki bug/blocker jika ditemukan.
- [ ] Task 4: Uji Coba Student Journey.
  - [ ] SubTask 4.1: Akses Dashboard Siswa, Kelas, Materi Pelajaran (Lessons), Tugas, dan Kuis.
  - [ ] SubTask 4.2: Catat dan perbaiki bug/blocker jika ditemukan.
- [ ] Task 5: Uji Coba Teacher Journey.
  - [ ] SubTask 5.1: Akses Classroom, Gradebook (Penilaian), dan Assignment/Quiz Builder.
  - [ ] SubTask 5.2: Catat dan perbaiki bug/blocker jika ditemukan.
- [ ] Task 6: Uji Coba Admin Journey.
  - [ ] SubTask 6.1: Akses Administration, Analitik, Laporan, dan Pengaturan.
  - [ ] SubTask 6.2: Catat dan perbaiki bug/blocker jika ditemukan.
- [ ] Task 7: Verifikasi Akhir.
  - [ ] SubTask 7.1: Jalankan ulang *smoke test* singkat untuk semua alur yang telah diperbaiki.

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3]
- [Task 5] depends on [Task 3]
- [Task 6] depends on [Task 3]
- [Task 7] depends on [Task 4, Task 5, Task 6]
