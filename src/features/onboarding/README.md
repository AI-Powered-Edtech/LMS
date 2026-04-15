# EduSync Onboarding System

Dokumentasi lengkap sistem onboarding EduSync LMS — mencakup semua role pengguna, komponen, dan mekanisme persistensi.

> **SQA Note:** EduSync menggunakan onboarding **berbasis modal** (bukan route `/onboarding/*`).
> Tidak ada dedicated route untuk onboarding; semua ditampilkan sebagai overlay di atas dashboard masing-masing role.
> Lihat [`docs/ONBOARDING_FLOW.md`](../../../docs/ONBOARDING_FLOW.md) untuk dokumentasi audit lengkap.

---

## Overview

EduSync menggunakan onboarding berbasis modal (bukan route) untuk meminimalkan interupsi navigasi.
Semua komponen onboarding bersifat **sekali tampil** (one-time) dan dipersistensikan via `localStorage` atau tabel `onboarding_progress` di database.

---

## User Journey Map

### New User (No Tenant)

```
email verification
  → /workspace-selector  (WorkspaceSelector page)
    → step: pick-role   (pilih: Murid / Guru / Admin Sekolah)
      → step: student-form  → authService.onboardStudentJoinClass()  → window.location.href='/'
      → step: teacher-form  → authService.createSchoolTenant({role:'teacher'}) → window.location.href='/'
      → step: admin-form    → authService.createSchoolTenant({role:'admin'})   → window.location.href='/'
  → TenantGuard redirect ke /app → RoleGuard → /[role]/dashboard
```

### Student (First Login / Post-Workspace-Setup)

```
/app/student/dashboard  (Dashboard.tsx)
  → StudentWelcome modal  (delay 800ms, ditampilkan sekali)
      localStorage key: 'edusync_student_welcomed'
      Aksi cepat: Temukan Kursus / Cek Tugas / Lihat Jadwal
      → dismiss → normal flow
  → Onboarding wizard modal  (ditampilkan sekali, 3 langkah)
      localStorage key: 'onboarded_student'
      Langkah: Selamat Datang → Peta Pembelajaran → Kumpulkan XP & Bersaing
      → Mulai Sekarang → normal flow
```

> **Catatan urutan:** `StudentWelcome` dan `Onboarding` wizard di-mount bersamaan di layout,
> tetapi `StudentWelcome` berada di Dashboard (z-50) sedangkan `Onboarding` di StudentLayout (z-[1000]).
> Dalam praktiknya keduanya bisa muncul dalam sesi yang sama, `Onboarding` (z-1000) berada di depan.

### Teacher (First Login / Post-Workspace-Setup)

```
/app/teacher/dashboard  (TeacherDashboard.tsx)
  → TeacherWelcome modal  (delay 800ms, ditampilkan sekali)
      localStorage key: 'edusync_teacher_welcomed'
      Aksi cepat: Buat Kursus Pertama / Undang Siswa / Buat Kuis
      → dismiss → normal flow
  → Onboarding wizard modal  (ditampilkan sekali, 3 langkah)
      localStorage key: 'onboarded_teacher'
      Langkah: Selamat Datang Guru → Kreator AI → Pantau & Evaluasi
      → Mulai Sekarang → normal flow
```

### Admin (First Login / Post-Workspace-Setup)

```
/app/admin/dashboard  (AdminLayout)
  → OnboardingChecklist widget  (fixed bottom-right, z-40)
      Persisted: tabel DB 'onboarding_progress'
      5 langkah setup:
        1. create_course   → /#/app/teacher/course-builder
        2. invite_teacher  → /#/app/admin/users
        3. invite_students → /#/app/admin/users
        4. setup_grading   → /#/app/admin/settings
        5. enable_gamification → /#/app/admin/settings
      → semua selesai (100%) → widget hilang otomatis
      → bisa di-dismiss sementara (tombol X) tanpa reset progress
```

---

## Component Map

| Komponen              | File                                                         | Trigger                                                       | Storage Key / DB                           | Role             |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------ | ---------------- |
| `WorkspaceSelector`   | `src/pages/WorkspaceSelector.tsx`                            | Tidak punya tenant (TenantGuard redirect)                     | —                                          | Semua (new user) |
| `StudentWelcome`      | `src/features/onboarding/components/StudentWelcome.tsx`      | Mount di `Dashboard.tsx` jika key tidak ada                   | `localStorage['edusync_student_welcomed']` | Student          |
| `TeacherWelcome`      | `src/features/onboarding/components/TeacherWelcome.tsx`      | Mount di `TeacherDashboard.tsx` jika key tidak ada            | `localStorage['edusync_teacher_welcomed']` | Teacher          |
| `Onboarding` (wizard) | `src/components/Onboarding.tsx`                              | Mount di `StudentLayout` & `TeacherLayout` jika key tidak ada | `localStorage['onboarded_${role}']`        | Student, Teacher |
| `OnboardingChecklist` | `src/features/onboarding/components/OnboardingChecklist.tsx` | Mount di `AdminLayout`, guard role=admin                      | DB: `onboarding_progress` table            | Admin            |

---

## Mount Points (Layout)

