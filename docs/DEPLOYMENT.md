
## LTI & SCORM Environment Variables (Phase 22)

| Variable | Required | Description |
| --- | --- | --- |
| `LTI_RSA_PRIVATE_KEY` | Yes | RSA private key (PEM) untuk LTI 1.3 JWT signing. Server-side only — jangan pakai prefix `VITE_`. |
| `LTI_RSA_PUBLIC_KEY` | Yes | RSA public key (PEM) untuk JWKS endpoint |
| `LTI_LAUNCH_URL` | Yes | Full URL LTI launch endpoint, e.g. `https://app.edusync.id/lti/launch` |
| `APP_URL` | Yes | Base URL aplikasi EduSync, e.g. `https://app.edusync.id` |
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