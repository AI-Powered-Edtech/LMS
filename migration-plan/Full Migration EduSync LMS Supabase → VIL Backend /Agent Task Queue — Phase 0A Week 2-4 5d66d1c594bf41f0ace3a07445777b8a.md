# Agent Task Queue — Phase 0A Week 2-4

<aside>
🤖

**Untuk AI Coding Agents — Lanjutan Week 1.** Setiap task di bawah adalah **self-contained** — agent tinggal copas kode dan execute. Semua task mengikuti pattern yang sudah di-establish di Week 1 (Task 0A-1 sampai 0A-9). Prerequisite: **Week 1 HARUS sudah selesai** (semua 9 task DONE, `pnpm validate` pass).

</aside>

---

## Aturan untuk Agent

1. **JANGAN** ubah file di luar scope task
2. **JANGAN** gunakan `npm` atau `yarn` — gunakan `pnpm`
3. **Semua teks UI** harus Bahasa Indonesia
4. **Semua komponen** harus punya `dark:` Tailwind variants
5. Jalankan `pnpm typecheck && pnpm lint` setelah setiap task
6. **JANGAN** ubah `AGENTS.md`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`
7. **Pattern wajib:** Ganti `import { supabase } from '@/services/supabase/client'` → `import { getApiClient } from '@/services/api'`, lalu ganti setiap `supabase.` → `getApiClient().`
8. **JANGAN** sentuh `AuthContext.tsx`, `useSessionManagement.ts`, `useRoleResolution.ts`, `mfaService.ts` — itu Wave 0C (Week 4+)
9. **Test file WAJIB di-update (Gap #8 FIX)** — jika ada `*.test.ts` / `*.spec.ts` untuk file yang di-refactor, WAJIB (bukan opsional) update mock dari `vi.mock('@/services/supabase/client')` → `vi.mock('@/services/api', () => ({ getApiClient: vi.fn().mockReturnValue({ from: vi.fn()... }) }))`. Jalankan `pnpm vitest run --reporter=verbose -- <pattern>` setelah update.
10. **Commit SEBELUM mulai task (Gap #9 FIX)** — `git add -A && git commit -m "checkpoint: before task 0A-XX"`. Jika BLOCKED di tengah, rollback: `git checkout -- <file>` untuk revert ke state sebelum task. JANGAN lanjut ke task berikutnya dengan state setengah jadi.

<aside>
📝

**Source of Truth:** **6 Execution Contracts** di [Full Migration EduSync LMS: Supabase → VIL Backend — Plan & Strategi](../Full%20Migration%20EduSync%20LMS%20Supabase%20%E2%86%92%20VIL%20Backend%20%20ace54d0159584b0c8330eaad52e6e05b.md) adalah otoritas tertinggi. Contract 3 (Frontend Runtime Compatibility) adalah gate wajib sebelum Phase 2 dimulai. Phase 0 import inventory di Contract 3 mendefinisikan "done" per kategori file.

</aside>

---

## Git Branch Strategy (Wajib untuk Multi-Agent Paralel)

<aside>
🔀

**4 agent paralel WAJIB pakai branch terpisah.** Tanpa ini, merge conflict guaranteed.

</aside>

```
BRANCH STRATEGY:

1. BRANCH NAMING:
   • refactor/phase-0a-cluster-A
   • refactor/phase-0a-cluster-B
   • refactor/phase-0a-cluster-C
   • refactor/phase-0a-cluster-D
   Base: semua branch dari 'main' (setelah Week 1 merged)

2. MERGE ORDER (STRICT):
   main ← cluster-A ← cluster-B ← cluster-C ← cluster-D
   Setiap merge berikutnya HARUS rebase dulu dari main:
   • Merge cluster-A ke main
   • git checkout refactor/phase-0a-cluster-B && git rebase main
   • Merge cluster-B ke main
   • (ulangi untuk C, D)

3. CONFLICT RESOLUTION:
   • Jika conflict di file yang BUKAN scope cluster → BLOCKED, escalate
   • Jika conflict di shared import (barrel export, etc.) → accept BOTH imports
   • JANGAN resolve conflict di file yang bukan milik cluster Anda

4. PER-TASK COMMIT:
   • Sebelum mulai: git commit -m "checkpoint: before task 0A-XX"
   • Setelah selesai: git commit -m "refactor(0A-XX): migrate <file> to getApiClient()"
   • Jika BLOCKED: git checkout -- <files> untuk revert
```

---

## Dependency & Merge Order

<aside>
📋

**Merge order harus diikuti ketat.** Cluster bisa dikerjakan paralel ANTAR cluster, tapi task DALAM cluster harus sequential. Cluster E (verify) harus dikerjakan TERAKHIR setelah semua cluster selesai.

</aside>

```
DEPENDENCY GRAPH:

Week 1 (Task 0A-1 s/d 0A-9) ← PREREQUISITE (MUST BE DONE)
  │
  ├── Cluster A: Lessons & Course Builder (0A-10 → 0A-11 → 0A-12)
  │
  ├── Cluster B: Classroom & Attendance (0A-13 → 0A-14)  [parallel with A]
  │
  ├── Cluster C: Discussions & Notifications Read (0A-15 → 0A-16 → 0A-17)  [parallel with A, B]
  │
  ├── Cluster D: Parent, Calendar & Announcements (0A-18 → 0A-19 → 0A-20)  [parallel with A, B, C]
  │
  └── Cluster E: Cross-Cluster Verify (0A-21)  [AFTER all clusters done]

MERGE ORDER:
  1. Cluster A (lessons first — simplest CRUD, good POC)
  2. Cluster B (classroom + attendance)
  3. Cluster C (discussions + notifications read path)
  4. Cluster D (parent + calendar + announcements)
  5. Cluster E (final cross-cluster verify)

