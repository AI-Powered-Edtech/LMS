# Tasks
- [x] Task 1: Identifikasi dan Kumpulkan File Skema Database.
  - [x] SubTask 1.1: Gunakan agen pencari (`search`) untuk menemukan file definisi skema database utama (seperti `schema_baseline.sql` atau file di direktori `supabase/migrations/`).
- [x] Task 2: Analisis Normalisasi, Relasi, dan Tipe Data.
  - [x] SubTask 2.1: Evaluasi apakah tabel-tabel sudah dinormalisasi dengan baik (menghindari redundansi data).
  - [x] SubTask 2.2: Periksa konsistensi penamaan tabel/kolom dan penggunaan tipe data yang efisien.
  - [x] SubTask 2.3: Periksa kelengkapan dan ketepatan *Primary Key* dan *Foreign Key constraints*.
- [x] Task 3: Analisis Performa dan Keamanan.
  - [x] SubTask 3.1: Periksa keberadaan *Indexes* pada kolom-kolom yang sering dicari atau digunakan sebagai relasi (*Foreign Keys*).
  - [x] SubTask 3.2: Evaluasi aspek keamanan dasar di tingkat skema (seperti Row Level Security / RLS jika menggunakan PostgreSQL/Supabase).
- [x] Task 4: Penyusunan Laporan Analisis.
  - [x] SubTask 4.1: Susun dan simpan laporan hasil analisis ke `/workspace/docs/database-schema-analysis-report.md`.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 2, 3