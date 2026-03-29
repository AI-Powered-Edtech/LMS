# Service Layer Abstraction — Implementation Plan

## Scope

Codebase sudah punya **55 service files** di `src/features/*/api/`. Hanya **9 files** dengan **15 direct supabase calls** yang tersisa di luar service layer. Ini **bukan** major refactor — ini finishing touches.

**Estimasi effort:** 1.5–2 hari developer.

---

## Batch 1 — Extend Existing Services (6 files → 0 rogue calls)

Queries yang sudah punya service file tapi caller tidak menggunakannya.

### 1.1 `assignmentService.ts` ← 2 query baru

**Caller:** `AssignmentGradebook.tsx:54` + `SpeedGrader.tsx:68,88`

```
AssignmentGradebook.tsx:54 → supabase.from('assignments').select(...).eq('tenant_id', tenantId)
SpeedGrader.tsx:68         → supabase.from('assignments').select('id, tenant_id').eq('id', assignmentId)
SpeedGrader.tsx:88         → supabase.from('assignment_submissions').select('submission_text')...
```

**Tambahkan ke `assignmentService.ts`:**

```ts
// Fetch all assignments for a tenant (used by AssignmentGradebook)
async getTeacherAssignments(tenantId: string): Promise<Assignment[]>

// Verify assignment exists and belongs to tenant (SpeedGrader auth check)
async getAssignmentById(assignmentId: string, tenantId?: string): Promise<Assignment | null>

// Fetch a single submission text (SpeedGrader inline view)
async getSubmissionText(assignmentId: string, studentId: string, tenantId?: string): Promise<string | null>
```

**Lalu update callers:**

- `AssignmentGradebook.tsx` — hapus `import { supabase }`, ganti `.from('assignments')` dengan `assignmentService.getTeacherAssignments(tenantId!)`
- `SpeedGrader.tsx` — hapus `import { supabase }`, ganti kedua `.from(...)` dengan `assignmentService.getAssignmentById()` dan `assignmentService.getSubmissionText()`

---

### 1.2 `classroomService.ts` ← 3 query baru

**Caller:** `useClassManagementState.ts:69,90,229` + `QuizManager.tsx:90`

```
useClassManagementState.ts:69  → supabase.from('enrollments').select('id', { count: 'exact' })...
useClassManagementState.ts:90  → supabase.from('enrollments').select('id, joined_at, student:profiles!...join')...
useClassManagementState.ts:229 → supabase.from('enrollments').update({ status: 'REMOVED' })...
QuizManager.tsx:90             → supabase.from('enrollments').select('*', { count: 'exact', head: true })...
```

**Tambahkan ke `classroomService.ts`:**

```ts
// Count active enrollments for a class
async getActiveEnrollmentCount(classId: string, tenantId: string): Promise<number>

// Fetch enrolled students with profile info (class management)
async getEnrolledStudents(classId: string, tenantId: string): Promise<EnrolledStudent[]>

// Remove a student from a class (soft delete)
async removeStudent(enrollmentId: string, removedBy: string): Promise<void>
```

**Lalu update callers:**

- `useClassManagementState.ts` — hapus `import { supabase }`, ganti 3 calls
- `QuizManager.tsx` — hapus `import { supabase }`, ganti enrollment count call

---

### 1.3 `lessonService.ts` ← 1 RPC + 1 query

**Caller:** `ScormPlayer.tsx:65` + `CourseBrowser.tsx:87`

```
ScormPlayer.tsx:65    → supabase.rpc('upsert_scorm_runtime', {...})
CourseBrowser.tsx:87  → supabase.from('profiles').select('full_name').eq('id', ...)
```

**Tambahkan ke `lessonService.ts`:**

```ts
// Persist SCORM runtime state (used by ScormPlayer)
async upsertScormRuntime(params: ScormRuntimeParams): Promise<void>
```

**Untuk `CourseBrowser.tsx:87`:** Query ke `profiles` untuk mendapatkan teacher name. Ini seharusnya di `courseService.ts` (enrichment di server-side) atau di-join saat fetch courses. Tambahkan:

```ts
// Fetch teacher display name for a course (CourseBrowser)
async getTeacherName(userId: string): Promise<string | null>
```

Atau lebih baik: extend `courseService.fetchCourses()` untuk join `profiles.full_name` sebagai `teacher_name` sehingga CourseBrowser tidak perlu query terpisah.

---

## Batch 2 — Create New Service Files (3 files baru)

### 2.1 `src/features/auth/api/authService.ts` (BARU)

**Caller:** `AuthContext.tsx:176,308,333` + `useLoginState.ts:70,92,118` + `WorkspaceSelector.tsx:55,91,124`

```
AuthContext.tsx:176            → supabase.rpc('ensure_profile_exists')
AuthContext.tsx:308            → supabase.rpc('accept_invitation', { p_token })
AuthContext.tsx:333            → supabase.rpc('enroll_student', { p_join_code })
useLoginState.ts:70            → supabase.rpc('validate_invitation', { p_token })
useLoginState.ts:92            → supabase.rpc('public_lookup_class', { p_join_code })
useLoginState.ts:118           → supabase.functions.invoke('check-rate-limit', {...})
WorkspaceSelector.tsx:55       → supabase.rpc('onboard_student_join_class', {...})
WorkspaceSelector.tsx:91,124   → supabase.rpc('create_school_tenant', {...})
```

**File baru: `src/features/auth/api/authService.ts`**

```ts
export const authService = {
  ensureProfileExists(): Promise<void>
  acceptInvitation(token: string): Promise<{ success: boolean }>
  enrollStudent(joinCode: string): Promise<void>
  validateInvitation(token: string): Promise<InvitationInfo | null>
  publicLookupClass(joinCode: string): Promise<ClassInfo | null>
  checkRateLimit(action: string, key: string, opts?: RateLimitOpts): Promise<RateLimitResult>
  onboardStudentJoinClass(params: JoinClassParams): Promise<void>
  createSchoolTenant(params: CreateTenantParams): Promise<{ tenant_id: string }>
}
```

**Keputusan:** Extract hanya 3 RPC calls ke authService. AuthContext tetap import supabase langsung untuk `onAuthStateChange` listener dan state management — ini diperlukan karena listener harus di-setup di context level.

`useLoginState.ts` (validate_invitation, public_lookup_class, check-rate-limit) dan `WorkspaceSelector.tsx` (onboard_student_join_class, create_school_tenant) semua pindah ke authService.

---

### 2.2 `src/features/settings/api/settingsService.ts` (BARU)

**Caller:** `Settings.tsx:87,116`

```
Settings.tsx:87  → supabase.from('profiles').update({ first_name, last_name })...
Settings.tsx:116 → supabase.auth.updateUser({ password: newPassword })
```

**File baru: `src/features/settings/api/settingsService.ts`**

```ts
export const settingsService = {
  updateProfile(userId: string, data: { firstName: string; lastName: string }): Promise<void>
  changePassword(newPassword: string): Promise<void>
}
```

---

### 2.3 Extend `administrationService.ts` ← audit + health queries

**Keputusan:** Extend file yang sudah ada (bukan buat baru). Audit adalah sub-domain administration.

**Caller:** `AuditDashboard.tsx:104` + `SystemHealth.tsx:49`

```
AuditDashboard.tsx:104 → supabase.rpc('get_audit_logs', { p_action, p_cursor, p_limit })
SystemHealth.tsx:49    → supabase.from('tenants').select('id').limit(1)
```

**Tambahkan ke `administrationService.ts`:**

```ts
async getAuditLogs(params: { action?: string; cursor?: string; limit: number }): Promise<AuditLog[]>
async healthCheck(): Promise<boolean>  // SELECT 1 from tenants — verifies DB connectivity
```