PARALLEL SAFE:
  • Cluster A, B, C, D bisa dikerjakan oleh 4 agent berbeda secara paralel
  • Tidak ada file overlap antar cluster
  • Setiap cluster punya verify sendiri
```

---

## Cluster A: Lessons & Course Builder

---

### Task 0A-10: Refactor lessonService.ts

- [ ] DONE

**TASK ID:** 0A-10

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `lessonService.ts` (+ test file jika ada) dengan `getApiClient()` singleton pattern.

**DEPENDENCY:** Task 0A-9 (Week 1 selesai)

**READ FIRST:**

- `src/services/api/apiClient.ts` (singleton pattern)
- `src/features/lessons/api/lessonService.ts` (file target)
- `src/features/lessons/api/lessonService.test.ts` (test file, jika ada)

**EDIT ONLY:**

- `src/features/lessons/api/lessonService.ts`
- `src/features/lessons/api/lessonService.test.ts` (jika ada — update mock)

**DO NOT TOUCH:**

- `src/services/supabase/client.ts`
- `src/services/api/*` (sudah selesai dari Week 1)
- File apapun di luar scope

**IMPLEMENTATION STEPS:**

1. Buka `src/features/lessons/api/lessonService.ts`
2. Cari baris: `import { supabase } from '@/services/supabase/client'`
3. Ganti dengan: `import { getApiClient } from '@/services/api'`
4. Di SETIAP method yang pakai `supabase.from(...)` atau `supabase.rpc(...)`, tambahkan `const db = getApiClient()` di awal method, lalu ganti `supabase.` → `db.`
5. Pastikan SEMUA method ter-refactor — jangan ada sisa `supabase.`

**COPY-PASTE STARTER:**

```tsx
// LANGKAH 1: Ganti import (di bagian atas file)
// SEBELUM:
import { supabase } from '@/services/supabase/client'
// SESUDAH:
import { getApiClient } from '@/services/api'

// LANGKAH 2: Di setiap method, tambahkan db = getApiClient()
// SEBELUM:
async fetchLessons(moduleId: string) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('order', { ascending: true })
  // ...
}
// SESUDAH:
async fetchLessons(moduleId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('lessons')
    .select('*')
    .eq('module_id', moduleId)
    .order('order', { ascending: true })
  // ...
}

// ULANGI pattern ini untuk SEMUA method dalam file.
```

1. **Test file (jika ada):** Cari `src/features/lessons/api/lessonService.test.ts` atau `*.spec.ts`
   - Ganti `vi.mock('@/services/supabase/client', ...)` → `vi.mock('@/services/api', ...)`
   - Update mock return: mock `getApiClient` yang return object dengan `.from()`, `.rpc()`, etc.
   - Contoh:

```tsx
// SEBELUM:
vi.mock('@/services/supabase/client', () => ({
  supabase: { from: vi.fn().mockReturnValue({ select: vi.fn()... }) }
}))
// SESUDAH:
vi.mock('@/services/api', () => ({
  getApiClient: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ select: vi.fn()... }) })
}))
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
pnpm test -- --filter=**/lessons/** --passWithNoTests
grep -n "from '@/services/supabase/client'" src/features/lessons/api/lessonService.ts
# Expected: 0 results
grep -n "supabase\." src/features/lessons/api/lessonService.ts
# Expected: 0 results (kecuali comment)
```

**STOP IF:**

- File import dari module lain yang belum di-refactor (coupling) → **BLOCKED**
- Ada pattern selain `.from()` / `.rpc()` (misalnya `.auth.`, `.storage.`, `.channel()`) → **BLOCKED**, catat pattern-nya
- `pnpm typecheck` gagal dengan error yang bukan di file ini → **BLOCKED**
- Test gagal setelah update mock → **BLOCKED**, catat error

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/lessons/api/lessonService.ts` (+ test file jika ada) / VERIFY: `pnpm typecheck && pnpm lint && pnpm test -- --filter=**/lessons/**`

---

### Task 0A-11: Refactor moduleService.ts (Course Builder)

**TASK ID:** 0A-11

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `moduleService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-10

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/course-builder/api/moduleService.ts`

**EDIT ONLY:**

- `src/features/course-builder/api/moduleService.ts`

**DO NOT TOUCH:**

- `src/features/course-builder/api/builderSyncService.ts` (realtime — Wave 0C)
- `src/features/course-builder/api/collaboratorService.ts`
- File apapun di luar scope

**IMPLEMENTATION STEPS:**

1. Buka `src/features/course-builder/api/moduleService.ts`
2. Ganti import `supabase` → `getApiClient` (pattern sama dengan Task 0A-10)
3. Di setiap method: `const db = getApiClient()` lalu ganti `supabase.` → `db.`
4. Jika ada `.rpc()` call, pattern tetap sama: `db.rpc('function_name', { params })`

**COPY-PASTE STARTER:**

```tsx
// GANTI import:
import { getApiClient } from '@/services/api'

// Di setiap method:
async fetchModules(courseId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('course_modules')
    .select('*')
    .eq('course_id', courseId)
    .order('order', { ascending: true })
  // ... rest unchanged
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/course-builder/api/moduleService.ts
# Expected: 0 results
```

**STOP IF:**

- Ada import dari `builderSyncService` yang pakai `supabase.channel()` → abaikan file itu, hanya refactor moduleService
- `pnpm typecheck` gagal di file lain → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/course-builder/api/moduleService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-12: Refactor lessonService.ts (Course Builder)

**TASK ID:** 0A-12

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di course-builder `lessonService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-11

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/course-builder/api/lessonService.ts`

**EDIT ONLY:**

- `src/features/course-builder/api/lessonService.ts`

**DO NOT TOUCH:**

- `src/features/lessons/api/lessonService.ts` (sudah selesai Task 0A-10)
- File lain di `course-builder/api/`

**IMPLEMENTATION STEPS:**

1. Buka `src/features/course-builder/api/lessonService.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di setiap method: `const db = getApiClient()` lalu ganti `supabase.` → `db.`
4. Jika ada `.rpc()` call, pattern tetap: `db.rpc('function_name', { params })`

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

// Pattern untuk setiap method:
async createLesson(moduleId: string, data: CreateLessonInput) {
  const db = getApiClient()
  const { data: lesson, error } = await db
    .from('lessons')
    .insert({ module_id: moduleId, ...data })
    .select()
    .single()
  // ... rest unchanged
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/course-builder/api/lessonService.ts
# Expected: 0 results

# Verify seluruh Cluster A:
grep -rn "from '@/services/supabase/client'" src/features/lessons/api/lessonService.ts src/features/course-builder/api/moduleService.ts src/features/course-builder/api/lessonService.ts
# Expected: 0 results total
```

**STOP IF:**

- Ada coupling ke `builderSyncService` atau realtime → **BLOCKED**
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/course-builder/api/lessonService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

## Cluster B: Classroom & Attendance

---

### Task 0A-13: Refactor classroomService.ts

**TASK ID:** 0A-13

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `classroomService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-9 (Week 1 selesai)

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/classroom/api/classroomService.ts`

**EDIT ONLY:**

- `src/features/classroom/api/classroomService.ts`

**DO NOT TOUCH:**

- Realtime subscription di file ini (jika ada `.channel()` atau `.on('postgres_changes', ...)`) → skip baris itu, hanya refactor `.from()` dan `.rpc()`
- File lain di `src/features/classroom/`

**IMPLEMENTATION STEPS:**

1. Buka `src/features/classroom/api/classroomService.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di setiap method yang pakai `.from()` atau `.rpc()`: `const db = getApiClient()` → ganti `supabase.` → `db.`
4. **PERHATIAN:** Jika ada method yang pakai `supabase.channel()` atau realtime subscription, **JANGAN** refactor baris itu — biarkan tetap pakai `supabase` langsung. Tambahkan comment: `// TODO: Wave 0C — migrate to RealtimeProvider`
5. Jika perlu keep both imports (satu `getApiClient` untuk CRUD, satu `supabase` untuk realtime), itu acceptable untuk saat ini.

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'
// Jika ada realtime yang belum bisa di-migrate:
import { supabase } from '@/services/supabase/client'  // TODO: Wave 0C — remove after realtime migration

// CRUD methods — pakai getApiClient():
async fetchClasses(tenantId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('classes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  // ...
}

// Realtime methods — BIARKAN pakai supabase langsung:
// subscribeToClassUpdates(classId: string) {
//   supabase.channel(...)  // TODO: Wave 0C — migrate to RealtimeProvider
// }
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
# Verify CRUD methods sudah pakai getApiClient:
grep -n "getApiClient" src/features/classroom/api/classroomService.ts
# Expected: >= 1 result

# Verify sisa supabase import hanya untuk realtime (jika ada):
grep -n "supabase\.from\|supabase\.rpc" src/features/classroom/api/classroomService.ts
# Expected: 0 results (semua .from() dan .rpc() sudah pakai db)
```

**STOP IF:**

- Semua method pakai realtime (tidak ada `.from()` / `.rpc()`) → **BLOCKED** (seharusnya tidak terjadi)
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/classroom/api/classroomService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-14: Refactor attendanceService.ts

**TASK ID:** 0A-14

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `attendanceService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-13

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/attendance/api/attendanceService.ts`

**EDIT ONLY:**

- `src/features/attendance/api/attendanceService.ts`

**DO NOT TOUCH:**

- File lain di `src/features/attendance/`
- QR attendance logic (jangan ubah business logic, hanya ganti import)

**IMPLEMENTATION STEPS:**

1. Buka `src/features/attendance/api/attendanceService.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di setiap method: `const db = getApiClient()` → ganti `supabase.` → `db.`

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

async recordAttendance(classId: string, studentId: string, status: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('attendance')
    .insert({ class_id: classId, student_id: studentId, status })
    .select()
    .single()
  // ...
}

async fetchAttendanceRecords(classId: string, date: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('attendance')
    .select('*')
    .eq('class_id', classId)
    .eq('date', date)
  // ...
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/attendance/api/attendanceService.ts
# Expected: 0 results

# Verify seluruh Cluster B:
grep -rn "from '@/services/supabase/client'" src/features/classroom/api/classroomService.ts src/features/attendance/api/attendanceService.ts | grep -v "TODO: Wave 0C"
# Expected: 0 results (kecuali realtime TODO)
```

**STOP IF:**

- Ada `.storage.` call (file upload untuk QR) → catat, refactor hanya `.from()` / `.rpc()`
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/attendance/api/attendanceService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

## Cluster C: Discussions & Notifications Read Path

---

### Task 0A-15: Refactor discussionService.ts

**TASK ID:** 0A-15

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `discussionService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-9 (Week 1 selesai)

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/discussions/api/discussionService.ts`

**EDIT ONLY:**

- `src/features/discussions/api/discussionService.ts`

**DO NOT TOUCH:**

- `src/features/discussions/api/discussionQueries.ts` (mungkin ada realtime subscription — Wave 0C)
- File lain di `src/features/discussions/`

**IMPLEMENTATION STEPS:**

1. Buka `src/features/discussions/api/discussionService.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di setiap method: `const db = getApiClient()` → ganti `supabase.` → `db.`
4. Jika file ini juga punya realtime (`.channel()`, `.on('postgres_changes', ...)`), biarkan pakai `supabase` langsung + comment `// TODO: Wave 0C`

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

async createThread(courseId: string, data: CreateThreadInput) {
  const db = getApiClient()
  const { data: thread, error } = await db
    .from('discussion_threads')
    .insert({ course_id: courseId, ...data })
    .select()
    .single()
  // ...
}

async fetchThreads(courseId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('discussion_threads')
    .select('*, discussion_posts(count)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })
  // ...
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "supabase\.from\|supabase\.rpc" src/features/discussions/api/discussionService.ts
# Expected: 0 results
```

**STOP IF:**

- Seluruh file adalah realtime subscriptions tanpa CRUD → **BLOCKED**
- Ada coupling ke `AuthContext` atau `useAuth()` → **BLOCKED** (seharusnya tidak di service file)

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/discussions/api/discussionService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-16: Refactor commentService.ts (Discussions)

**TASK ID:** 0A-16

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `commentService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-15

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/discussions/api/commentService.ts`

**EDIT ONLY:**

- `src/features/discussions/api/commentService.ts`

**DO NOT TOUCH:**

- `src/features/discussions/api/discussionService.ts` (sudah selesai Task 0A-15)
- File lain

**IMPLEMENTATION STEPS:**

1. Buka `src/features/discussions/api/commentService.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di setiap method: `const db = getApiClient()` → ganti `supabase.` → `db.`

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

async createComment(threadId: string, data: CreateCommentInput) {
  const db = getApiClient()
  const { data: comment, error } = await db
    .from('discussion_posts')
    .insert({ thread_id: threadId, ...data })
    .select()
    .single()
  // ...
}

async fetchComments(threadId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('discussion_posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })
  // ...
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/discussions/api/commentService.ts
# Expected: 0 results
```

**STOP IF:**

- File tidak ada → cari nama alternatif (`postService.ts`, `replyService.ts`) → catat nama sebenarnya
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/discussions/api/commentService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-17: Refactor notificationService.ts (Read Path Only)

**TASK ID:** 0A-17

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti direct Supabase imports di notification service — **HANYA read path** (fetch notifications, mark as read). Jangan sentuh realtime subscription atau push notification.

**DEPENDENCY:** Task 0A-16

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/notifications/api/notificationService.ts` (atau `notificationApi.ts`)
- Scan: `ls src/features/notifications/api/` untuk lihat semua file

**EDIT ONLY:**

- `src/features/notifications/api/notificationService.ts` (atau file utama notification CRUD)

**DO NOT TOUCH:**

- `src/features/notifications/hooks/useNotifications.ts` (realtime — Wave 0C)
- `src/features/notifications/hooks/useAdminNotifications.ts` (realtime — Wave 0C)
- `src/features/notifications/api/digestApi.ts` (Edge Function invoke — Phase 3)
- Push notification logic

**IMPLEMENTATION STEPS:**

1. Buka file notification service utama
2. Ganti import `supabase` → `getApiClient` untuk method CRUD:
   - `fetchNotifications` / `getNotifications` → refactor
   - `markAsRead` / `markAllAsRead` → refactor
   - `getUnreadCount` → refactor
3. Jika ada method yang pakai `supabase.functions.invoke()` (Edge Function) → **JANGAN** refactor, tambahkan comment `// TODO: Phase 3 — migrate Edge Function`
4. Jika ada method yang pakai `supabase.channel()` → **JANGAN** refactor, tambahkan comment `// TODO: Wave 0C — migrate to RealtimeProvider`

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'
// Keep supabase import ONLY jika ada realtime/Edge Function methods:
import { supabase } from '@/services/supabase/client'  // TODO: Wave 0C + Phase 3 — remove

// READ methods — refactor ke getApiClient():
async fetchNotifications(userId: string, tenantId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)
  // ...
}

async markAsRead(notificationId: string) {
  const db = getApiClient()
  const { error } = await db
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
  // ...
}

async getUnreadCount(userId: string, tenantId: string) {
  const db = getApiClient()
  const { count, error } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('read', false)
  // ...
}

// REALTIME — JANGAN refactor:
// subscribeToNotifications() {
//   supabase.channel(...)  // TODO: Wave 0C — migrate to RealtimeProvider
// }

// EDGE FUNCTION — JANGAN refactor:
// sendDigest() {
//   supabase.functions.invoke('send-email-digest', ...)  // TODO: Phase 3
// }
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
# Verify CRUD pakai getApiClient:
grep -n "getApiClient" src/features/notifications/api/notificationService.ts
# Expected: >= 1 result

# Verify tidak ada sisa .from() pakai supabase langsung:
grep -n "supabase\.from\|supabase\.rpc" src/features/notifications/api/notificationService.ts
# Expected: 0 results

# OK jika masih ada supabase.channel atau supabase.functions:
grep -n "supabase\.channel\|supabase\.functions" src/features/notifications/api/notificationService.ts
# Expected: 0 atau beberapa (realtime/Edge Function — will be migrated later)

# Verify seluruh Cluster C:
grep -rn "supabase\.from\|supabase\.rpc" src/features/discussions/api/discussionService.ts src/features/discussions/api/commentService.ts src/features/notifications/api/notificationService.ts
# Expected: 0 results
```

**STOP IF:**

- Semua notification methods pakai Edge Function / realtime → **BLOCKED** (nothing to refactor in this wave)
- File structure berbeda dari expected → catat nama file sebenarnya, adjust
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/notifications/api/notificationService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

## Cluster D: Parent, Calendar & Announcements

---

### Task 0A-18: Refactor parentApi.ts

**TASK ID:** 0A-18

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `parentApi.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-9 (Week 1 selesai)

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/parent/api/parentApi.ts`
- Scan: `ls src/features/parent/api/` untuk lihat semua file

**EDIT ONLY:**

- `src/features/parent/api/parentApi.ts`

**DO NOT TOUCH:**

- `src/features/parent/hooks/useParentNotifications.ts` (mungkin ada realtime — Wave 0C)
- File hooks lainnya di parent

**IMPLEMENTATION STEPS:**

1. Buka `src/features/parent/api/parentApi.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di setiap method: `const db = getApiClient()` → ganti `supabase.` → `db.`
4. Jika ada `.functions.invoke()` (Edge Function) → **JANGAN** refactor, comment `// TODO: Phase 3`

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

async fetchChildProgress(parentId: string, childId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('student_progress')
    .select('*')
    .eq('student_id', childId)
  // ...
}

async fetchChildren(parentId: string, tenantId: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('parent_student_relations')
    .select('*, profiles!student_id(*)')
    .eq('parent_id', parentId)
    .eq('tenant_id', tenantId)
  // ...
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "supabase\.from\|supabase\.rpc" src/features/parent/api/parentApi.ts
# Expected: 0 results
```

**STOP IF:**

- File tidak ada → cari alternatif (`parentService.ts`) → catat nama sebenarnya
- Majority of methods pakai Edge Function → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/parent/api/parentApi.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-19: Refactor calendarService.ts

- [ ] DONE

**TASK ID:** 0A-19

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `calendarService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-18

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/calendar/api/calendarService.ts`
- Scan: `ls src/features/calendar/api/`

**EDIT ONLY:**

- `src/features/calendar/api/calendarService.ts`
- `src/features/calendar/api/calendarService.test.ts` (jika ada — update mock)

**DO NOT TOUCH:**

- `src/features/calendar/api/calendarEventService.ts` (task berikutnya)
- File lain di `src/features/calendar/`

**IMPLEMENTATION STEPS:**

1. Buka `calendarService.ts` — ganti import, refactor semua `.from()` / `.rpc()`
2. Update test file jika ada (mock pattern sama seperti Task 0A-10)

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

async fetchEvents(tenantId: string, startDate: string, endDate: string) {
  const db = getApiClient()
  const { data, error } = await db
    .from('calendar_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('start_date', startDate)
    .lte('end_date', endDate)
    .order('start_date', { ascending: true })
  // ...
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
pnpm test -- --filter=**/calendar/** --passWithNoTests
grep -n "from '@/services/supabase/client'" src/features/calendar/api/calendarService.ts
# Expected: 0 results
```

**STOP IF:**

- File name berbeda dari expected → scan directory, adjust
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/calendar/api/calendarService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-19b: Refactor calendarEventService.ts

- [ ] DONE

**TASK ID:** 0A-19b

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `calendarEventService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-19

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/calendar/api/calendarEventService.ts`

**EDIT ONLY:**

- `src/features/calendar/api/calendarEventService.ts`
- `src/features/calendar/api/calendarEventService.test.ts` (jika ada — update mock)

**DO NOT TOUCH:**

- `src/features/calendar/api/calendarService.ts` (sudah selesai Task 0A-19)
- File lain

**IMPLEMENTATION STEPS:**

1. Buka `calendarEventService.ts` — ganti import, refactor semua `.from()` / `.rpc()`
2. Update test file jika ada

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

async createEvent(data: CreateEventInput) {
  const db = getApiClient()
  const { data: event, error } = await db
    .from('calendar_events')
    .insert(data)
    .select()
    .single()
  // ...
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
pnpm test -- --filter=**/calendar/** --passWithNoTests
grep -n "from '@/services/supabase/client'" src/features/calendar/api/calendarEventService.ts
# Expected: 0 results
```

**STOP IF:**

- File tidak ada → catat
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/calendar/api/calendarEventService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-20: Refactor announcementService.ts

**TASK ID:** 0A-20

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `announcementService.ts` dengan `getApiClient()` singleton.

**DEPENDENCY:** Task 0A-19

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/features/announcements/api/announcementService.ts`
- Scan: `ls src/features/announcements/api/`

**EDIT ONLY:**

- `src/features/announcements/api/announcementService.ts`

**DO NOT TOUCH:**

- File lain

**IMPLEMENTATION STEPS:**

1. Buka `src/features/announcements/api/announcementService.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di setiap method: `const db = getApiClient()` → ganti `supabase.` → `db.`

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

async fetchAnnouncements(tenantId: string, classId?: string) {
  const db = getApiClient()
  let query = db
    .from('announcements')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (classId) {
    query = query.eq('class_id', classId)
  }

  const { data, error } = await query
  // ...
}

async createAnnouncement(data: CreateAnnouncementInput) {
  const db = getApiClient()
  const { data: announcement, error } = await db
    .from('announcements')
    .insert(data)
    .select()
    .single()
  // ...
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
grep -n "from '@/services/supabase/client'" src/features/announcements/api/announcementService.ts
# Expected: 0 results

# Verify seluruh Cluster D:
grep -rn "supabase\.from\|supabase\.rpc" src/features/parent/api/parentApi.ts src/features/calendar/api/calendarService.ts src/features/calendar/api/calendarEventService.ts src/features/announcements/api/announcementService.ts
# Expected: 0 results
```

**STOP IF:**

- File tidak ada → cari alternatif → catat
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/features/announcements/api/announcementService.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

## Cluster E: Cross-Cluster Verification

---

### Task 0A-21: Full Cross-Cluster Verify + Supabase Import Audit

**TASK ID:** 0A-21

**OWNER TYPE:** verify-agent

**GOAL:** Verify semua cluster A-D selesai. Audit remaining Supabase imports. Hasilkan laporan.

**DEPENDENCY:** Task 0A-12 (Cluster A), 0A-14 (Cluster B), 0A-17 (Cluster C), 0A-20 (Cluster D) — SEMUA harus DONE

**READ FIRST:**

- Semua file yang sudah di-refactor (Task 0A-10 s/d 0A-20)

**EDIT ONLY:**

- Tidak ada file yang di-edit. Task ini hanya verifikasi.

**DO NOT TOUCH:**

- Semua file.

**IMPLEMENTATION STEPS:**

1. Run full verify suite
2. Audit remaining Supabase imports di seluruh `src/features/`
3. Hasilkan laporan: berapa file sudah refactored, berapa sisa

**COPY-PASTE STARTER:**

```bash
#!/bin/bash
set -e

echo "=== STEP 1: Full Build Verify ==="
pnpm typecheck
pnpm lint
pnpm test:ci

echo ""
echo "=== STEP 2: Refactored Files Audit (should have 0 supabase.from/rpc) ==="
echo "--- Cluster A: Lessons & Course Builder ---"
grep -c "supabase\.from\|supabase\.rpc" src/features/lessons/api/lessonService.ts || echo "✅ lessonService.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/course-builder/api/moduleService.ts || echo "✅ moduleService.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/course-builder/api/lessonService.ts || echo "✅ builder/lessonService.ts clean"

echo "--- Cluster B: Classroom & Attendance ---"
grep -c "supabase\.from\|supabase\.rpc" src/features/classroom/api/classroomService.ts || echo "✅ classroomService.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/attendance/api/attendanceService.ts || echo "✅ attendanceService.ts clean"

echo "--- Cluster C: Discussions & Notifications ---"
grep -c "supabase\.from\|supabase\.rpc" src/features/discussions/api/discussionService.ts || echo "✅ discussionService.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/discussions/api/commentService.ts || echo "✅ commentService.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/notifications/api/notificationService.ts || echo "✅ notificationService.ts clean"

echo "--- Cluster D: Parent, Calendar, Announcements ---"
grep -c "supabase\.from\|supabase\.rpc" src/features/parent/api/parentApi.ts || echo "✅ parentApi.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/calendar/api/calendarService.ts || echo "✅ calendarService.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/calendar/api/calendarEventService.ts || echo "✅ calendarEventService.ts clean"
grep -c "supabase\.from\|supabase\.rpc" src/features/announcements/api/announcementService.ts || echo "✅ announcementService.ts clean"

echo ""
echo "=== STEP 3: Remaining Supabase Imports in features/ ==="
echo "Total files still importing supabase client directly:"
grep -rl "from '@/services/supabase/client'" src/features/ | wc -l
echo ""
echo "Files:"
grep -rl "from '@/services/supabase/client'" src/features/ || echo "(none — all clean!)"

echo ""
echo "=== STEP 4: Week 1 + Week 2-4 Refactored Count ==="
echo "Week 1: courseService.ts (1 file)"
echo "Week 2-4: 12 files (Cluster A: 3, B: 2, C: 3, D: 4)"
echo "Total refactored: 13 service files"
echo ""

echo "=== STEP 5: Build ==="
pnpm build

echo ""
echo "=== ALL VERIFY PASSED ==="
```

**VERIFY:**

```
# Script di atas harus print "ALL VERIFY PASSED" tanpa error
# pnpm typecheck = 0 errors
# pnpm lint = no new errors
# pnpm test:ci = all tests pass
# pnpm build = success
# Semua 12 file refactored = 0 supabase.from/rpc matches
```

**STOP IF:**

- `pnpm typecheck` gagal → catat error, report BLOCKED
- `pnpm test:ci` gagal dengan test yang related ke refactored files → report regression
- Ada file yang seharusnya sudah di-refactor tapi masih punya `supabase.from` → report incomplete

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: (none) / VERIFY: full script output

---

## Cluster F: Utilities & CI Guard (Setelah Cluster E)

---

### Task 0A-22: Refactor offlineQueue.ts

- [ ] DONE

**TASK ID:** 0A-22

**OWNER TYPE:** refactor-agent

**GOAL:** Ganti semua direct Supabase imports di `offlineQueue.ts` dengan `getApiClient()` singleton. File ini disebut eksplisit di Main Plan CC6 sebagai file yang HARUS di-refactor di Phase 0.

**DEPENDENCY:** Task 0A-21 (Cluster E selesai)

**READ FIRST:**

- `src/services/api/apiClient.ts`
- `src/utils/offlineQueue.ts`
- `src/utils/offlineStorage.ts` (mungkin ada coupling)

**EDIT ONLY:**

- `src/utils/offlineQueue.ts`
- `src/utils/offlineQueue.test.ts` (jika ada — update mock)

**DO NOT TOUCH:**

- `src/utils/offlineStorage.ts` (IndexedDB layer — tidak pakai Supabase)
- `src/features/xapi/api/xapiQueue.ts` (Wave 0B-3)
- File lain

**IMPLEMENTATION STEPS:**

1. Buka `src/utils/offlineQueue.ts`
2. Ganti import `supabase` → `getApiClient`
3. Di `processOperation()` dan method lain yang pakai `supabase.from()` / `supabase.rpc()`: `const db = getApiClient()` → ganti `supabase.` → `db.`
4. **PERHATIAN:** `offlineQueue.ts` punya retry logic dan idempotency keys — JANGAN ubah business logic, hanya ganti import/client
5. Update test file jika ada

**COPY-PASTE STARTER:**

```tsx
import { getApiClient } from '@/services/api'

// Di processOperation():
async processOperation(operation: QueuedOperation) {
  const db = getApiClient()
  switch (operation.type) {
    case 'insert':
      return await db.from(operation.table).insert(operation.data)
    case 'update':
      return await db.from(operation.table).update(operation.data).eq('id', operation.id)
    case 'rpc':
      return await db.rpc(operation.fn, operation.params)
    // ... rest unchanged
  }
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
pnpm test -- --filter=**/utils/** --passWithNoTests
grep -n "from '@/services/supabase/client'" src/utils/offlineQueue.ts
# Expected: 0 results
```

**STOP IF:**

- `offlineStorage.ts` juga pakai Supabase → catat, refactor hanya offlineQueue
- Retry/idempotency logic breaks setelah refactor → **BLOCKED**
- `pnpm typecheck` gagal → **BLOCKED**

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `src/utils/offlineQueue.ts` / VERIFY: `pnpm typecheck && pnpm lint`

---

### Task 0A-23: Enable ESLint CI Guard (no-restricted-imports → error)

- [ ] DONE

**TASK ID:** 0A-23

**OWNER TYPE:** config-agent

**GOAL:** Upgrade ESLint `no-restricted-imports` rule dari `warn` → `error` untuk `@/services/supabase/client` di `src/features/`, `src/utils/`, `src/components/`. Ini mencegah regresi setelah abstraction selesai (sesuai Main Plan Phase 0G).

**DEPENDENCY:** Task 0A-22

**READ FIRST:**

- `eslint.config.js` (atau `eslint.config.mjs` / `.eslintrc.*`)

**EDIT ONLY:**

- `eslint.config.js` (atau file ESLint config yang dipakai)

**DO NOT TOUCH:**

- File lain

**IMPLEMENTATION STEPS:**

1. Buka ESLint config file
2. Cari rule `no-restricted-imports` yang sudah ada (seharusnya `warn` level)
3. Ganti severity dari `warn` → `error` untuk pattern `@/services/supabase/client`
4. Jika rule belum ada, tambahkan:

**COPY-PASTE STARTER:**

```jsx
// Di eslint.config.js, tambahkan/update rule:
{
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@/services/supabase/client'],
          message: 'Gunakan getApiClient() dari @/services/api. Direct Supabase imports tidak diperbolehkan di features/, utils/, components/. Lihat docs/api-abstraction-pattern.md.'
        }
      ]
    }]
  },
  // Apply hanya ke src/features/, src/utils/, src/components/
  // (src/services/api/supabaseApiClient.ts tetap boleh import supabase)
}
```

**VERIFY:**

```
pnpm typecheck
pnpm lint
# Verify rule aktif:
echo "import { supabase } from '@/services/supabase/client'" > /tmp/test-lint.ts
pnpm lint /tmp/test-lint.ts 2>&1 | grep -i "restricted\|error"
# Expected: error tentang restricted imports
rm /tmp/test-lint.ts

# Verify supabaseApiClient.ts TIDAK kena rule:
pnpm lint src/services/api/supabaseApiClient.ts
# Expected: no errors
```

**STOP IF:**

- ESLint config format tidak standard → catat format, adjust
- Rule menyebabkan `supabaseApiClient.ts` juga error → perlu exclude path, adjust config
- `pnpm lint` gagal di file yang BELUM di-refactor (hooks, queries, etc.) → **EXPECTED** — ini menunjukkan rule bekerja. Catat daftar file yang masih violating untuk Wave berikutnya. Set rule ke `warn` untuk sementara jika terlalu banyak violations, lalu upgrade ke `error` setelah semua file di-refactor.

**OUTPUT FORMAT:** DONE / BLOCKED / FILES: `eslint.config.js` / VERIFY: `pnpm lint`

---

## Scope Clarification: Hooks, Queries & Utils yang Masih Bocor

<aside>
🚨

**PENTING:** Week 2-4 ini HANYA meng-cover `api/*.ts` service files (layer paling bawah). Main Plan Phase 0G secara eksplisit menyebut bahwa Supabase imports juga bocor ke:

- `src/features/**/hooks/` — e.g. `useParentNotifications.ts`, `useNotifications.ts`, `useChildActivityHistory.ts`
- `src/features/**/queries/` — e.g. `notificationQueries.ts`
- `src/utils/` — e.g. `offlineQueue.ts` (Task 0A-22 di atas), `offlineStorage.ts`
- `src/components/` — scan for inline queries

File-file ini akan di-cover di wave berikutnya. **Jangan anggap Phase 0 selesai hanya karena service files sudah clean.**

</aside>

### Roadmap Coverage: 117+ Files

| **Wave**                   | **Scope**                                                                                                                                                                                                              | **File Count**        | **Status**                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| Week 1 (0A-1 s/d 0A-9)     | API foundation + courseService.ts POC                                                                                                                                                                                  | ~7 new + 1 refactored | ⬜ Prerequisite                                        |
| **Week 2-4 (dokumen ini)** | **Service files (api/\*.ts) — Cluster A-F**                                                                                                                                                                            | **~13 service files** | ⬜ Current wave                                        |
| Wave 0B-2 (Week 5-6)       | RPC-heavy services: onboarding, dashboards, quizzes, gradebook, gamification                                                                                                                                           | ~6 files              | ⬜ Next                                                |
| Wave 0B-3 (Week 6-7)       | Remaining CRUD: profile, settings, certificates, progress, xapi, search, moderation, finance, reports, administration, principal, surveys                                                                              | ~15+ files            | ⬜                                                     |
| Wave 0B-4 (Week 7-8)       | **Hooks & queries yang import Supabase langsung** — `useNotifications.ts`, `notificationQueries.ts`, `useParentNotifications.ts`, `useChildActivityHistory.ts`, dll. (hanya refactor `.from()/.rpc()`, realtime stays) | ~20-30 files          | ⬜                                                     |
| Wave 0B-5 (Week 8)         | **Utils & components** yang import Supabase — `offlineQueue.ts` (done 0A-22), `offlineStorage.ts`, inline queries di components                                                                                        | ~5-10 files           | ⬜                                                     |
| Wave 0C (Week 8-9)         | Auth abstraction: AuthProvider, SupabaseAuthProvider, VilAuthProvider, AuthContext.tsx                                                                                                                                 | ~4 new + 3 refactored | ⬜                                                     |
| Wave 0D (Week 9-10)        | Realtime (9 hooks) + Storage (5 files) abstraction                                                                                                                                                                     | ~14 files             | ⬜                                                     |
| Wave 0E (Week 10)          | CI guard enforce (error) + final sweep + E2E verify                                                                                                                                                                    | ~2 config files       | ⬜                                                     |
| **TOTAL**                  |                                                                                                                                                                                                                        | **~90-110 files**     | Covers 117+ imports (some files have multiple imports) |

---

## Acceptance Criteria per Cluster

| **Cluster**                        | **Tasks**                   | **Acceptance Criteria**                                                                                                                                                                                                 | **Sign-off** |
| ---------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| A: Lessons & Builder               | 0A-10, 0A-11, 0A-12         | `grep -rn "supabase\.from\|supabase\.rpc" src/features/lessons/api/ src/features/course-builder/api/moduleService.ts src/features/course-builder/api/lessonService.ts` = 0 results + `pnpm typecheck && pnpm lint` pass | • [ ]        |
| B: Classroom & Attendance          | 0A-13, 0A-14                | `grep -rn "supabase\.from\|supabase\.rpc" src/features/classroom/api/ src/features/attendance/api/` = 0 results + `pnpm typecheck && pnpm lint` pass                                                                    | • [ ]        |
| C: Discussions & Notifications     | 0A-15, 0A-16, 0A-17         | `grep -rn "supabase\.from\|supabase\.rpc" src/features/discussions/api/ src/features/notifications/api/notificationService.ts` = 0 results + `pnpm typecheck && pnpm lint` pass                                         | • [ ]        |
| D: Parent, Calendar, Announcements | 0A-18, 0A-19, 0A-19b, 0A-20 | `grep -rn "supabase\.from\|supabase\.rpc" src/features/parent/api/ src/features/calendar/api/ src/features/announcements/api/` = 0 results + `pnpm typecheck && pnpm lint` pass                                         | • [ ]        |
| E: Cross-Cluster Verify            | 0A-21                       | `pnpm validate` • `pnpm build` • full audit script pass                                                                                                                                                                 | • [ ]        |
| F: Utils & CI Guard                | 0A-22, 0A-23                | `offlineQueue.ts` clean + ESLint `no-restricted-imports` active (warn or error)                                                                                                                                         | • [ ]        |

---

## Catatan untuk Agent Selanjutnya (Week 5+)

Setelah Task 0A-10 sampai 0A-23 selesai, wave berikutnya harus:

1. **Wave 0B-2 (Week 5-6):** Refactor RPC-heavy services:
   - `src/features/onboarding/api/onboardingService.ts` (2 RPCs)
   - `src/features/dashboards/api/dashboardService.ts` (4 RPCs)
   - `src/features/quizzes/api/quizBuilderService.ts` (1 RPC)
   - `src/features/quizzes/api/quizCRUD.ts`
   - `src/features/gradebook/api/gradebookService.ts`
   - `src/features/gamification/api/gamificationService.ts`
2. **Wave 0B-3 (Week 6-7):** Refactor remaining CRUD services:
   - `src/features/profile/api/profilePreferences.ts`
   - `src/features/settings/api/settingsService.ts`
   - `src/features/certificates/api/certificateService.ts`
   - `src/features/progress/api/trackingService.ts`
   - `src/features/xapi/api/xapiService.ts`
   - `src/features/search/api/searchService.ts`
   - `src/features/moderation/api/moderationService.ts`
   - `src/features/finance/api/financeApi.ts`
   - `src/features/reports/api/reportService.ts`
   - `src/features/administration/api/administrationService.ts`
   - `src/features/administration/api/adminUserService.ts`
   - `src/features/administration/api/bulkImportService.ts`
   - `src/features/principal/api/executiveApi.ts`
   - `src/features/surveys/api/surveyApi.ts`
3. **Wave 0B-4 (Week 7-8):** Refactor hooks & queries yang import Supabase langsung:
   - `src/features/notifications/hooks/useNotifications.ts` (hanya `.from()/.rpc()`, keep realtime)
   - `src/features/notifications/queries/notificationQueries.ts`
   - `src/features/parent/hooks/useParentNotifications.ts`
   - `src/features/parent/hooks/useChildActivityHistory.ts`
   - Full scan: `grep -rl "from '@/services/supabase/client'" src/features/**/hooks/ src/features/**/queries/`
4. **Wave 0B-5 (Week 8):** Refactor remaining utils & components:
   - `src/utils/offlineStorage.ts` (jika pakai Supabase)
   - Scan: `grep -rl "from '@/services/supabase/client'" src/utils/ src/components/`
5. **Wave 0C (Week 8-9, SETELAH semua .from()/.rpc() files selesai):** Auth abstraction:
   - `AuthProvider` interface
   - `SupabaseAuthProvider` implementation
   - `VilAuthProvider` stub
   - `AuthContext.tsx` refactor → ini **paling kritis dan paling berisiko**
6. **Wave 0D (Week 9-10):** Realtime + Storage abstraction
7. **Wave 0E (Week 10):** CI guard enforce (error level) + final import audit + E2E verify

<aside>
⚠️

**JANGAN mulai Wave 0C (auth) sebelum semua service files, hooks, queries, dan utils selesai.** Auth abstraction punya blast radius terbesar dan harus dilakukan terakhir di Phase 0.

</aside>
