# Panduan Deployment (EduSync LMS ke Puter.com)

Dokumen ini menjelaskan langkah-langkah untuk meluncurkan (deploy) aplikasi EduSync LMS ke lingkungan _production_ menggunakan **Puter.com** sebagai penyedia _hosting frontend statis_ dan **Supabase** sebagai _backend_.

## Prasyarat Sebelum Deployment

1. Pastikan Anda telah menjalankan uji coba secara lokal.
2. Anda harus memiliki akun di [Puter.com](https://puter.com).
3. Anda harus memiliki akses ke _dashboard_ proyek Supabase Anda.

---

## Langkah 1: Build Frontend

Semua variabel _environment_ untuk Supabase harus di-_bake_ (ditanamkan) ke dalam file statis selama proses _build_.

1. Pastikan file `.env` di folder _root_ proyek memiliki _values_ untuk proyek _production_:
