# Onboarding Flow Documentation

> **SQA Audit Finding addressed:** "Onboarding flow presence unclear from route evidence — steps between
> email verification → workspace selection → first dashboard view are not explicit."
>
> This document provides the authoritative reference for the complete onboarding journey.
> Last updated: 2026-04-01

---

## Architecture Decision: Modal-Based Onboarding

EduSync uses **modal-based onboarding** instead of dedicated `/onboarding/*` routes.

**Rationale:**

- Minimises navigation interruptions — user lands on their real dashboard immediately
- Allows onboarding modals to be shown across navigations (layout-level mount) without URL changes
- Avoids the back-button problem common with multi-step `/onboarding/:step` routes
- Keeps onboarding state close to the feature it relates to (role-specific layouts)

**Trade-off acknowledged:** Route-based onboarding would provide better analytics (step completion
by URL) and clearer SQA auditability. This is tracked as a future enhancement (see bottom).

---

## System Entry Point

All authenticated traffic passes through two guards:

1. **`AuthGuard`** (`src/components/guards/AuthGuard.tsx`) — verifies a valid Supabase session
2. **`TenantGuard`** (`src/components/guards/TenantGuard.tsx`) — verifies `activeTenant` is set
   - If `activeTenant` is null → redirects to **`/workspace-selector`**

`/workspace-selector` is the canonical entry gate for new users with no tenant membership.

---

## Complete Flow by User Type

### 1. Brand New User (No Tenant Membership)

**Entry route:** `/#/workspace-selector`  
**File:** `src/pages/WorkspaceSelector.tsx`  
**Guard:** `AuthGuard` (requires email verified by Supabase)

**Step machine** (`OnboardingStep` type):

```
pick-role
  ├── student-form
  │     Fields: fullName, joinCode
  │     API: authService.onboardStudentJoinClass({ joinCode, fullName })
  │     Success: window.location.href = '/'  →  TenantGuard retries  →  /app/student/dashboard
  │
  ├── teacher-form
  │     Fields: fullName, schoolName
  │     API: authService.createSchoolTenant({ schoolName, fullName, role: 'teacher' })
  │     Success: window.location.href = '/'  →  TenantGuard retries  →  /app/teacher/dashboard
  │
  └── admin-form
        Fields: fullName, schoolName
        API: authService.createSchoolTenant({ schoolName, fullName, role: 'admin' })
        Success: window.location.href = '/'  →  TenantGuard retries  →  /app/admin/dashboard
```

**Branch logic in WorkspaceSelector:**

- `memberships.length === 0` → renders the **new user** onboarding step machine
- `memberships.length > 0` → renders the **existing user** workspace picker (select school)

**Auto-redirect:** if `activeTenant && memberships.length > 0` → `navigate('/app')` (no selector shown)

---

### 2. Returning Student — First Dashboard Visit

**Entry route:** `/#/app/student/dashboard`  
**Layout:** `StudentLayout` (`src/components/layout/StudentLayout.tsx`)

Two onboarding components fire on first login. Both are one-time and dismissed via `localStorage`.

#### 2a. StudentWelcome modal

| Attribute        | Value                                                                             |
| ---------------- | --------------------------------------------------------------------------------- |
| Component        | `StudentWelcome`                                                                  |
| File             | `src/features/onboarding/components/StudentWelcome.tsx`                           |
| Mounted in       | `src/pages/Dashboard.tsx` (only when `role === 'student'`)                        |
| Trigger          | `!localStorage.getItem('edusync_student_welcomed')`                               |
| Delay            | 800ms after mount (allows dashboard to render first)                              |
| localStorage key | `'edusync_student_welcomed'` (set to `'1'` on dismiss)                            |
| z-index          | `z-50`                                                                            |
| Content          | Personalized greeting + 3 quick-action buttons (Courses / Assignments / Calendar) |
| Dismiss          | Close button, backdrop click, or any quick-action button                          |

#### 2b. Onboarding Wizard modal (3-step slideshow)

| Attribute        | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Component        | `Onboarding`                                                                   |
| File             | `src/components/Onboarding.tsx`                                                |
| Mounted in       | `StudentLayout` (always present in the layout tree)                            |
| Trigger          | `!localStorage.getItem('onboarded_student')` — checked once via `useRef` guard |
| localStorage key | `'onboarded_student'` (set to `'true'` on completion)                          |
| z-index          | `z-[1000]` (above all other UI)                                                |
| Steps (student)  | 1. Selamat Datang di EduSync! 2. Peta Pembelajaran 3. Kumpulkan XP & Bersaing  |
| Dismiss          | Escape key, backdrop click, Close button, or "Lewati" button                   |
| Navigation       | "Lanjut" advances step; "Mulai Sekarang" (step 3) completes wizard             |

