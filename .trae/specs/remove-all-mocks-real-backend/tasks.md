# Tasks

- [ ] Task 1: Hapus semua file Mock dan dependensinya.
  - [ ] SubTask 1.1: Hapus folder `src/mocks` dan isinya secara permanen.
  - [ ] SubTask 1.2: Hapus inisialisasi MSW dari `src/main.tsx` atau file inisialisasi aplikasi.
  - [ ] SubTask 1.3: Hapus `msw` dari `package.json`.

- [ ] Task 2: Verifikasi dan Konfigurasi Real Backend.
  - [ ] SubTask 2.1: Pastikan `.env` terkonfigurasi dengan URL backend Supabase yang valid (atau VIL API) tanpa variabel yang memaksa mode mock.
  - [ ] SubTask 2.2: Lakukan pencarian global (grep) untuk memastikan tidak ada sisa-sisa `devMock` atau `mock` di file kode sumber (`src/`).

- [ ] Task 3: Pembuatan Akun Demo di Real Backend.
  - [ ] SubTask 3.1: Daftar/buat akun Guru Demo (contoh: guru.demo@edusync.lms) di real backend (Supabase Auth).
  - [ ] SubTask 3.2: Daftar/buat akun Siswa Demo (contoh: siswa.demo@edusync.lms) di real backend.
  - [ ] SubTask 3.3: Daftarkan (enroll) akun Siswa Demo ke kelas yang dibuat oleh akun Guru Demo melalui API backend.

- [ ] Task 4: Uji End-to-End Flow dengan Real Backend (Akun Demo).
  - [ ] SubTask 4.1: Login menggunakan akun Guru Demo, buat kursus/materi, pelajaran, tugas, dan kuis.
  - [ ] SubTask 4.2: Pastikan data materi tersebut tersimpan di *real backend*.
  - [ ] SubTask 4.3: Login menggunakan akun Siswa Demo.
  - [ ] SubTask 4.4: Pastikan Siswa Demo dapat melihat kursus, materi, dan mengerjakan kuis serta tugas yang dikirim oleh Guru Demo.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
