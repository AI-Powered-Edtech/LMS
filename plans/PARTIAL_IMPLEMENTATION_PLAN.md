# Partial Implementation Completion Plan

**Project:** EduSync LMS
**Date:** 2026-03-29
**Status:** 5 items partially implemented, target 100% completion
**Total Estimated Effort:** 10-17 developer-days

---

## Overview

Dokumen ini mengkonsolidasi 5 item yang masih partially implemented dari berbagai plan sebelumnya. Semua plan lama sudah dihapus dan diganti dokumen ini sebagai single source of truth.

| #   | Item                            | Current | Target | Effort   |
| --- | ------------------------------- | ------- | ------ | -------- |
| 1   | Onboarding Flow                 | 60%     | 100%   | 3-5 hari |
| 2   | Profile Module                  | 50%     | 100%   | 1-2 hari |
| 3   | Question Bank                   | 70%     | 100%   | 2-3 hari |
| 4   | Form Validation Standardization | 40%     | 100%   | 2-3 hari |
| 5   | Context Providers Migration     | 80%     | 100%   | 1-2 hari |

---

## Item 1: Onboarding Flow (60% → 100%)

**Severity:** HIGH (UX)
**Effort:** 3-5 hari
**Source:** ROADMAP-SQA-REMEDIATION P3-1, IMPLEMENTATION_ROADMAP 6.5

### Yang Sudah Ada

| Component                      | File                                                         | Status |
| ------------------------------ | ------------------------------------------------------------ | ------ |
| Onboarding checklist widget    | `src/features/onboarding/components/OnboardingChecklist.tsx` | Done   |
| Teacher welcome                | `src/features/onboarding/components/TeacherWelcome.tsx`      | Done   |
| Student welcome                | `src/features/onboarding/components/StudentWelcome.tsx`      | Done   |
| DB table `onboarding_progress` | Migration                                                    | Done   |

### Yang Belum

| Task     | Description                                                                                                                          | File(s)                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **T1.1** | Buat multi-step wizard untuk teacher: "Buat kursus pertamamu" (3-step: info kursus → tambah modul → publish)                         | `src/features/onboarding/components/TeacherOnboardingWizard.tsx` (baru) |
| **T1.2** | Buat guided tour untuk student: "Selamat datang! Mari temukan kursus pertamamu" — highlight dashboard sections                       | `src/features/onboarding/components/StudentDashboardTour.tsx` (baru)    |
| **T1.3** | Buat guided tour untuk admin: "Siapkan institusi Anda" — highlight admin panels                                                      | `src/features/onboarding/components/AdminSetupTour.tsx` (baru)          |
| **T1.4** | Tambah onboarding gate: cek `onboarding_progress.completed_at` di setiap role's landing page, redirect ke wizard jika belum complete | `src/features/onboarding/hooks/useOnboardingGate.ts` (baru)             |
| **T1.5** | Tambah progress indicator pada setiap wizard step                                                                                    | Komponen `OnboardingProgress.tsx` (baru)                                |

### Acceptance Criteria

- [ ] Teacher login pertama → wizard 3-step muncul, bisa skip
- [ ] Student login pertama → guided tour muncul, bisa skip
- [ ] Admin login pertama → setup tour muncul, bisa skip
- [ ] Setelah complete, `onboarding_progress.completed_at` terisi, tidak muncul lagi
- [ ] Progress indicator menunjukkan step saat ini (1/3, 2/3, 3/3)

---

## Item 2: Profile Module (50% → 100%)

**Severity:** HIGH (Security Compliance)
**Effort:** 1-2 hari
**Source:** ROADMAP-SQA-REMEDIATION P3-2

### Yang Sudah Ada

| Component                | File                                                     | Status |
| ------------------------ | -------------------------------------------------------- | ------ |
| Profile edit form (nama) | `src/features/profile/components/ProfileForm.tsx`        | Done   |
| Password change          | `src/features/profile/components/PasswordChangeForm.tsx` | Done   |
| Public profile service   | `src/features/profile/api/publicProfileService.ts`       | Done   |

### Yang Belum

| Task     | Description                                                                                    | File(s)                                                              |
| -------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **T2.1** | Tambah avatar upload — gunakan Supabase Storage bucket `avatars`, update `profiles.avatar_url` | `src/features/profile/components/AvatarUpload.tsx` (baru)            |
| **T2.2** | Tambah bio field ke ProfileForm — textarea, max 500 karakter                                   | Edit `src/features/profile/components/ProfileForm.tsx`               |
| **T2.3** | Tambah notification preferences ke profile page — toggle email/push/in-app per event type      | `src/features/profile/components/NotificationPreferences.tsx` (baru) |
| **T2.4** | Tambah account deletion — konfirmasi modal, soft-delete di DB, logout setelah delete           | `src/features/profile/components/DeleteAccount.tsx` (baru)           |

