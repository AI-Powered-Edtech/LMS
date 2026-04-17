# Tasks
- [x] Task 1: Reproduksi & identifikasi akar masalah “Failed to fetch” pada login
  - [x] Catat endpoint yang dipanggil, base URL yang terpakai, dan error detail (network/CORS/SSL)
  - [x] Verifikasi perbedaan perilaku di dev vs demo/prod (env var/config)
- [x] Task 2: Perbaiki konfigurasi request login & error handling agar tidak menghasilkan “Failed to fetch” pada environment yang benar
  - [x] Pastikan API base URL terbaca benar dari konfigurasi environment yang ada
  - [x] Pastikan request login mengirim header/body sesuai kontrak API
  - [x] Tangani network error secara eksplisit dan tampilkan pesan yang ramah di UI
- [x] Task 3: Rapihkan UI “Demo Access” di halaman login agar tidak overlap dan responsif
  - [x] Perbaiki layout (grid/flex), spacing, wrapping teks email, dan line-height
  - [x] Pastikan komponen tetap rapi pada 320px, 375px, 768px, 1024px, 1440px
- [x] Task 4: Tambahkan/rapihkan coverage test untuk login & rendering demo access
  - [x] Update atau tambah test (unit/integration/e2e) untuk skenario gagal koneksi dan pesan error
  - [x] Tambah verifikasi visual/layout minimal (mis. snapshot/Playwright assertion) agar demo access tidak overlap

# Task Dependencies
- Task 2 bergantung pada Task 1
- Task 4 bergantung pada Task 2 dan Task 3
