# Tasks
- [x] Task 1: Analisis *Dead Code* (Variabel dan Import).
  - [x] SubTask 1.1: Gunakan *sub-agent* `search` atau alat analisis (TypeScript/ESLint) untuk mendeteksi variabel dan *import* yang tidak terpakai di seluruh direktori `src/`.
- [x] Task 2: Analisis *Unused Files* dan *Exports*.
  - [x] SubTask 2.1: Identifikasi file atau *export* fungsi/komponen yang sudah tidak memiliki referensi (tidak di-import oleh file lain) di dalam aplikasi.
- [x] Task 3: Eksekusi Pembersihan (*Cleanup*).
  - [x] SubTask 3.1: Hapus kode, variabel, *import*, atau file yang teridentifikasi sebagai *dead code*.
- [x] Task 4: Verifikasi Pasca-Pembersihan.
  - [x] SubTask 4.1: Jalankan proses *build* atau pengecekan *linter* untuk memastikan aplikasi dapat dikompilasi tanpa *error* setelah pembersihan dilakukan.

# Task Dependencies
- Task 3 depends on Task 1, 2
- Task 4 depends on Task 3