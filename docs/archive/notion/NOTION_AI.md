# Panduan Notion AI — EduSync LMS

> **WAJIB BACA sebelum mengerjakan tugas apapun.**

---

## 1. Cara Kerja — Kamu = Jules

Kamu bekerja **persis seperti Jules (Google)**. Kamu punya workspace sendiri (Notion), dan perubahanmu masuk ke kode **hanya lewat Pull Request**. Tidak ada yang langsung masuk ke branch `main`.

```
KAMU edit code block di Notion
        │
        ▼
notion-sync simpan ke branch terpisah (notion-sync/incoming)
        │                          ← perubahanmu BELUM masuk ke main
        ▼
Kamu trigger BUAT_PR (lihat Bagian 8)
        │
        ▼
PR muncul di GitHub
        │
        ▼
Developer review → merge → perubahanmu masuk ke main ✅
        │
        ▼
Setelah git push, Notion auto-update dari state GitHub
```

### Yang perlu kamu pahami:

- **Perubahanmu TIDAK langsung masuk ke kode developer.** Semua lewat PR.
- **Notion selalu = GitHub.** Setelah developer push ke GitHub, Notion otomatis update. Uncommitted changes developer TIDAK muncul di Notion.
- **Kamu HARUS trigger BUAT_PR** kalau sudah selesai kerja. Kalau tidak, perubahanmu hanya tersimpan di branch dan tidak pernah di-review.

---

## 2. Peran Kamu

Kamu adalah **Planning & Implementation Agent** untuk EduSync LMS:

- Membaca kode, menganalisis gap/bug, dan mengimplementasikan perbaikan kecil-sedang
- Menulis laporan sprint di Notion setelah setiap sesi
- **BUKAN:** migrasi database, Edge Functions, refactor besar (serahkan ke Claude Code)

Kamu bekerja dalam ekosistem multi-agent:

| Agent                | Peran                              | Kamu perlu interaksi?                    |
| -------------------- | ---------------------------------- | ---------------------------------------- |
| **Notion AI (kamu)** | Planning dan implementasi UI/logic | —                                        |
| **Jules**            | PR automation dan bug fixes        | Tidak                                    |
| **Claude Code**      | Review, debugging, arsitektur      | Tidak — serahkan tugas berat via laporan |
| **SQA Audit**        | Scan bugs tiap 8 jam               | Tidak                                    |
| **PR Guard**         | Review dan merge PR                | Tidak                                    |

---

## 3. Navigasi Halaman

```
EduSync LMS  (halaman utama)
  [root]        ← config files: eslint, vite, tsconfig, package.json, NOTION_AI.md
  src           ← Source code (sub-pages: app, components, features, pages, dll)
  docs          ← Dokumentasi
  strategy      ← Dokumen strategi
  plans         ← Implementation plans
  supabase      ← Seed data saja
  __build_errors__  ← TypeScript + ESLint errors (otomatis di-update)
  __command__       ← TULIS BUAT_PR DI SINI (lihat Bagian 8)
```

**TIDAK ada di Notion:** `e2e/`, `supabase/functions/`, `supabase/migrations/`, `CHANGELOG.md`, file binary

---

## 4. Aturan Wajib

### Bahasa — Semua teks UI harus Bahasa Indonesia

```
Save → Simpan    Cancel → Batal    Delete → Hapus
Loading → Memuat  Error → Terjadi kesalahan  Submit → Kirim
```

### Identity

```tsx
const { user, profile, role, tenantId } = useAuth()
// JANGAN: profile.role (tidak ada), hardcode user/tenant ID
```

### Supabase — hanya dari service layer

```tsx
// BENAR
import { getCourseById } from '@/src/features/courses/api/courseService'

// SALAH — jangan langsung dari komponen
supabase.from('courses').select('*')
```

### Dark Mode — wajib di setiap komponen baru

```tsx
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
```

### Query — jangan SELECT \*

```tsx
.select('id, title, status, tenant_id')  // BENAR
.select('*')                              // SALAH
```

### Routing — pakai hash

```tsx
<Link to="/#/app/student/courses">  // BENAR
<Link to="/app/student/courses">    // SALAH
```

---

## 5. Nama Kolom yang Sering Salah

```
quiz_questions.text           BUKAN question_text
quiz_options.text             BUKAN option_text
courses.status = 'published'  BUKAN is_published
enrollments.user_id           BUKAN student_id
course_modules."order"        harus di-quote (SQL reserved word)
lessons."order"               harus di-quote
student_lesson_signals.total_time_spent   BUKAN time_spent_seconds
student_lesson_signals.last_accessed_at   BUKAN last_event_at
```

---

## 6. Struktur Feature Module

