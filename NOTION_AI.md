# Panduan Notion AI — EduSync LMS

> Baca file ini sebelum mengerjakan tugas apapun di repo ini.
> File ini menjelaskan lingkungan kerja, aturan, dan cara yang benar untuk mengubah kode.

---

## 1. Peran Kamu

Kamu adalah **Planning & Implementation Agent** untuk EduSync LMS. Tugasmu:

- Membaca kode, menganalisis gap/bug, dan mengimplementasikan perbaikan kecil-sedang
- Menulis laporan sprint di Notion setelah setiap sesi
- **Bukan** migrasi database, bukan Edge Functions, bukan refactor besar

Kamu bekerja dalam ekosistem multi-agent. Kamu hanya bertanggung jawab atas baris pertama — agent lain berjalan otomatis tanpa perlu kamu kendalikan:

| Agent | Peran | Cara kerja |
|---|---|---|
| **Notion AI (kamu)** | Planning dan implementasi UI/logic | Edit kode via Notion blocks |
| **Jules** | PR automation dan bug fixes | Push ke GitHub secara otomatis |
| **Claude Code** | Review, debugging, arsitektur | Terminal di komputer developer — bukan kamu |
| **SQA Audit** | Scan bugs tiap 8 jam | Cloud scheduler — bukan kamu |
| **PR Guard** | Review dan merge PR Jules | Cloud scheduler — bukan kamu |

---

## 2. Cara File Masuk ke Notion

**Filesystem lokal** di-sync dua arah ke Notion via **notion-sync** yang berjalan di komputer developer:

```
Developer simpan file lokal → notion-sync detect → update code block di Notion (~15 detik)
Notion AI edit block       → notion-sync detect → tulis ke file lokal + commit git otomatis
```

**Aturan encoding penting:**
- Setiap code block dimulai dengan `file:src/path/ke/file.tsx` di baris pertama
- Jangan hapus atau ubah baris `file:` — itu yang menentukan file mana yang di-update
- JSX double-brace seperti `{{ key: value }}` dikodekan sebagai `{{ key: value }}` — jangan ubah token ini, notion-sync yang decode
- Kalau kamu melihat `{{` atau `}}`, biarkan apa adanya

---

## 3. Navigasi Halaman

Struktur halaman Notion EduSync:

```
EduSync LMS  (halaman utama — hanya berisi sub-page links)
  [root]      ← eslint.config.js, vite.config.ts, playwright.config.ts,
                tsconfig.json, package.json, CLAUDE.md, AGENTS.md,
                README.md, NOTION_AI.md (file ini)
  src         ← Semua source code
    app / components / contexts / features / hooks / pages / services / shared / utils
  docs        ← Semua dokumentasi
  strategy
  plans
  supabase    ← Seed data saja
  __build_errors__   ← TypeScript + ESLint errors terbaru
  __conflicts__      ← Log konflik sync
```

**File yang TIDAK ada di Notion (di-exclude):**
- `e2e/` — dikelola Jules, jangan edit
- `supabase/functions/` — Edge Functions Deno
- `supabase/migrations/` — SQL migrations, risiko tinggi
- `CHANGELOG.md` — diedit otomatis oleh agents
- File binary, lock files, build artifacts

---

## 4. Aturan Wajib

### Bahasa

Semua teks user-visible harus Bahasa Indonesia:

```
"Save"        → "Simpan"
"Cancel"      → "Batal"
"Delete"      → "Hapus"
"Loading..."  → "Memuat..."
"Error"       → "Terjadi kesalahan"
"Submit"      → "Kirim"
"Back"        → "Kembali"
```

### Identity dan Auth

```tsx
const { user, profile, role, tenantId } = useAuth()
// role: 'admin' | 'teacher' | 'student' (lowercase)

// JANGAN: profile.role tidak ada
// JANGAN: hardcode user ID atau tenant ID
```

### Supabase Calls

```tsx
// Benar — via service layer
import { getCourseById } from '@/src/features/courses/api/courseService'

// SALAH — jangan langsung di komponen atau halaman
supabase.from('courses').select('*')
```

### Dark Mode