### Acceptance Criteria

- [ ] User bisa upload avatar, preview sebelum save
- [ ] Bio field muncul di profile form dengan validasi max 500 char
- [ ] User bisa set notification preferences per event type (email, push, in-app)
- [ ] User bisa hapus akun dengan konfirmasi (ketik "HAPUS"), data di-soft-delete
- [ ] Semua komponen punya dark: variants

---

## Item 3: Question Bank (70% → 100%)

**Severity:** HIGH
**Effort:** 2-3 hari
**Source:** QUESTION_BANK_IMPLEMENTATION_PLAN.md

### Yang Sudah Ada

| Component        | File                                                                         | Status |
| ---------------- | ---------------------------------------------------------------------------- | ------ |
| Browse/search UI | `src/features/question-bank/components/QuestionSearchModal.tsx`              | Done   |
| Tagging system   | `question_tags` table + `questionBankService.ts`                             | Done   |
| CSV import       | `src/features/question-bank/utils/csvQuestionParser.ts`                      | Done   |
| CRUD RPCs        | `create_question`, `update_question`, `search_questions`, `archive_question` | Done   |
| DB tables        | `question_bank`, `question_bank_usage`, `question_tags` with RLS             | Done   |

### Yang Belum

| Task     | Description                                                                                                                   | File(s)                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **T3.1** | Tambah versioning — kolom `version INT DEFAULT 1`, increment on update, simpan snapshot di `question_bank_history` tabel baru | Migration `069_question_bank_versioning.sql`                          |
| **T3.2** | Tambah CSV export — filter by type/difficulty/tag, download sebagai file                                                      | `src/features/question-bank/utils/csvQuestionExporter.ts` (baru)      |
| **T3.3** | Tambah usage analytics UI — tampilkan pertanyaan mana yang dipakai di quiz mana, usage count                                  | `src/features/question-bank/components/QuestionUsagePanel.tsx` (baru) |
| **T3.4** | Tambah export button ke QuestionSearchModal — tombol "Export CSV" di toolbar                                                  | Edit `src/features/question-bank/components/QuestionSearchModal.tsx`  |

### Acceptance Criteria

- [ ] Update question → version increment, old version tersimpan di history
- [ ] Export CSV dengan filter — file di-download dengan header yang benar
- [ ] Usage analytics menunjukkan: "Dipakai di 3 quiz: Math Midterm, Math Final, ..."
- [ ] Export button visible di QuestionSearchModal toolbar

---

## Item 4: Form Validation Standardisasi (40% → 100%)

**Severity:** HIGH (UI Quality)
**Effort:** 2-3 hari
**Source:** IMPLEMENTATION_ROADMAP 6.8, edusync_ux_ui_flow_implementation_plan

### Yang Sudah Ada

Pages yang SUDAH menggunakan React Hook Form + Valibot:

- `src/pages/ClassManagement.tsx` — `valibotResolver(ClassroomFormSchema)`
- `src/pages/SettingsTabs.tsx` — `valibotResolver(ProfileFormSchema)`
- `src/pages/ResetPassword.tsx` — `valibotResolver(resetPasswordSchema)`
- `src/pages/ForgotPassword.tsx` — `valibotResolver(forgotPasswordSchema)`
- `src/pages/dashboard/JoinClassModal.tsx` — `valibotResolver(JoinClassSchema)`

### Yang Belum

| Task     | Description                                                                                                                          | File(s)                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **T4.1** | Migrate `Creator.tsx` (568L) — replace `useState` form dengan `useForm` + `valibotResolver`, buat schema `CreatorFormSchema`         | Edit `src/pages/Creator.tsx`, buat `src/shared/schemas/creator.ts`         |
| **T4.2** | Migrate `QuizManager.tsx` (502L) — replace `useState` form dengan `useForm` + `valibotResolver`, buat schema `QuizManagerFormSchema` | Edit `src/pages/QuizManager.tsx`, buat `src/shared/schemas/quizManager.ts` |
| **T4.3** | Migrate `QuizEditorView.tsx` (505L) — replace `useState` form dengan `useForm` + `valibotResolver`                                   | Edit `src/features/quizzes/components/QuizEditorView.tsx`                  |

### Migration Pattern

```tsx
// BEFORE (Creator.tsx current pattern)
const [title, setTitle] = useState('')
const [description, setDescription] = useState('')
const handleSubmit = () => {
  /* manual validation */
}

// AFTER (standardized pattern)
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import * as v from 'valibot'

const CreatorSchema = v.object({
  title: v.string([v.minLength(1, 'Judul wajib diisi')]),
  description: v.optional(v.string()),
})

const form = useForm({ resolver: valibotResolver(CreatorSchema) })
```

### Acceptance Criteria

- [ ] `Creator.tsx` menggunakan `useForm` + `valibotResolver`, error messages muncul per field
- [ ] `QuizManager.tsx` menggunakan `useForm` + `valibotResolver`
- [ ] `QuizEditorView.tsx` menggunakan `useForm` + `valibotResolver`
- [ ] Semua form konsisten: error merah di bawah field, disable submit saat invalid

---

## Item 5: Context Providers Migration (80% → 100%)

**Severity:** MEDIUM
**Effort:** 1-2 hari
**Source:** context_providers_audit_report.md

### Yang Sudah Dimigrasi

7 dari 10 contexts sudah dimigrasi ke React Query / dihapus. Hanya 3 tersisa di `src/contexts/`.

### Yang Tersisa

| Context              | Consumers | Recommendation              | Action           |
| -------------------- | --------- | --------------------------- | ---------------- |
| `AuthContext.tsx`    | Global    | Keep (complex global state) | **TIDAK DIUBAH** |
| `BuilderContext.tsx` | 9 files   | Migrate to Zustand          | **T5.1**         |
| `ThemeContext.tsx`   | Global    | Migrate to Zustand          | **T5.2**         |

### Tasks

| Task     | Description                                                                                                                               | File(s)                                                                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **T5.1** | Migrate `BuilderContext.tsx` ke Zustand store — extract reducer logic ke `src/features/courses/store/builderStore.ts`, update 9 consumers | Buat `src/features/courses/store/builderStore.ts`, hapus `src/contexts/BuilderContext.tsx`, update 9 consumer files |
| **T5.2** | Migrate `ThemeContext.tsx` ke Zustand store — simple dark/light toggle                                                                    | Buat `src/shared/store/themeStore.ts`, hapus `src/contexts/ThemeContext.tsx`, update consumers                      |
| **T5.3** | Hapus `src/contexts/` directory jika kosong setelah migrasi                                                                               | Hapus directory                                                                                                     |

### BuilderContext Consumers (9 files yang perlu diupdate)

```
src/pages/Creator.tsx
src/pages/...
(tbd saat implementasi — scan imports dari BuilderContext)
```

### Acceptance Criteria

- [ ] `src/contexts/` directory tidak ada lagi (atau hanya index.ts re-export jika AuthContext dipindah)
- [ ] Builder state menggunakan Zustand, semua 9 consumers bekerja tanpa regresi
- [ ] Theme toggle masih berfungsi (dark/light mode switch)
- [ ] Tidak ada import dari `src/contexts/` yang tersisa

---

## Implementation Order

```
Week 1:
  ├── Day 1-2:   Item 2 — Profile Module (1-2 hari, HIGH priority, low effort)
  ├── Day 2-3:   Item 4 — Form Validation (2-3 hari, HIGH priority)
  └── Day 3-4:   Item 5 — Context Migration (1-2 hari, MEDIUM priority)

Week 2:
  ├── Day 1-2:   Item 3 — Question Bank (2-3 hari, HIGH priority)
  └── Day 3-5:   Item 1 — Onboarding Flow (3-5 hari, HIGH priority)
```

**Prioritas:**

1. **Profile Module** — effort kecil, security compliance (account deletion)
2. **Form Validation** — effort sedang, code consistency
3. **Context Migration** — effort kecil, architecture cleanup
4. **Question Bank** — effort sedang, feature completeness
5. **Onboarding** — effort besar, UX improvement

---

## Tracking

| Item                 | T1  | T2  | T3  | T4  | T5  | Status   |
| -------------------- | --- | --- | --- | --- | --- | -------- |
| 1. Onboarding        | [ ] | [ ] | [ ] | [ ] | [ ] | 0/5      |
| 2. Profile           | [ ] | [ ] | [ ] | [ ] | —   | 0/4      |
| 3. Question Bank     | [ ] | [ ] | [ ] | [ ] | —   | 0/4      |
| 4. Form Validation   | [ ] | [ ] | [ ] | —   | —   | 0/3      |
| 5. Context Migration | [ ] | [ ] | [ ] | —   | —   | 0/3      |
| **TOTAL**            |     |     |     |     |     | **0/19** |

---

_Dokumen ini menggantikan semua plan sebelumnya yang sudah dihapus._
_Update checklist di atas setelah setiap task selesai._
