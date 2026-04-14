# Tasks
- [x] Task 1: Hapus dependency Supabase.
  - [x] SubTask 1.1: Jalankan perintah untuk menghapus `@supabase/supabase-js` dari `package.json`.
  - [x] SubTask 1.2: Hapus file konfigurasi Supabase (misalnya `src/services/supabase/client.ts`).
- [x] Task 2: Bersihkan Environment Variables.
  - [x] SubTask 2.1: Hapus `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` dari `.env`, `.env.example`, dan validasi env (jika ada).
- [x] Task 3: Refactor Sistem Autentikasi.
  - [x] SubTask 3.1: Ubah `src/contexts/AuthContext.tsx` untuk menggunakan pemanggilan REST API login/logout lokal.
  - [x] SubTask 3.2: Ubah hooks/service autentikasi (`useLoginState.ts`, dll) untuk menyesuaikan dengan format response backend lokal.
- [x] Task 4: Refactor Layanan Database (API).
  - [x] SubTask 4.1: Cari dan ubah semua file di `src/services/` dan `src/features/` yang memanggil `supabase.from()` menjadi HTTP request (REST API).

# Task Dependencies
- Task 3 depends on Task 2
- Task 4 depends on Task 2