---

### 3. Returning Teacher — First Dashboard Visit

**Entry route:** `/#/app/teacher/dashboard`  
**Layout:** `TeacherLayout` (`src/components/layout/TeacherLayout.tsx`)

#### 3a. TeacherWelcome modal

| Attribute        | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Component        | `TeacherWelcome`                                                                         |
| File             | `src/features/onboarding/components/TeacherWelcome.tsx`                                  |
| Mounted in       | `src/pages/TeacherDashboard.tsx`                                                         |
| Trigger          | `!localStorage.getItem('edusync_teacher_welcomed')`                                      |
| Delay            | 800ms after mount                                                                        |
| localStorage key | `'edusync_teacher_welcomed'` (set to `'1'` on dismiss)                                   |
| z-index          | `z-50`                                                                                   |
| Content          | Personalized greeting + 3 quick-action buttons (Course Builder / Classes / Quiz Manager) |
| Dismiss          | Close button, backdrop click, or any quick-action button                                 |

#### 3b. Onboarding Wizard modal (3-step slideshow)

| Attribute        | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Component        | `Onboarding`                                                                   |
| File             | `src/components/Onboarding.tsx`                                                |
| Mounted in       | `TeacherLayout` (always present in the layout tree)                            |
| Trigger          | `!localStorage.getItem('onboarded_teacher')` — checked once via `useRef` guard |
| localStorage key | `'onboarded_teacher'` (set to `'true'` on completion)                          |
| z-index          | `z-[1000]`                                                                     |
| Steps (teacher)  | 1. Selamat Datang, Guru! 2. Kreator AI 3. Pantau & Evaluasi                    |
| Dismiss          | Escape key, backdrop click, Close button, or "Lewati" button                   |

---

### 4. Admin — First Dashboard Visit

**Entry route:** `/#/app/admin/dashboard`  
**Layout:** `AdminLayout` (`src/components/layout/AdminLayout.tsx`)

#### OnboardingChecklist widget

| Attribute  | Value                                                                          |
| ---------- | ------------------------------------------------------------------------------ |
| Component  | `OnboardingChecklist`                                                          |
| File       | `src/features/onboarding/components/OnboardingChecklist.tsx`                   |
| Mounted in | `AdminLayout` (always present — self-guards `role !== 'admin'`)                |
| Trigger    | DB record in `onboarding_progress` table; auto-created on first render         |
| DB table   | `onboarding_progress`                                                          |
| DB key     | `(tenant_id, user_id)` — one record per admin per school                       |
| Position   | Fixed, bottom-right (`bottom-6 right-6`), z-index `z-40`                       |
| Auto-hide  | Hides automatically when all 5 steps are complete (`pct === 100`)              |
| Dismiss    | "X" button or "Tutup sementara" link — in-memory only, reappears on next mount |
| Collapse   | "▼" button collapses to header+progress bar only                               |

**5 Setup Steps:**

| Step ID               | Title                | Links To                        |
| --------------------- | -------------------- | ------------------------------- |
| `create_course`       | Buat kursus pertama  | `/#/app/teacher/course-builder` |
| `invite_teacher`      | Undang guru          | `/#/app/admin/users`            |
| `invite_students`     | Undang siswa         | `/#/app/admin/users`            |
| `setup_grading`       | Atur skala penilaian | `/#/app/admin/settings`         |
| `enable_gamification` | Aktifkan gamifikasi  | `/#/app/admin/settings`         |

Each step is manually checked off via toggle button. Progress is persisted immediately to the DB.

---

## Components Reference

| Component             | File                                                         | Trigger                              | Storage                                    | Role             |
| --------------------- | ------------------------------------------------------------ | ------------------------------------ | ------------------------------------------ | ---------------- |
| `WorkspaceSelector`   | `src/pages/WorkspaceSelector.tsx`                            | No tenant → TenantGuard redirect     | —                                          | All (new users)  |
| `Onboarding` (wizard) | `src/components/Onboarding.tsx`                              | Layout mount + localStorage check    | `localStorage['onboarded_${role}']`        | Student, Teacher |
| `StudentWelcome`      | `src/features/onboarding/components/StudentWelcome.tsx`      | Dashboard mount + localStorage check | `localStorage['edusync_student_welcomed']` | Student          |
| `TeacherWelcome`      | `src/features/onboarding/components/TeacherWelcome.tsx`      | Dashboard mount + localStorage check | `localStorage['edusync_teacher_welcomed']` | Teacher          |
| `OnboardingChecklist` | `src/features/onboarding/components/OnboardingChecklist.tsx` | AdminLayout mount + DB record        | `onboarding_progress` DB table             | Admin            |

