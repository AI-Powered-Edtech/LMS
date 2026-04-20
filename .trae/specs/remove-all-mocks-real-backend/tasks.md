# Tasks

- [x] Task 1: Hapus semua file Mock dan dependensinya.
  - [x] SubTask 1.1: Hapus folder `src/mocks` dan isinya secara permanen.
  - [x] SubTask 1.2: Hapus inisialisasi MSW dari `src/main.tsx` atau file inisialisasi aplikasi.
  - [x] SubTask 1.3: Hapus `msw` dari `package.json`.

- [x] Task 2: Verifikasi dan Konfigurasi Real Backend (VIL Rust).
  - [x] SubTask 2.1: Pastikan `.env` terkonfigurasi dengan URL backend VIL API yang valid tanpa variabel yang memaksa mode mock atau mengarah ke Supabase.
  - [x] SubTask 2.2: Hapus semua koneksi/referensi ke Supabase klien (seperti `@supabase/supabase-js`) dari proyek.
  - [x] SubTask 2.3: Lakukan pencarian global (grep) untuk memastikan tidak ada sisa-sisa `devMock` atau `mock` di file kode sumber (`src/`).

- [x] Task 3: Pembuatan Akun Demo di Real Backend (VIL Rust).
  - [x] SubTask 3.1: Daftar/buat akun Guru Demo (contoh: guru.demo@edusync.lms) di real backend (VIL Auth).
  - [x] SubTask 3.2: Daftar/buat akun Siswa Demo (contoh: siswa.demo@edusync.lms) di real backend (VIL Auth).
  - [x] SubTask 3.3: Daftarkan (enroll) akun Siswa Demo ke kelas yang dibuat oleh akun Guru Demo melalui API backend VIL.

- [x] Task 4: Uji End-to-End Flow dengan Real Backend (Akun Demo).
  - [x] SubTask 4.1: Login menggunakan akun Guru Demo, buat kursus/materi, pelajaran, tugas, dan kuis.
  - [x] SubTask 4.2: Pastikan data materi tersebut tersimpan di *real backend*.
  - [x] SubTask 4.3: Login menggunakan akun Siswa Demo.
  - [x] SubTask 4.4: Pastikan Siswa Demo dapat melihat kursus, materi, dan mengerjakan kuis serta tugas yang dikirim oleh Guru Demo.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
