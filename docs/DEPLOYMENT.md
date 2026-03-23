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
   ```env
   VITE_SUPABASE_URL=https://[PROYEK-ID].supabase.co
   VITE_SUPABASE_ANON_KEY=[ANON-KEY-ANDA]
   ```
2. Jalankan perintah _build_:
   ```bash
   npm run build
   ```
3. Folder `dist` akan dibuat. Folder ini berisi seluruh aplikasi yang siap diluncurkan.

---

## Langkah 2: Deployment ke Puter.com

Anda dapat meluncurkan folder `dist` tersebut menggunakan salah satu dari dua metode di bawah ini:

### Metode A: Menggunakan CLI (Direkomendasikan)

1. Jalankan perintah _deploy_ yang sudah disediakan di `package.json`:
   ```bash
   npm run deploy:puter
   ```
   *(Perintah ini akan secara otomatis mem-*build* aplikasi Anda dan menggunakan `npx @puter/cli` untuk men-deploy folder `./dist` dengan nama situs `edusync-lms`).*
2. Ikuti instruksi login (jika diminta) di terminal Anda.
3. Anda akan mendapatkan URL publik (misalnya: `https://edusync-lms.puter.site`).

### Metode B: Menggunakan Antarmuka Web (UI) Puter.com

1. Buka browser dan login ke OS [Puter.com](https://puter.com).
2. Buka aplikasi **Drive**.
3. Buat folder baru (misalnya `edusync-production`).
4. **Drag & Drop** seluruh _isi_ dari folder `dist/` di komputer Anda ke dalam folder tersebut di Puter.
5. Klik kanan pada folder tersebut di Puter, lalu pilih opsi **"Host website"**.
6. Atur _subdomain_ Anda (misal `edusync-lms`), lalu aktifkan fitur _hosting_.

---

## Langkah 3: Konfigurasi CORS Supabase (Sangat Penting!)

Supabase memblokir akses _Authentication_ jika pengguna mencoba masuk dari URL yang tidak dikenal. Anda wajib menambahkan URL Puter.com Anda ke dalam daftar **Allowed Origins** Supabase.

1. Buka [Supabase Dashboard](https://supabase.com/dashboard).
2. Pilih proyek Anda.
3. Buka menu **Authentication** -> **URL Configuration** (berada di bagian _Site URL_ dan _Redirect URLs_).
4. Di bagian **Site URL**, masukkan URL utama (misal: `https://edusync-lms.puter.site`).
5. Di bagian **Redirect URLs** (Add URL), tambahkan URL tambahan (termasuk protokolnya):
   - `https://edusync-lms.puter.site/*`
   - `https://edusync-lms.puter.site/#/*`
6. Klik **Save**.

_(Jika ini tidak dilakukan, Anda akan mendapatkan error "CORS policy" atau "URL not allowed" saat pengguna mencoba login/register)._

---

## Langkah 4: Deployment Edge Functions & Database (Supabase)

Aplikasi memiliki fitur AI, Scan Kehadiran, dan PDF yang memerlukan _backend logic_.

1. **Sinkronisasi Skema Database**: Pastikan tabel dan _policies_ di _production_ sejajar dengan lokal:
   ```bash
   supabase db push
   ```
2. **Deploy Edge Functions**:

   ```bash
   supabase functions deploy generate-ai-content
   supabase functions deploy scan-attendance
   supabase functions deploy grade-quiz-attempt
   ```

3. **Injeksi Secrets**: Jika fungsi Anda membutuhkan OpenAI atau API eksternal, atur _secrets_-nya di Supabase _production_:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-xxxx...
   ```

---

## Langkah 5: Pengujian Akhir (_Smoke Test_)

1. Buka URL Puter.com Anda.
2. Cobalah untuk _Login_ menggunakan akun uji coba.
3. Masuk ke halaman **Kuis** atau **Modul** dan pastikan aplikasi bisa mengambil data dengan lancar tanpa _loading_ berlebihan.
4. Periksa apakah PWA (opsi "Install App" di _browser_) muncul dengan benar.

Selamat! EduSync LMS Anda telah hidup dan berjalan di _production_.