---

## Guard Chain Summary

```
Browser request /#/app/...
        │
        ▼
    AuthGuard
    ├── no session ──────────────────────► /login
    └── session OK
            │
            ▼
        TenantGuard
        ├── no activeTenant ─────────────► /workspace-selector
        │                                   (new user step machine OR workspace picker)
        └── activeTenant OK
                │
                ▼
            RoleGuard
            ├── role=student → StudentLayout → Dashboard
            │                       │               └── <StudentWelcome /> (once)
            │                       └── <Onboarding /> wizard (once, z-1000)
            │
            ├── role=teacher → TeacherLayout → TeacherDashboard
            │                       │               └── <TeacherWelcome /> (once)
            │                       └── <Onboarding /> wizard (once, z-1000)
            │
            └── role=admin  → AdminLayout
                                    └── <OnboardingChecklist /> (until 5/5 done, z-40)
```

---

## Testing Onboarding

To reset onboarding state for manual testing in the browser console:

```javascript
// Reset Onboarding wizard (student)
localStorage.removeItem('onboarded_student')

// Reset Onboarding wizard (teacher)
localStorage.removeItem('onboarded_teacher')

// Reset StudentWelcome modal
localStorage.removeItem('edusync_student_welcomed')

// Reset TeacherWelcome modal
localStorage
  .removeItem('edusync_teacher_welcomed')

  [
    // Reset all at once
    ('onboarded_student',
    'onboarded_teacher',
    'edusync_student_welcomed',
    'edusync_teacher_welcomed')
  ].forEach((k) => localStorage.removeItem(k))

// Reset OnboardingChecklist (admin)
// Must delete or reset the DB row:
// DELETE FROM onboarding_progress WHERE user_id = '<your-user-id>';
// Or update steps_completed to {} in Supabase Studio.
```

To run unit tests:

```bash
pnpm vitest run src/features/onboarding
```

---

## Data Flow: WorkspaceSelector API Calls

```
Student path:
  authService.onboardStudentJoinClass({ joinCode: string, fullName: string })
    → validates join code against classes table
    → creates profile + enrollment records
    → sets tenant membership
    → returns { class_name, school_name }

Teacher/Admin path:
  authService.createSchoolTenant({ schoolName: string, fullName: string, role: 'teacher' | 'admin' })
    → creates tenant record (school)
    → creates profile
    → creates tenant_membership with given role
    → for admin: full admin access; for teacher: class management access
```

---

## localStorage Keys Summary

| Key                        | Set by               | When set                                               | Value    |
| -------------------------- | -------------------- | ------------------------------------------------------ | -------- |
| `onboarded_student`        | `Onboarding.tsx`     | Wizard step 3 "Mulai Sekarang", skip, close, or Escape | `'true'` |
| `onboarded_teacher`        | `Onboarding.tsx`     | Wizard step 3 "Mulai Sekarang", skip, close, or Escape | `'true'` |
| `edusync_student_welcomed` | `StudentWelcome.tsx` | Any dismiss action                                     | `'1'`    |
| `edusync_teacher_welcomed` | `TeacherWelcome.tsx` | Any dismiss action                                     | `'1'`    |

---

## Future Enhancement Options

1. **Route-based onboarding:** Add `/onboarding/:step` routes for better step-level analytics
   and clearer SQA auditability. Recommended if onboarding completion rate needs to be tracked.

2. **Telemetry events:** Emit `ONBOARDING_STEP_VIEWED` and `ONBOARDING_COMPLETED` events to the
   event telemetry pipeline (see `docs/adr/ADR-003-event-driven-telemetry-pipeline.md`) for
   funnel analytics.

3. **Server-side persistence for student/teacher wizard:** Migrate `onboarded_${role}` from
   `localStorage` to the `onboarding_progress` DB table (same as admin checklist) so that
   first-login experience is consistent across devices.

4. **Forced completion:** For admin checklist, consider blocking dashboard access until minimum
   steps (e.g., create_course + invite_students) are complete.

---

## Related Documentation

- `src/features/onboarding/README.md` — Feature module README
- `docs/AUTH.md` — Authentication flow
- `docs/architecture/AUTH_ARCHITECTURE.md` — Auth architecture detail
- `docs/TENANT_ARCHITECTURE.md` — Multi-tenant isolation
- `docs/RLS_POLICIES.md` — Row-level security policies