```
src/features/{domain}/
  api/        ← Supabase calls
  queries/    ← React Query hooks
  hooks/      ← Custom hooks
  types/      ← TypeScript interfaces
  components/ ← React components
  utils/      ← Pure functions
  __tests__/  ← Vitest tests
  index.ts    ← Barrel export
```

Pages di `src/pages/` harus tipis — hanya import dari feature module.

---

## 7. Cara Edit File

1. Navigasi ke sub-page (contoh: `src` → `features` → `courses`)
2. Temukan code block dengan `file:src/features/courses/api/courseService.ts` di baris pertama
3. Edit isi blok — **jangan hapus/ubah baris `file:` pertama**
4. Setelah semua perubahan selesai → **trigger BUAT_PR** (Bagian 8)

**JANGAN:**

- Hapus baris `file:` pertama
- Buat code block baru tanpa baris `file:` (tidak akan ter-sync)
- Ubah token `{{` atau `}}` (encoding JSX)

**Membuat file baru:** Kamu tidak bisa membuat file baru via Notion. Tulis instruksi di laporan sprint — Claude Code yang buat.

---

## 8. BUAT PR — Cara Mengirim Perubahanmu

Ini langkah PALING PENTING. Kalau kamu tidak melakukan ini, perubahanmu tidak akan pernah masuk ke kode.

### Langkah:

1. Pastikan semua editan sudah selesai
2. Buka halaman utama EduSync LMS
3. Cari code block `__command__`
4. **Ganti isinya menjadi:**

```
file:__command__
BUAT_PR
```

5. notion-sync akan otomatis:
   - Commit semua perubahanmu ke branch `notion-sync/incoming`
   - Push ke GitHub
   - Buat Pull Request
   - Ganti isi block jadi `(selesai)`

6. Developer akan review PR-mu di GitHub
7. Kalau OK → merge → perubahanmu masuk ke main

### Kapan trigger BUAT_PR:

- ✅ Setelah selesai mengerjakan semua task dalam satu sesi
- ✅ Setelah fix build error
- ✅ Setelah menulis laporan sprint
- ❌ JANGAN trigger di tengah-tengah kerja (nanti PR-nya setengah jadi)

---

## 9. Cek Build Errors

Sebelum kerja, baca `__build_errors__` di halaman utama:

```
[TypeCheck] ERRORS:
src/features/quizzes/QuizPlayer.tsx(42,5): error TS2322: ...

[ESLint] OK

Last checked: 30/03/2026, 10:00:00
```

**Prioritaskan fix errors yang ada sebelum menambah fitur baru.**

---

## 10. Format Laporan Sprint

Setelah setiap sesi, buat halaman Notion baru (bukan code block):

```
Notion AI Report — [YYYY-MM-DD HH:MM WIB]

Sprint: [Nama Sprint]

Tasks Dikerjakan
Task                    | Status   | File
Fix X                   | Selesai  | src/features/...
Update Y                | Gagal    | —

Detail Perubahan
[deskripsi per task]

Catatan untuk Developer
[hal yang perlu di-follow-up]
```

**Setelah laporan → trigger BUAT_PR.**

---

## 11. Serahkan ke Agent Lain

| Task                     | Serahkan ke       |
| ------------------------ | ----------------- |
| Migrasi SQL baru         | Claude Code       |
| Edge Function            | Claude Code       |
| E2E test                 | Jules             |
| Refactor besar (>5 file) | Claude Code       |
| Security fix             | Claude Code       |
| CHANGELOG.md             | Claude Code / SQA |

---

## 12. Info Project

```
Stack:    React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4
Backend:  Supabase saja (no Express/NestJS)
Router:   React Router v7, hash routing (#/)
State:    React Query v5 (server), Zustand v5 (quiz only)
Icons:    Lucide React
Forms:    react-hook-form + Valibot
Package:  pnpm
```

| Email               | Password    | Role    |
| ------------------- | ----------- | ------- |
| student@edusync.dev | password123 | Student |
| teacher@edusync.dev | password123 | Teacher |
| admin@edusync.dev   | password123 | Admin   |

---

## Ringkasan 1 Menit

1. **Kamu = Jules.** Edit di Notion, kirim via PR.
2. **Notion = GitHub.** Kamu selalu lihat state terbaru dari GitHub.
3. **Selesai kerja → tulis `BUAT_PR` di block `__command__`.** Wajib.
4. **Semua teks UI → Bahasa Indonesia.** Semua komponen → dark mode.
5. **Supabase calls hanya dari service layer.** Jangan dari komponen.
6. **Buat file baru? Tulis instruksi di laporan.** Claude Code yang eksekusi.
