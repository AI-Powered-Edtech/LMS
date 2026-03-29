# 🔐 EduSync — Panduan Autentikasi untuk Developer

> **Dokumen ini WAJIB dibaca oleh semua developer** sebelum berkontribusi ke modul autentikasi.

---

## 🚀 Setup Awal — Untuk Developer Baru (Mulai di Sini)

> Setiap developer menggunakan **Supabase project sendiri**. Ikuti langkah berikut dari awal sebelum menjalankan aplikasi.

git clone → npm install → cp .env.example .env → isi credentials
→ supabase link --project-ref <REF>
→ supabase db push --include-all
→ jalankan seed di SQL Editor
→ npm run dev → login

### Langkah 1: Buat Project Supabase Baru

1. Buka **https://supabase.com/dashboard**
2. Klik **"New Project"**
3. Isi:
   - **Name:** `edusync-dev-<namakamu>` (contoh: `edusync-dev-budi`)
   - **Database Password:** simpan baik-baik, akan dibutuhkan nanti
   - **Region:** pilih yang terdekat (Singapore)
4. Klik **"Create new project"** — tunggu ~2 menit sampai selesai

---

### Langkah 2: Ambil Credentials Project Kamu

Di Supabase Dashboard project kamu → **Project Settings** → **API**:

| Variable                 | Lokasi                               | Contoh                       |
| ------------------------ | ------------------------------------ | ---------------------------- |
| `VITE_SUPABASE_URL`      | "Project URL"                        | `https://xxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | "Project API Keys" → `anon` `public` | `eyJhbGci...`                |

---

### Langkah 3: Buat File `.env.local`

Di root project (`/LMS`), buat file `.env.local`:
