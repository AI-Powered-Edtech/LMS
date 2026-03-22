# EduSync LMS — Performance Implementation Plan
> Dibuat: 2026-03-22 | Untuk dieksekusi oleh Claude Code / agent
> Jangan tanya konfirmasi — execute langsung per sprint, commit per sprint.

## Konteks
Phase ini melanjutkan audit performance yang sudah dilakukan. Lima fix utama sudah selesai:
- ✅ useMemo di Analytics.tsx
- ✅ .limit() + explicit columns di gamificationService, quizPlayer, courseService, analyticsService
- ✅ MotionConfig reducedMotion="user" di App.tsx
- ✅ Skeleton screens di 7 halaman (Assignments, AssignmentGradebook, Calendar, Courses, TeacherDashboard, Announcements, ModerationDashboard)
- ✅ Notifications staleTime 30s → 5min, prefetch 5 → 24 routes

**Yang tersisa dan harus dikerjakan di plan ini (Sprint P1–P4).**

---

## Tech Stack
- React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4
- Supabase JS v2, React Query v5, Zustand v5
- `motion` v12 (bukan framer-motion)
- Hash routing `/#/`
- Semua UI text harus **Bahasa Indonesia**

## Rules (dari CLAUDE.md)
- Jangan pakai `select('*')` — selalu explicit columns
- Jangan hardcode user ID / tenant ID
- Semua query harus ada `.limit()` atau pagination
- Gunakan `useAuth()` untuk identity
- TypeScript harus compile clean: `./node_modules/.bin/tsc --noEmit`
- Tidak perlu tanya konfirmasi — langsung kerjakan

---

## Sprint P1 — useMemo untuk Sisa Chart Pages
**Goal:** 4 halaman lagi yang punya inline `.map()` untuk chart data tapi belum di-wrap useMemo.
**Waktu estimasi:** 20 menit
**Commit:** `perf(memo): wrap chart data transformations in useMemo`

### Files to fix

#### `src/pages/CourseAnalytics.tsx`
- Baca file, cari semua pattern `const xxxData = data?.something?.map(...)` yang dipakai sebagai prop `data={}` di komponen Recharts
- Wrap setiap transformasi dengan `useMemo(() => ..., [dependency])`
- Import `useMemo` dari 'react' jika belum ada
- Deps harus spesifik (bukan `[]`) — gunakan variabel source data yang di-query

#### `src/pages/StudentProgress.tsx`
- Cari array `.map()` yang dipakai untuk chart data (bukan render list)
- Pattern: `const chartData = attempts.map(a => ({ name: ..., value: ... }))`
- Wrap dengan `useMemo(() => ..., [attempts])`

#### `src/pages/QuizGradebook.tsx`
- Cari `filteredAttempts.map(...)` dan `questionDifficulty.map(...)` yang dipakai di chart
- Baca file dulu untuk memastikan mana yang chart data vs render list
- Hanya wrap yang dipakai sebagai `data={}` prop Recharts

#### `src/pages/TeacherDashboard.tsx`
- Cari inline data transformations untuk recharts
- Kalau tidak ada yang obvious, cek apakah ada `data={someArray.map(...)}` langsung di JSX — pindah ke useMemo

### Verification
```bash
./node_modules/.bin/tsc --noEmit
# harus 0 error
```

---

## Sprint P2 — Skeleton Screens: 24 Halaman Tersisa
**Goal:** Semua halaman yang fetch data harus tampilkan skeleton saat loading.
**Waktu estimasi:** 45 menit
**Commit:** `perf(ux): add skeleton screens to 24 remaining pages`

### Pattern yang harus dipakai

```tsx
// 1. Import di atas file
import { XxxSkeleton } from '@/src/features/xxx/components/XxxSkeleton'

// 2. Setelah semua hook calls, sebelum main return:
if (isLoading) return <XxxSkeleton />
// atau jika ada multiple loading states:
if (isLoading || coursesLoading) return <XxxSkeleton />
```

**PENTING:** Baca dulu isi skeleton component untuk memastikan tidak `return null`.

### Mapping halaman → skeleton

| Halaman | Skeleton Component | Catatan |
|---------|-------------------|---------|
| `src/pages/Gradebook.tsx` | `src/features/gradebook/components/GradebookSkeleton.tsx` | |
| `src/pages/Grades.tsx` | `src/features/gradebook/components/GradebookSkeleton.tsx` | share skeleton |
| `src/pages/LessonViewer.tsx` | `src/features/lessons/components/LessonSkeleton.tsx` | |
| `src/pages/Quiz.tsx` | `src/features/quizzes/components/QuizSkeleton.tsx` | |
| `src/pages/QuizManager.tsx` | `src/features/quizzes/components/QuizSkeleton.tsx` | share skeleton |
| `src/pages/Leaderboard.tsx` | `src/features/gamification/components/GamificationSkeleton.tsx` | |
| `src/pages/StudentProgress.tsx` | `src/features/progress/components/ProgressSkeleton.tsx` | |
| `src/pages/QuestionBankPage.tsx` | `src/features/question-bank/components/QuestionBankSkeleton.tsx` | |
| `src/pages/Forum.tsx` | `src/features/discussions/components/DiscussionSkeleton.tsx` | |
| `src/pages/ClassManagement.tsx` | `src/features/classroom/components/ClassroomSkeleton.tsx` | |
| `src/pages/StudentClassPage.tsx` | `src/features/classroom/components/ClassroomSkeleton.tsx` | share |
| `src/pages/CourseAnalytics.tsx` | `src/features/dashboards/components/DashboardSkeleton.tsx` | |
| `src/pages/Dashboards.tsx` | `src/features/dashboards/components/DashboardSkeleton.tsx` | |
| `src/pages/DocumentManager.tsx` | `src/features/storage/components/StorageSkeleton.tsx` | |
| `src/pages/GroupAssignment.tsx` | `src/features/assignments/components/AssignmentSkeleton.tsx` | |
| `src/pages/StudentAttendance.tsx` | `src/features/progress/components/ProgressSkeleton.tsx` | |
| `src/pages/Profile.tsx` | *Buat inline*: `<div className="animate-pulse p-6 space-y-4"><div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700"/><div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700"/><div className="h-4 w-64 rounded bg-gray-200 dark:bg-gray-700"/></div>` | tidak ada skeleton khusus |
| `src/pages/Settings.tsx` | *Buat inline*: `<div className="animate-pulse p-6 space-y-6">{Array.from({length:5}).map((_,i) => <div key={i} className="h-12 rounded bg-gray-200 dark:bg-gray-700"/>)}</div>` | |
| `src/pages/CourseBuilder.tsx` | *Skip* — ini form editor, loading biasanya cepat | |
| `src/pages/WorkspaceSelector.tsx` | *Skip* — auth flow, bukan data page | |
| `src/pages/ScanAttendance.tsx` | *Skip* — camera UI, tidak ada loading state | |
| `src/pages/PublicProfile.tsx` | *Skip jika tidak ada useQuery* | |
| `src/pages/Directory.tsx` | Cek apakah ada useQuery; jika ya gunakan inline skeleton | |
| `src/pages/Hubs.tsx` | Cek apakah ada useQuery; jika ya gunakan DashboardSkeleton | |

### Admin pages
```
src/pages/admin/
```
Cek semua file di direktori ini. Untuk setiap file yang punya `useQuery` / loading state tapi belum punya skeleton, tambahkan `AdministrationSkeleton` dari `src/features/administration/components/AdministrationSkeleton.tsx` atau inline skeleton.

### Skip conditions
- Jangan tambah skeleton ke halaman yang:
  1. Tidak punya data-fetching (Login, ForgotPassword, NotFound, Unauthorized, dll)
  2. Sudah punya skeleton (`Analytics.tsx`, `Announcements.tsx`, `Assignments.tsx`, `AssignmentGradebook.tsx`, `Calendar.tsx`, `Courses.tsx`, `Creator.tsx`, `Dashboard.tsx`, `Notifications.tsx`, `SpeedGrader.tsx`, `TeacherDashboard.tsx`, `admin/ModerationDashboard.tsx`, `admin/SystemHealth.tsx`)
  3. Skeleton component-nya `return null` atau hanya `<></>` — dalam kasus itu buat inline skeleton

### Verification
```bash
./node_modules/.bin/tsc --noEmit
# harus 0 error
grep -c "Skeleton\|isLoading.*return" src/pages/*.tsx src/pages/admin/*.tsx
# minimal 30 matches
```

---

## Sprint P3 — Analytics: Pre-Aggregated Activity Timeline
**Goal:** Replace client-side date-grouping dengan database-side aggregation.
**Waktu estimasi:** 30 menit
**Commit:** `perf(db): replace client-side activity aggregation with RPC`

### Masalah saat ini
`src/features/analytics/api/analyticsService.ts` — fungsi `getActivityTimeline()` (sekitar baris 296–359):
- Load semua `activity_events` 14 hari terakhir dengan `.limit(5000)`
- Lakukan grouping by date di sisi client (JavaScript loop)
- Untuk tenant aktif (100+ events/hari × 14 hari = 1400+ rows), ini tidak optimal

### Solusi: SQL function sederhana

**Step 1: Buat migration file**
```
supabase/migrations/YYYYMMDDHHMMSS_add_activity_timeline_rpc.sql
```
Gunakan timestamp format YYYYMMDDHHmmss dari `date +%Y%m%d%H%M%S` di bash.

```sql
-- RPC: get_activity_timeline
-- Returns activity counts grouped by date for the last N days
CREATE OR REPLACE FUNCTION get_activity_timeline(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 14
)
RETURNS TABLE (
  event_date DATE,
  event_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    DATE_TRUNC('day', created_at)::DATE AS event_date,
    COUNT(*) AS event_count
  FROM activity_events
  WHERE
    tenant_id = p_tenant_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND auth.uid() IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;

-- RLS: covered by SECURITY DEFINER + auth.uid() check
```

**Step 2: Update analyticsService.ts**

Ganti fungsi `getActivityTimeline()` dari:
```typescript
// Pattern lama: load rows, group di client
const { data, error } = await supabase
  .from('activity_events')
  .select('created_at')
  .gte('created_at', ...)
  .limit(5000)
// ... javascript date-grouping loop
```

Jadi:
```typescript
async getActivityTimeline(tenantId: string, days = 14): Promise<ActivityTimelinePoint[]> {
  const { data, error } = await supabase.rpc('get_activity_timeline', {
    p_tenant_id: tenantId,
    p_days: days,
  })
  if (error) {
    console.error('Error fetching activity timeline:', error)
    throw error
  }

  // Fill missing dates with 0 count
  const result: ActivityTimelinePoint[] = []
  const today = new Date()
  const dataMap = new Map((data ?? []).map((r: { event_date: string; event_count: number }) => [r.event_date, r.event_count]))

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    result.push({ date: key, count: Number(dataMap.get(key) ?? 0) })
  }

  return result
},
```

**Step 3: Pastikan `ActivityTimelinePoint` type ada di types:**
```typescript
export interface ActivityTimelinePoint {
  date: string   // YYYY-MM-DD
  count: number
}
```

### Verification
```bash
./node_modules/.bin/tsc --noEmit
# Check migration file exists:
ls supabase/migrations/ | grep activity_timeline
```

---

## Sprint P4 — Component Splitting: LessonViewer & QuizManager
**Goal:** Pecah 2 file monolitik (1400+ LOC) jadi sub-components yang lebih kecil.
**Waktu estimasi:** 60 menit
**Commit:** `refactor(components): split LessonViewer and QuizManager into sub-components`

> ⚠️ Sprint ini yang paling berisiko. Lakukan `git stash` sebelum mulai.
> Jika ada test yang fail atau TS error yang sulit diperbaiki, rollback dan skip sprint ini.

### LessonViewer.tsx (1,428 LOC)

**Baca file dulu**, identifikasi section-section besar. Tipikal struktur:
1. Header/navigation bar
2. Video player area
3. Content/materials panel
4. Progress tracker
5. Quiz overlay
6. Notes/annotations panel

**Ekstrak ke:**
```
src/features/lessons/components/
├── LessonHeader.tsx         ← navigation, breadcrumb, progress indicator
├── LessonVideoPlayer.tsx    ← video embed + controls
├── LessonContentPanel.tsx   ← text content, PDFs
├── LessonProgressBar.tsx    ← progress tracker
```

**Rules saat ekstrak:**
- Pindahkan JSX + local state yang relevan ke komponen baru
- Props harus typed (bukan `any`)
- Tidak boleh break existing functionality
- Gunakan `export function XxxComponent(props: XxxProps)` bukan default export

**LessonViewer.tsx yang baru** harus tetap jadi entry point yang compose semua sub-components:
```tsx
export default function LessonViewer() {
  // hooks tetap di sini
  return (
    <div>
      <LessonHeader lesson={lesson} progress={progress} />
      <LessonVideoPlayer lesson={lesson} onProgress={handleProgress} />
      <LessonContentPanel lesson={lesson} />
    </div>
  )
}
```

### QuizManager.tsx (1,146 LOC)

**Identifikasi sections:**
1. Quiz list/table
2. Quiz creation form
3. Question editor
4. Settings panel
5. Preview mode

**Ekstrak ke:**
```
src/features/quizzes/components/
├── QuizList.tsx             ← table/list view
├── QuizForm.tsx             ← create/edit form (mungkin sudah ada)
├── QuizQuestionEditor.tsx   ← question CRUD
├── QuizSettingsPanel.tsx    ← settings, time limit, etc
```

### Verification
```bash
./node_modules/.bin/tsc --noEmit
# harus 0 error
# LOC check:
wc -l src/pages/LessonViewer.tsx src/pages/QuizManager.tsx
# LessonViewer.tsx harus < 400 LOC
# QuizManager.tsx harus < 400 LOC
```

---

## Urutan Eksekusi yang Direkomendasikan

```
Sprint P1 (20 min) → Sprint P2 (45 min) → Sprint P3 (30 min) → Sprint P4 (60 min)
```

Commit setelah setiap sprint. Jangan batch semua ke satu commit.

## Final Verification

Setelah semua sprint selesai:
```bash
# 1. TypeScript clean
./node_modules/.bin/tsc --noEmit

# 2. Build berhasil
npm run build 2>&1 | tail -10

# 3. Tidak ada select('*') baru
grep -rn "select('\*')\|select(\"\*\")" src/features/ --include="*.ts" --include="*.tsx"
# harus 0 hasil (kecuali di .insert().select() yang memang valid)

# 4. Skeleton coverage
grep -rl "Skeleton" src/pages/ | wc -l
# harus >= 30 files
```

## Jangan dikerjakan di plan ini (defer ke sesi terpisah)

- **getCourseEngagementStats N+1 → joined RPC**: Butuh schema change dan koordinasi dengan analytics dashboard. Tulis ADR dulu.
- **Vite bundle analysis**: Run `npm run build -- --report` dan analisis chunk sizes. Belum tentu ada problem nyata karena semua routes sudah lazy.
- **Service Worker / offline caching**: Feature besar, butuh product decision dulu.
