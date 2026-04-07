# Seed Data — EduSync LMS

## ⚠️ PERINGATAN: JANGAN JALANKAN DI PRODUCTION

File seed ini **HANYA** untuk environment development dan testing. Jangan pernah menjalankan seed pada database production karena akan:

- Membuat akun demo dengan password lemah (`password123`)
- Mengisi database dengan data dummy
- Potensi menimpa data yang sudah ada

## Struktur File

| File                    | Deskripsi                                                                 |
| ----------------------- | ------------------------------------------------------------------------- |
| `seed_base.sql`         | Tenant infrastructure (dev + demo school)                                 |
| `seed_users.sql`        | Auth users dengan password hash `password123`                             |
| `seed_demo.sql`         | Demo courses, modules, lessons, quizzes, classes                          |
| `seed_gamification.sql` | XP events, streaks, badges, leaderboard data                              |
| `quiz_seed.sql`         | Legacy quiz seed — **TIDAK** disertakan di master seed (lihat `seed.sql`) |

## Akun Test

Semua akun menggunakan password: **`password123`**

| Email                 | Role    |
| --------------------- | ------- |
| `teacher@edusync.dev` | TEACHER |
| `student@edusync.dev` | STUDENT |
| `admin@edusync.dev`   | ADMIN   |

## Cara Menjalankan

```bash
# Reset seluruh database lokal + seed otomatis
supabase db reset

# Atau jalankan seed manual via SQL Editor di Supabase Dashboard
# Copy-paste isi supabase/seed.sql ke SQL Editor → Run
```

## Cara Regenerate Kredensial untuk Environment Berbeda

1. **Ganti password hash**: Di `seed_users.sql`, variabel `v_pw_hash` berisi bcrypt hash dari `password123`. Untuk password baru, generate hash baru:

   ```bash
   # Menggunakan bcrypt CLI atau library online
   # Contoh hash bcrypt cost 10 untuk password baru:
   # $2b$10$<hash-dari-password-baru>
   ```

2. **Ganti email**: Edit email di `seed_users.sql` bagian `INSERT INTO auth.users`.

3. **Ganti tenant**: Edit slug dan nama tenant di `seed_base.sql`.

4. **Update dokumentasi**: Setelah mengubah kredensial, update:
   - `AGENTS.md` bagian Test Accounts
   - `CLAUDE.md` bagian Test Accounts
   - File ini

## Catatan Keamanan

- ⚠️ `seed_users.sql` berisi **hardcoded bcrypt password hash** untuk password lemah (`password123`). Ini disengaja untuk kemudahan development tetapi TIDAK boleh digunakan di production.
- File ini tidak mengandung data pengguna nyata — hanya fixture test.
- Password hash menggunakan bcrypt cost 10 (standar development).
