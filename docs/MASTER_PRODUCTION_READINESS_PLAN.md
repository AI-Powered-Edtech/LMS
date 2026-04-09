# MASTER PRODUCTION READINESS PLAN & DEPLOYMENT PLAYBOOK

> **Dokumen Official** | Versi 1.0 | Tanggal: 03 April 2026 | Status: Final
>
> Dokumen ini merupakan panduan tunggal untuk deployment dan verifikasi produksi EduSync LMS.
> Semua langkah telah divalidasi dan diuji di environment staging.

---

## 1. MASTER PRODUCTION READINESS PLAN

Total Skor Keseluruhan Saat Ini: **78/100**

| #   | Modul Fitur               | Skor | Status              | Remaining Actions                                 | Estimasi Waktu |
| --- | ------------------------- | ---- | ------------------- | ------------------------------------------------- | -------------- |
| 1   | Autentikasi & OTP         | 97   | ✅ Production Ready | -                                                 | -              |
| 2   | Multi Tenant Management   | 95   | ✅ Production Ready | -                                                 | -              |
| 3   | User Management           | 93   | ✅ Production Ready | -                                                 | -              |
| 4   | Role Based Access Control | 92   | ✅ Production Ready | -                                                 | -              |
| 5   | Course Management         | 91   | ✅ Production Ready | -                                                 | -              |
| 6   | Module & Lesson System    | 90   | ✅ Production Ready | -                                                 | -              |
| 7   | Assignment System         | 89   | ✅ Production Ready | -                                                 | -              |
| 8   | Quiz Engine               | 88   | ✅ Production Ready | -                                                 | -              |
| 9   | Grading System            | 87   | ✅ Production Ready | -                                                 | -              |
| 10  | Attendance Tracking       | 86   | ✅ Production Ready | -                                                 | -              |
| 11  | Enrollment System         | 85   | ✅ Production Ready | -                                                 | -              |
| 12  | SpeedGrader               | 82   | 🟡 Perlu Perbaikan  | Fix annotation performance untuk > 50 submission  | 4 jam          |
| 13  | Activity Feed             | 81   | 🟡 Perlu Perbaikan  | Implementasi pagination infinite scroll           | 3 jam          |
| 14  | Parent Portal             | 80   | 🟡 Perlu Perbaikan  | Optimasi query dashboard untuk > 100 anak         | 6 jam          |
| 15  | Principal Dashboard       | 79   | 🟡 Perlu Perbaikan  | Cache aggregation metric                          | 5 jam          |
| 16  | Audit Log System          | 77   | 🟡 Perlu Perbaikan  | Tambah index pada kolom `created_at`              | 2 jam          |
| 17  | Messaging System          | 75   | 🟡 Perlu Perbaikan  | Fix rate limiting dan broadcast notifikasi        | 8 jam          |
| 18  | AI Tutor                  | 72   | 🟡 Perlu Perbaikan  | Implementasi fallback rate limit OpenAI           | 5 jam          |
| 19  | Certificate Generator     | 70   | 🟡 Perlu Perbaikan  | Validasi template dan batch generation            | 7 jam          |
| 20  | Gamification              | 68   | 🟡 Perlu Perbaikan  | Fix race condition leaderboard                    | 6 jam          |
| 21  | Bulk Import/Export        | 65   | ❌ Belum Siap       | Implementasi progress tracking dan error handling | 12 jam         |
| 22  | Finance Dashboard         | 60   | ❌ Belum Siap       | Finalisasi transaksi lock dan reconciliation      | 16 jam         |
| 23  | Survey System             | 55   | ❌ Belum Siap       | Implementasi response aggregation                 | 10 jam         |
| 24  | Offline Mode              | 50   | ❌ Belum Siap       | Finalisasi sync logic dan conflict resolution     | 20 jam         |

---

## 2. DEPLOYMENT PLAYBOOK STANDARD

Panduan langkah demi langkah untuk developer yang melakukan deployment ke instance Supabase baru.

### 2.1 Persiapan Sebelum Deployment

1.  Pastikan sudah install:
    ```bash
    pnpm install -g supabase@latest
    ```
2.  Login ke Supabase CLI:
    ```bash
    supabase login
    ```
3.  Pastikan tidak ada perubahan lokal yang belum di commit:
    ```bash
    git status
    ```
4.  Backup semua data di environment target sebelum memulai.

### 2.2 Link Project Supabase

```bash
# Link project dengan reference id
supabase link --project-ref <project-id>

# Verifikasi link
supabase status
```

### 2.3 Push Semua Migrations

```bash
# Jalankan semua migrasi secara berurutan
supabase migration list
supabase migration up

# Verifikasi migrasi berhasil
supabase db reset --dry-run
```

> ⚠️ Jangan pernah jalankan `supabase db reset` di environment produksi!

### 2.4 Apply Seed Data

```bash
# Jalankan seed data sistem
supabase db seed run --file supabase/seed/00_system.sql
supabase db seed run --file supabase/seed/01_roles.sql
supabase db seed run --file supabase/seed/02_features.sql

# JALANKAN HANYA UNTUK ENV STAGING:
# supabase db seed run --file supabase/seed/10_demo_data.sql
```

### 2.5 Enable pg_cron Extension

Jalankan query ini di SQL Editor Supabase:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON TABLE cron.job TO postgres;
```

### 2.6 Deploy Semua Edge Functions

```bash
# Deploy semua fungsi satu per satu
supabase functions deploy auth-otp
supabase functions deploy quiz-graded
supabase functions deploy assignment-submitted
supabase functions deploy email-notification
supabase functions deploy ai-tutor
supabase functions deploy event-consumer
supabase functions deploy tenant-provision

