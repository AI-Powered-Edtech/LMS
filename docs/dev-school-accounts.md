# Dev School Accounts (SMA Nusantara Dev)

Dokumentasi ini berisi daftar akun (personas) yang dapat digunakan untuk pengujian fitur di tenant **SMA Nusantara Dev**.
Seluruh akun ini secara otomatis dibuat ketika skrip seeding `edusync-api/schema/dev_seed.sql` atau `scripts/reset-dev-school.sh` dijalankan.

## 🏢 Tenant Info
- **Nama**: SMA Nusantara Dev
- **Slug**: `sma-nusantara-dev`

## 👥 Personas

Semua akun menggunakan password yang sama: **`password123`**

| Peran (Role) | Nama Lengkap | Email | Keterangan |
|-------------|-------------|-------|------------|
| **Admin** | Admin Nusantara | `admin@nusantara.dev` | Tenant Owner & Admin (Akses penuh ke semua fitur dan konfigurasi tenant) |
| **Admin (Principal)** | Kepsek Nusantara | `kepsek@nusantara.dev` | Kepala Sekolah (Role Admin untuk melihat dasbor analitik dan audit) |
| **Teacher** | Guru Satu Nusantara | `guru1@nusantara.dev` | Guru 1 (Akses fitur pengajaran, pembuatan materi, dan penilaian) |
| **Teacher** | Guru Dua Nusantara | `guru2@nusantara.dev` | Guru 2 (Untuk pengujian kolaborasi guru / co-teaching) |
| **Student** | Siswa Satu Nusantara | `siswa1@nusantara.dev` | Siswa 1 (Akses materi kelas, tugas, kuis, dan forum) |
| **Student** | Siswa Dua Nusantara | `siswa2@nusantara.dev` | Siswa 2 (Untuk pengujian fitur sosial, peer review, dan interaksi siswa) |

## 🚀 Cara Mereset Data

Jika data tenant berantakan selama pengujian, Anda bisa mereset ulang ke state awal (fresh) dengan menjalankan skrip berikut:

```bash
./scripts/reset-dev-school.sh
```

Skrip di atas akan menghapus seluruh data yang berhubungan dengan tenant `sma-nusantara-dev` dan melakukan seeding ulang menggunakan file `edusync-api/schema/dev_seed.sql`.