AuditDashboard.tsx:104 → supabase.rpc('get_audit_logs', { p_action, p_cursor, p_limit })
SystemHealth.tsx:49 → supabase.from('tenants').select('id').limit(1)

````

**File baru (atau extend `administrationService.ts`):**

```ts
// Option A: Buat file baru
export const auditService = {
  getAuditLogs(params: { action?: string; cursor?: string; limit: number }): Promise<AuditLog[]>
  healthCheck(): Promise<boolean>  // verifies DB connectivity
}

// Option B: Tambahkan ke administrationService.ts yang sudah ada
// (lebih sederhana, administrationService.ts sudah 100+ lines tapi masih manageable)
````

---

### 2.4 `src/features/creator/api/creatorService.ts` (BARU)

**Caller:** `Creator.tsx:182` + `Certificates.tsx:77`

```
Creator.tsx:182      → supabase.functions.invoke('generate-ai-content', { body: formData })
Certificates.tsx:77  → supabase.functions.invoke('generate-pdf', { body: ... })
```

**File baru: `src/features/creator/api/creatorService.ts`**

```ts
export const creatorService = {
  generateAIContent(formData: FormData): Promise<GeneratedContent>
}
```

Dan tambahkan `generatePdf` ke existing `gamificationService.ts` atau buat `certificateService.ts`:

```ts
export const certificateService = {
  generatePdf(params: CertificatePdfParams): Promise<Blob>
}
```

---

## Batch 3 — Enforcement (Prevent Future Rogue Calls)

### 3.1 ESLint Rule — `no-restricted-imports`

Tambahkan ke `.eslintrc.cjs` atau `eslint.config.js`:

```js
rules: {
  'no-restricted-imports': ['error', {
    paths: [{
      name: '@/src/services/supabase/client',
      // Hanya boleh diimport di src/features/*/api/** dan src/contexts/AuthContext.tsx
      message: 'Import supabase hanya dari service layer (src/features/*/api/). Lihat SERVICE_LAYER_PLAN.md.',
    }],
  }],
  // Override untuk files yang boleh:
  overrides: [{
    files: ['src/features/*/api/**', 'src/contexts/AuthContext.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  }],
}
```

**Catatan:** `AuthContext.tsx` tetap boleh import supabase langsung karena:

1. Ini singleton context yang di-render sekali
2. Supabase auth listener (`onAuthStateChange`) harus di sini
3. Mengextract ke authService.ts untuk RPC calls sudah cukup — listener tetap di context

### 3.2 Update AGENTS.md — Tambah rule baru

```markdown
### ❌ Jangan Lakukan

supabase.from() di pages/hooks/components → Gunakan service layer di features/\*/api/
```

---

## Execution Order

```
Batch 1 (1 hari):
  1.1 Extend assignmentService.ts + update AssignmentGradebook + SpeedGrader
  1.2 Extend classroomService.ts + update useClassManagementState + QuizManager
  1.3 Extend lessonService.ts + update ScormPlayer + CourseBrowser

Batch 2 (0.5 hari):
  2.1 Create authService.ts + update AuthContext + useLoginState + WorkspaceSelector
  2.2 Create settingsService.ts + update Settings.tsx
  2.3 Extend administrationService.ts + update AuditDashboard + SystemHealth
  2.4 Create creatorService.ts + update Creator.tsx + Certificates.tsx

Batch 3 (0.5 hari):
  3.1 ESLint rule no-restricted-imports
  3.2 Update AGENTS.md
  3.3 Update CHANGELOG.md
```

---

## Verification Checklist

Setelah semua batch selesai, run:

```bash
# Tidak boleh ada file di luar api/ yang import supabase client
grep -rn "from '@/src/services/supabase/client'" src/pages/ src/features/*/hooks/ src/features/*/components/

# Harus return 0 results (kecuali AuthContext.tsx)
grep -rn "from '@/src/services/supabase/client'" src/contexts/ | grep -v AuthContext
```

Target: **0 rogue imports** di luar service layer + `AuthContext.tsx`.