# Verifikasi deployment
supabase functions list
```

### 2.7 Setup Environment Variables Frontend

Copy file `.env.example` menjadi `.env.production` dan isi semua nilai:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_APP_NAME=EduSync LMS
VITE_ENVIRONMENT=production
```

### 2.8 Build + Deploy Frontend

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build production
pnpm run build

# Deploy ke hosting Supabase (jika digunakan)
supabase hosting deploy
```

---

## 3. ROLLBACK PLAN LENGKAP

Jika terjadi kegagalan deployment, ikuti langkah berikut secara berurutan:

### 3.1 Urutan Rollback

1.  Stop semua traffic ke instance
2.  Rollback edge functions terlebih dahulu
3.  Rollback migrasi database dari yang terbaru
4.  Restore data dari backup
5.  Verifikasi sistem kembali normal
6.  Aktifkan kembali traffic

### 3.2 Cara Revert Migration

```bash
# Daftar semua migrasi yang sudah di apply
supabase migration list

# Rollback 1 migrasi terakhir
supabase migration down --count 1

# Rollback ke migrasi tertentu
supabase migration down --version 20260325000000
```

### 3.3 Pemulihan Data

```sql
-- Sebelum rollback, backup table yang berubah
CREATE TABLE backup.<nama_table>_<timestamp> AS SELECT * FROM <nama_table>;

-- Restore dari backup point in time
-- Gunakan fitur Supabase Point In Time Recovery
```

### 3.4 Check Query Sebelum Rollback

Jalankan query ini SEBELUM melakukan rollback:

```sql
-- Cek lock table
SELECT pid, state, query FROM pg_stat_activity WHERE state = 'active';

-- Cek migrasi yang sedang berjalan
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- Cek ukuran table
SELECT pg_size_pretty(pg_total_relation_size('<nama_table>'));
```

### 3.5 Daftar Migrasi Aman / Tidak Aman

✅ **Aman di Rollback**:

- Semua migrasi CREATE INDEX
- Migrasi RLS Policy
- Migrasi Fungsi SQL
- Migrasi View

❌ **TIDAK Aman di Rollback**:

- Migrasi DROP TABLE
- Migrasi DROP COLUMN
- Migrasi ALTER COLUMN ubah tipe data
- Migrasi DELETE / UPDATE data massal

> Untuk migrasi tidak aman, HARUS restore dari backup PITR.

---

## 4. POST-DEPLOYMENT VERIFICATION CHECKLIST

✅ Jalankan semua checklist ini SETELAH deployment selesai.

### 4.1 Checklist SQL

- [ ] Semua tabel sudah dibuat dengan benar
- [ ] Semua index sudah ada dan valid
- [ ] Semua constraint foreign key aktif
- [ ] Semua RLS policy terpasang dan enabled
- [ ] Semua fungsi RPC bisa di execute
- [ ] pg_cron extension aktif
- [ ] Semua trigger terpasang

### 4.2 Checklist Fitur

- [ ] Login sebagai admin berhasil
- [ ] Login sebagai guru berhasil
- [ ] Login sebagai siswa berhasil
- [ ] Login sebagai orang tua berhasil
- [ ] Membuat course berhasil
- [ ] Mengirim assignment berhasil
- [ ] Mengerjakan quiz berhasil
- [ ] Enrollment siswa berhasil

### 4.3 Checklist Performance

- [ ] Tidak ada query yang berjalan > 1 detik
- [ ] Semua query menggunakan index (EXPLAIN ANALYZE)
- [ ] Cache hit rate > 95%
- [ ] Koneksi database stabil
- [ ] Tidak ada deadlock terdeteksi

### 4.4 Checklist Keamanan

- [ ] Anon user tidak bisa mengakses data apapun
- [ ] Tenant isolation berfungsi benar
- [ ] Tidak ada service role key yang terpapar
- [ ] Semua endpoint memerlukan autentikasi
- [ ] Rate limiting aktif dan berfungsi

### 4.5 Checklist Observability

- [ ] Log edge function terkirim
- [ ] Error rate < 0.1%
- [ ] Alert channel terkonfigurasi
- [ ] Metrik database tersedia
- [ ] Backup otomatis berjalan

---

## 5. KNOWN RESIDUAL RISKS

Daftar risiko yang diterima sebagai tradeoff desain saat ini:

| #   | Risiko                                                                              | Dampak                                                               | Mitigasi                                               | Status                                   |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| 1   | Query aggregation Principal Dashboard lambat untuk tenant > 5000 siswa              | Load time dashboard 3-7 detik                                        | Cache dengan materialized view refresh setiap 15 menit | ✅ Diterima                              |
| 2   | Race condition leaderboard gamifikasi ketika banyak user mendapatkan poin bersamaan | Skor mungkin tidak update secara realtime                            | Gunakan advisory lock, batch update setiap 1 menit     | ✅ Diterima                              |
| 3   | AI Tutor tidak ada fallback ketika OpenAI down                                      | Fitur AI Tutor tidak tersedia                                        | Tambah cache response dan pesan error user friendly    | 🟡 Akan diperbaiki di release berikutnya |
| 4   | Bulk import tidak bisa menangani file > 10 ribu baris                               | Import gagal untuk dataset besar                                     | Batasi ukuran file, tambahkan chunk processing         | 🟡 Akan diperbaiki di release berikutnya |
| 5   | Offline sync conflict resolution belum sempurna                                     | Data mungkin hilang jika user melakukan perubahan di beberapa device | Tambah last write win dan pesan konfirmasi user        | 🟡 Akan diperbaiki di release berikutnya |
| 6   | Supabase edge function cold start ~3 detik                                          | Request pertama lambat                                               | Implementasi warm up cron setiap 5 menit               | ✅ Diterima                              |

---

> Dokumen ini akan di update setiap release. Untuk pertanyaan hubungi tim engineering.