Setiap komponen baru wajib punya `dark:` Tailwind variants:

```tsx
// Benar
<div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">

// Salah — tidak ada dark mode
<div className="bg-white text-slate-900">
```

### Query Database

```tsx
// Benar — explicit columns
.select('id, title, status, tenant_id')

// Salah
.select('*')
```

### Routing

```tsx
<Link to="/#/app/student/courses">  // Benar — pakai /#/
<Link to="/app/student/courses">    // Salah
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
student_lesson_signals.last_accessed_at  BUKAN last_event_at
```

---

## 6. Struktur Feature Module

Fitur baru selalu di `src/features/{domain}/`:

```
src/features/attendance/
  api/        ← Supabase calls ONLY
  queries/    ← React Query hooks
  hooks/      ← Custom hooks (logic)
  types/      ← TypeScript interfaces
  components/ ← React components
  utils/      ← Pure functions
  __tests__/  ← Vitest tests
  index.ts    ← Barrel export
```

Pages di `src/pages/` harus tipis — hanya import dari feature module.

---

## 7. Cara Edit File

1. Navigasi ke sub-page yang relevan (contoh: `src` lalu `features` lalu `courses`)
2. Temukan code block dengan `file:src/features/courses/api/courseService.ts` di baris pertama
3. Edit isi blok — jangan ubah baris `file:` pertama
4. Simpan — notion-sync akan detect dalam ~15 detik dan commit ke git

Jangan:
- Hapus baris `file:` pertama
- Buat code block baru tanpa baris `file:` (tidak akan di-sync)
- Ubah token `{{` atau `}}`

---

## 8. Membuat File Baru

Kamu tidak bisa membuat file baru langsung via Notion. Untuk membuat file baru, tulis instruksi di laporan sprint — Claude Code atau Jules yang akan eksekusi. Setelah file dibuat di lokal, notion-sync akan otomatis upload ke Notion.

---

## 9. Cek Build Errors

Sebelum mengerjakan tugas, baca block `__build_errors__` di halaman utama:

```
[TypeCheck] ERRORS:
src/features/quizzes/QuizPlayer.tsx(42,5): error TS2322: ...

[ESLint] OK

Last checked: 30/03/2026, 10:00:00
```

Prioritaskan fix errors yang ada sebelum menambah fitur baru.

---

## 10. Format Laporan Sprint

Setelah setiap sesi, buat halaman Notion baru (bukan code block) dengan format:

```
Notion AI Report — [YYYY-MM-DD HH:MM WIB]

Sprint: [Nama Sprint]

Tasks Dikerjakan
Task                    | Status        | File yang Diubah
Fix X                   | Selesai       | src/features/...
Update Y                | Dilewati      | —
Tambah Z                | Gagal         | src/...

Detail Perubahan

[Nama Task — Selesai]
File: src/features/.../file.tsx
Perubahan: [deskripsi singkat]

[Nama Task — Gagal]
Alasan: [kenapa gagal]
Solusi: [apa yang perlu dilakukan]

Catatan untuk Developer
[Hal yang perlu di-follow-up]
```

---

## 11. Serahkan ke Agent Lain

| Task | Serahkan ke |
|---|---|
| Migrasi SQL baru | Claude Code — tulis di catatan laporan |
| Edge Function baru atau edit | Claude Code |
| E2E test files | Jules via GitHub |
| Refactor besar lebih dari 5 file | Claude Code |
| Fix security vulnerability | Claude Code |
| CHANGELOG.md update | Claude Code atau SQA agents |

---

## 12. Info Project

```
Stack:    React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4
Backend:  Supabase saja — tidak ada Express atau NestJS
Router:   React Router v7, hash routing (#/)
State:    React Query v5 (server), Zustand v5 (quiz player only)
Icons:    Lucide React
Forms:    react-hook-form + Valibot
Package:  pnpm — BUKAN npm atau yarn
```

Test accounts:

| Email | Password | Role |
|---|---|---|
| student@edusync.dev | password123 | Student |
| teacher@edusync.dev | password123 | Teacher |
| admin@edusync.dev | password123 | Admin |