| Layout                    | File                                      | Komponen yang Di-mount    |
| ------------------------- | ----------------------------------------- | ------------------------- |
| `StudentLayout`           | `src/components/layout/StudentLayout.tsx` | `<Onboarding />` (wizard) |
| `TeacherLayout`           | `src/components/layout/TeacherLayout.tsx` | `<Onboarding />` (wizard) |
| `AdminLayout`             | `src/components/layout/AdminLayout.tsx`   | `<OnboardingChecklist />` |
| `Dashboard` (page)        | `src/pages/Dashboard.tsx`                 | `<StudentWelcome />`      |
| `TeacherDashboard` (page) | `src/pages/TeacherDashboard.tsx`          | `<TeacherWelcome />`      |

---

## Persistence

| Komponen              | Mekanisme      | Key/Tabel                   | Behavior                                                                                                       |
| --------------------- | -------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Onboarding` wizard   | `localStorage` | `onboarded_${role}`         | Set saat wizard selesai atau di-skip. Diperiksa satu kali via `useRef` guard.                                  |
| `StudentWelcome`      | `localStorage` | `edusync_student_welcomed`  | Set `'1'` saat dismiss. Delay 800ms sebelum muncul.                                                            |
| `TeacherWelcome`      | `localStorage` | `edusync_teacher_welcomed`  | Set `'1'` saat dismiss. Delay 800ms sebelum muncul.                                                            |
| `OnboardingChecklist` | DB             | `onboarding_progress` table | Record per `(tenant_id, user_id)`. `steps_completed: Record<string, boolean>`. Otomatis dibuat jika belum ada. |

### Schema DB: `onboarding_progress`

```ts
interface OnboardingProgress {
  id: string
  tenant_id: string // RLS: isolasi per sekolah
  user_id: string
  steps_completed: Record<string, boolean> // { create_course: true, ... }
  completed_at: string | null
}
```

RLS policy:

```sql
CREATE POLICY "tenant_isolation" ON onboarding_progress
  USING (tenant_id = (SELECT get_my_tenant_id()));
```

---

## Flow Diagram (ASCII)

```
Auth
    │
    ▼ email verified + session
AuthGuard ──(no session)──► /login
    │
    ▼ session OK
TenantGuard ──(no activeTenant)──► /workspace-selector
    │                                    │
    │                              [WorkspaceSelector]
    │                              step: pick-role
    │                                ├── Murid  → student-form → onboardStudentJoinClass()
    │                                ├── Guru   → teacher-form → createSchoolTenant({role:'teacher'})
    │                                └── Admin  → admin-form   → createSchoolTenant({role:'admin'})
    │                                              └── window.location.href='/' → TenantGuard retry
    ▼ activeTenant exists
RoleGuard
    ├── role=student → StudentLayout
    │       │
    │       ├── <Onboarding /> (wizard, z-1000) — one-time
    │       │       key: localStorage['onboarded_student']
    │       │
    │       └── /student/dashboard → Dashboard.tsx
    │               └── <StudentWelcome /> (z-50) — one-time
    │                       key: localStorage['edusync_student_welcomed']
    │
    ├── role=teacher → TeacherLayout
    │       │
    │       ├── <Onboarding /> (wizard, z-1000) — one-time
    │       │       key: localStorage['onboarded_teacher']
    │       │
    │       └── /teacher/dashboard → TeacherDashboard.tsx
    │               └── <TeacherWelcome /> (z-50) — one-time
    │                       key: localStorage['edusync_teacher_welcomed']
    │
    └── role=admin → AdminLayout
            │
            └── <OnboardingChecklist /> (fixed bottom-right, z-40) — sampai 5/5 selesai
                    DB: onboarding_progress table
```

---

## Testing / Reset

Untuk mengetes ulang onboarding, hapus key dari browser console:

```javascript
// Reset wizard Onboarding (student & teacher)
localStorage.removeItem('onboarded_student')
localStorage.removeItem('onboarded_teacher')

// Reset Welcome modal
localStorage.removeItem('edusync_student_welcomed')
localStorage.removeItem('edusync_teacher_welcomed')

// Reset OnboardingChecklist admin → reset record DB
// Hapus baris di tabel onboarding_progress dengan user_id yang sesuai
```

Jalankan unit test:

```bash
pnpm vitest run src/features/onboarding
```

---

## Arsitektur Internal

```
src/features/onboarding/
├── api/
│   └── onboardingService.ts    # getProgress, completeStep, getAll, upsert
├── queries/
│   └── onboardingQueries.ts    # React Query hooks (useOnboardingData, useOnboardingMutation)
├── hooks/
│   └── useOnboarding.ts        # Wrapper hooks
├── types/
│   └── index.ts                # OnboardingStep, OnboardingProgress, ONBOARDING_STEPS
├── components/
│   ├── OnboardingChecklist.tsx # Admin widget (DB-persisted)
│   ├── StudentWelcome.tsx      # Student one-time welcome modal
│   └── TeacherWelcome.tsx      # Teacher one-time welcome modal
├── __tests__/
│   └── onboardingService.test.ts
└── index.ts                    # Re-exports

# Komponen wizard (shared student+teacher) ada di:
src/components/Onboarding.tsx   # 3-step slideshow modal
```

---

## Dokumentasi Terkait

- [`docs/ONBOARDING_FLOW.md`](../../../docs/ONBOARDING_FLOW.md) — Dokumentasi audit lengkap
- [`docs/AUTH.md`](../../../docs/AUTH.md) — Flow autentikasi
- [`docs/DATABASE_ARCHITECTURE.md`](../../../docs/DATABASE_ARCHITECTURE.md) — Referensi tabel
- [`docs/SECURITY.md`](../../../docs/SECURITY.md) — Model keamanan dan RLS
- [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) — Arsitektur sistem
