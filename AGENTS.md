# EduSync LMS — Agent Configuration

> Quick reference untuk AI coding agents. Baca `CLAUDE.md` untuk instruksi lengkap.
> Baca `docs/DX.md` untuk peta dokumentasi lengkap.

---

## Project Identity

| Aspek               | Detail                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| **Tipe**            | Multi-tenant SaaS LMS untuk sekolah Indonesia                                  |
| **Stack**           | React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4, Supabase JS v2              |
| **Backend**         | Supabase-only — tidak ada Express/NestJS. Logic di PostgreSQL + Edge Functions |
| **Package manager** | **pnpm** (bukan npm atau yarn)                                                 |
| **UI language**     | **Bahasa Indonesia** — semua teks user-visible                                 |
| **Routing**         | Hash routing — semua URL pakai `/#/` prefix                                    |
| **Status**          | Production-ready — Phase 21 selesai (2026-03-25)                               |

---

## Critical Rules

### ❌ Jangan Lakukan

```
npm install / yarn         → Gunakan pnpm
SELECT *                   → Selalu explicit column list
profile.role               → Tidak ada — gunakan useAuth().role
Hardcode user/tenant ID    → Selalu useAuth()
English text di UI         → Bahasa Indonesia
Komponen tanpa dark:       → Selalu tambah dark: Tailwind variants
Tabel baru tanpa RLS       → Selalu RLS + tenant_id policy
Unpaginated query          → Selalu paginate tabel besar
supabase.from() di pages/hooks/components → Gunakan service layer di features/*/api/
```

### ✅ Selalu Lakukan

```
pnpm install / pnpm dev
const { user, profile, role, tenantId } = useAuth()
Fitur baru di src/features/{domain}/ dengan struktur standar
RPC baru: SECURITY DEFINER + SET search_path TO 'public'
After any task: update docs/ + CHANGELOG.md
Dark mode: dark: variants pada semua komponen baru
Supabase calls → service layer (src/features/*/api/) — BUKAN langsung di komponen
```

---

## File Locations Penting

| What                     | Where                                    |
| ------------------------ | ---------------------------------------- |
| Supabase client          | `src/services/supabase/client.ts`        |
| Auth context             | `src/contexts/AuthContext.tsx`           |
| Route tree               | `src/app/routes.tsx` → `src/app/routes/` |
| Query keys               | `src/shared/lib/queryKeys.ts`            |
| Stale time constants     | `src/utils/queryConstants.ts`            |
| Shared schemas (Valibot) | `src/shared/schemas/`                    |
| Shared types             | `src/shared/types/`                      |
| Navigation config        | `src/shared/config/navigation.ts`        |
| UI primitives            | `src/components/ui/`                     |
| Feature modules          | `src/features/` (24 modules)             |
| DB migrations            | `supabase/migrations/`                   |
| Edge Functions           | `supabase/functions/` (15 functions)     |

---

## SQL Gotchas

```sql
-- Nama kolom yang sering keliru:
quiz_questions.text           -- BUKAN question_text
quiz_options.text             -- BUKAN option_text
course_modules."order"        -- quoted — SQL reserved word
lessons."order"               -- quoted — SQL reserved word
enrollments.user_id           -- BUKAN student_id
courses.status = 'published'  -- BUKAN is_published

-- student_lesson_signals kolom:
total_time_spent              -- BUKAN time_spent_seconds
last_accessed_at              -- BUKAN last_event_at
latest_quiz_score             -- BUKAN quiz_avg_score

-- courses.status enum: 'draft', 'in_review', 'approved', 'published'
-- course_collaborators: gunakan trigger auto_set_tenant_id()
-- Analytics RPC: query user_roles langsung, JANGAN gunakan has_role()
```

---

## Auth & Routing Patterns

```tsx
// Identity
const { user, profile, role, tenantId } = useAuth()
// role: 'admin' | 'teacher' | 'student' (lowercase)

// Route protection
<RoleRoute role="teacher"><Page /></RoleRoute>
<RoleRoute role={["student", "teacher"]}><SharedPage /></RoleRoute>

// Routes
/#/app/student/*      → student
/#/app/teacher/*      → teacher
/#/app/admin/*        → admin
/#/teaching/...       → teacher/admin
```

---

## Feature Module Structure

```
src/features/{domain}/
├── api/        ← Supabase calls (DB/RPC/Edge Function)
├── queries/    ← React Query hooks
├── hooks/      ← Custom hooks
├── types/      ← TypeScript interfaces (index.ts)
├── components/ ← React components
├── store/      ← Zustand (hanya jika diperlukan)
├── utils/      ← Pure utilities
├── __tests__/  ← Vitest tests
├── index.ts    ← Public barrel export
└── README.md   ← Feature docs
```

---

## Test Accounts (Shared Dev Project)

| Email                 | Password      | Role    | Redirect         |
| --------------------- | ------------- | ------- | ---------------- |
| `teacher@edusync.dev` | `password123` | TEACHER | `/#/app/teacher` |
| `student@edusync.dev` | `password123` | STUDENT | `/#/app/student` |
| `admin@edusync.dev`   | `password123` | ADMIN   | `/#/app/admin`   |

Supabase project: `omfnkoufjqjqilswldtz.supabase.co`
Dev tenant ID: `00000000-0000-0000-0000-00000000000d`

---

## Documentation Map

Lihat [`docs/DX.md`](docs/DX.md) untuk peta lengkap semua dokumentasi.
