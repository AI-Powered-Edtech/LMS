# 🔐 EduSync — Panduan Autentikasi untuk Developer

> **Dokumen ini WAJIB dibaca oleh semua developer** sebelum berkontribusi ke modul autentikasi.

---

## ⛔ LARANGAN: Jangan Pernah Gunakan Mock Auth / Fake JWT

### Apa yang Dimaksud Mock Auth?

Mock auth adalah pola di mana kita **membuat user/session palsu di frontend** tanpa melalui Supabase Auth yang sebenarnya. Contoh yang **DILARANG**:

```typescript
// ❌ DILARANG KERAS — Jangan pernah buat kode seperti ini
const mockUser = {
  id: 'd0000000-0000-0000-0000-000000000000',
  email: 'demo@edusync.dev',
  role: 'authenticated',
} as any as User;

const mockSession = {
  access_token: 'demo-access-token', // ← Fake token
  refresh_token: 'demo-refresh-token',
} as any as Session;

// Bypass Supabase sepenuhnya
setSession(mockSession);
setUser(mockUser);
```

### Mengapa Ini Berbahaya?

| Masalah | Penjelasan |
|---------|-----------|
| **RLS Bypass** | `auth.uid()` di PostgreSQL tidak mengenali fake JWT → semua query yang bergantung pada RLS **gagal diam-diam** (silent failure) |
| **FK Violations** | User ID palsu (`d0000000-...`) tidak ada di tabel `profiles` → INSERT ke tabel yang punya FK ke `profiles` akan error |
| **False Confidence** | Developer mengira fitur "berjalan" padahal tidak ada data yang benar-benar tersimpan di database |
| **Tenant Isolation Rusak** | `get_my_tenant_id()` bergantung pada JWT claims → fake JWT = tenant isolation tidak aktif |
| **Keamanan** | Jika kode mock auth masuk ke production, siapapun bisa bypass autentikasi |

### Gejala yang Muncul

Jika kamu mengalami salah satu dari gejala ini, kemungkinan besar kamu sedang menggunakan mock auth:

- ✗ Klik "Buat Kelas" / submit form → **tidak terjadi apa-apa** (no error, no success)
- ✗ Data tidak muncul setelah create/update
- ✗ Console browser menunjukkan error `new row violates row-level security policy`
- ✗ Header menunjukkan nama "Guest" atau "Demo"

---

## ✅ Cara Setup Akun Real di Supabase

### Langkah 1: Buka Supabase Dashboard

1. Cek `VITE_SUPABASE_URL` di file `.env` project kamu — itu berisi URL project Supabase-mu
2. Buka: **https://supabase.com/dashboard** → pilih project yang sesuai
3. Navigasi ke: **Authentication → Users**

> 💡 Setiap developer menggunakan **Supabase project masing-masing**. Jangan pakai project ID orang lain. Pastikan `.env` kamu mengarah ke project yang benar.

### Langkah 2: Buat atau Reset Password User

EduSync membutuhkan **3 akun dev** yang harus di-setup di Supabase Auth project kamu:

| Role | Email | Catatan |
|------|-------|---------|
| 🎓 Student | `student@edusync.dev` | Untuk testing fitur siswa |
| 👩‍🏫 Teacher | `teacher@edusync.dev` | Untuk testing fitur guru (buat kelas, quiz, dll) |
| 🛡️ Admin | `admin@edusync.dev` | Untuk testing fitur admin |

**Jika akun belum ada di Supabase Auth:**

1. Di Supabase Dashboard → **Authentication** → **Users**
2. Klik **"Add User"** → **"Create New User"**
3. Isi:
   - Email: `teacher@edusync.dev` (atau role lainnya)
   - Password: pilih password yang kuat (min 6 karakter)
   - Centang **"Auto Confirm User"**
4. Klik **"Create User"**

**Jika akun sudah ada tapi lupa password:**

1. Cari user di daftar Authentication → Users
2. Klik user → **"..." menu** → **"Send password recovery"**, atau
3. Gunakan SQL langsung (lihat Langkah 4)

### Langkah 3: Pastikan Data `profiles` dan `user_roles` Tersinkron

Setelah user dibuat di Supabase Auth, pastikan ada entry yang sesuai di:

```sql
-- Cek apakah profile sudah ada
SELECT id, email, first_name, last_name, tenant_id 
FROM profiles 
WHERE email = 'teacher@edusync.dev';

-- Cek apakah role sudah di-assign
SELECT user_id, role, tenant_id 
FROM user_roles 
WHERE user_id = '<USER_ID_DARI_AUTH>';
```

**Jika belum ada**, tambahkan secara manual:

```sql
-- Tambah profile (ganti UUID dengan ID user dari Supabase Auth)
INSERT INTO profiles (id, email, first_name, last_name, tenant_id)
VALUES (
  '<USER_ID>', 
  'teacher@edusync.dev', 
  'Teacher', 
  'Dev',
  '00000000-0000-0000-0000-00000000000d'  -- tenant dev
);

-- Assign role
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES (
  '<USER_ID>', 
  'TEACHER',  -- HARUS UPPERCASE: STUDENT, TEACHER, atau ADMIN
  '00000000-0000-0000-0000-00000000000d'
);
```

> ⚠️ **PENTING:** Nilai `role` di tabel `user_roles` menggunakan enum `app_role` yang **UPPERCASE** (`STUDENT`, `TEACHER`, `ADMIN`). Frontend akan otomatis mengkonversi ke lowercase.

### Langkah 4: (Opsional) Reset Password via SQL

Jika tidak bisa akses recovery email:

```bash
# Via Supabase CLI (ganti <PROJECT_REF> dengan project ref kamu dari .env)
npx supabase auth admin update-user-by-email teacher@edusync.dev \
  --password "NewPassword123!" \
  --project-ref <PROJECT_REF>
```

Atau minta admin project untuk reset via Dashboard.

### Langkah 5: Login di Aplikasi

1. Buka aplikasi EduSync (`npm run dev`)
2. Di halaman login, klik salah satu tombol **Quick Login** (🎓 Student / 👩‍🏫 Teacher / 🛡️ Admin)
3. Email akan otomatis terisi → **masukkan password** yang sudah di-set
4. Klik **Sign In**
5. Selesai — semua operasi database (buat kelas, quiz, dll) akan berjalan

---

## 🏗️ Arsitektur Auth EduSync

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Login.tsx   │────▶│  Supabase Auth   │────▶│  PostgreSQL DB  │
│  (Frontend)  │     │  (Real JWT)      │     │  (RLS Active)   │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                    │                         │
       │              JWT berisi:                RLS menggunakan:
       │              - user_id (auth.uid())     - auth.uid()
       │              - tenant_id (claim)        - get_my_tenant_id()
       │              - role                     - has_role()
       │                    │                         │
       ▼                    ▼                         ▼
  AuthContext.tsx     Setiap request ke        Query hanya return
  menyimpan state    Supabase menyertakan     data milik user +
  user + roles       JWT di header            tenant yg valid
```

**Aturan Utama:**
1. **Semua autentikasi HARUS melalui `supabase.auth.signInWithPassword()`**
2. **JANGAN PERNAH** membuat fake session/user/token di frontend
3. Jika perlu testing tanpa Supabase, gunakan **Supabase Local Dev** (`npx supabase start`)
4. Untuk E2E testing, gunakan akun test yang sudah terdaftar di Supabase Auth

---

## 🧪 Alternatif untuk Testing Tanpa Token Real

Jika butuh testing **tanpa koneksi ke Supabase remote**:

### Opsi 1: Supabase Local Development (Recommended)
```bash
npx supabase start
# Ini akan menjalankan PostgreSQL + Auth + API secara lokal
# Buat user test langsung di local instance
```

### Opsi 2: Unit Test dengan Mocking
```typescript
// Hanya untuk UNIT TEST, bukan untuk UI development
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: vi.fn().mockReturnValue({ /* ... */ })
  }
}));
```

> Mocking hanya boleh di file test (`*.test.ts`), **TIDAK BOLEH** di komponen production.

---

## 📝 Checklist Sebelum Merge PR

- [ ] Tidak ada mock auth / fake JWT di kode production
- [ ] Tidak ada hardcoded user ID atau tenant ID
- [ ] `VITE_DEMO_PASSWORD` atau secret lain **TIDAK** ada di `.env`
- [ ] Semua fitur baru sudah ditest dengan login real
- [ ] RLS policies sudah diverifikasi untuk fitur baru
