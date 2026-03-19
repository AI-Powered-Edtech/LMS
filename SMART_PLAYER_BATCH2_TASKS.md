# Smart Player — Batch 2 Task Prompts

Batch 2 fokus pada: **Sequential Progression** + **Leaderboard fix**.

Jalankan Task B2-1 dan B2-2 **secara paralel** (tidak ada dependency antar task).

---

## Task B2-1 — SP-4: Sequential Lesson Progression

**Goal:** Student tidak bisa membuka lesson selanjutnya sebelum lesson sebelumnya selesai.
Teacher dan admin bypass semua lock.

### Files to create

**1. `src/features/lessons/utils/lessonAccess.ts`** (NEW)

Helper reusable agar logic tidak duplikasi antara Sidebar dan Viewer:

```ts
import type { Lesson, LessonProgress } from '../types';

export function isLessonLocked(
  lessons: Lesson[],
  progress: Record<string, LessonProgress>,
  index: number,
  role?: string
): boolean {
  if (role === 'teacher' || role === 'admin') return false;
  if (index === 0) return false;
  const prev = lessons[index - 1];
  return !progress[prev?.id]?.completed;
}
```

Export dari `src/features/lessons/index.ts` (append baris baru).

---

### Files to modify

**2. `src/components/LessonViewer/LessonSidebar.tsx`**

Add new props:
```ts
userRole?: string;
```

Per lesson item, compute: `const locked = isLessonLocked(lessons, progress, index, userRole)`

If `locked`:
- Render `Lock` icon (from lucide-react) instead of progress indicator
- `cursor-not-allowed`, `opacity-60` on the item
- onClick: show inline toast — `"Selesaikan pelajaran sebelumnya terlebih dahulu"`
  - Toast: small div that fades in/out, no external library
  - Position it relative to the sidebar, not full-screen
- No hover background state

If NOT locked: existing behavior unchanged.

**Teacher/admin** (`userRole === 'teacher' || 'admin'`): no lock icon, no lock behavior, all lessons clickable as normal.

**3. `src/pages/LessonViewer.tsx`**

Pass `userRole={role}` to `<LessonSidebar>`.

In `handleSelectLesson(id: string)`:
- Find the index of `id` in `moduleLessons`
- Call `isLessonLocked(moduleLessons, moduleProgress, index, role)`
- If locked: return early without navigation
- This closes the URL-manipulation bypass

---

### Constraints
- Do NOT install new dependencies
- Existing sidebar layout/styling unchanged
- First lesson always unlocked
- Build: `npm run build` must pass with zero errors

---

## Task B2-2 — Leaderboard 400 Fix

**Goal:** Fix `400 Bad Request` errors on leaderboard API calls.

### Steps

1. Read `src/features/gamification/api/leaderboardService.ts` fully
2. Identify the Supabase query causing 400 — common causes:
   - Column name in `.select()` that doesn't exist in table
   - Relation name (e.g., `profiles(*)`) where FK relationship is not defined
   - `.eq('column', ...)` where column doesn't exist
   - Wrong table name

3. To verify actual table columns, look at the select and compare against type definitions in `src/features/gamification/types/index.ts`

4. Fix the query to only select existing columns. If `user_id` or `profiles` join is causing issues, remove the join and replace with the data that IS available.

5. If the leaderboard needs user display name but profiles join is broken, fetch profile separately or remove it for now.

### Common Supabase 400 pattern to check:
```ts
// BAD — if 'profiles' relationship doesn't exist as FK
.select('*, profiles(display_name)')

// GOOD — if no FK relation defined, remove the join
.select('user_id, score, rank, tenant_id')
```

### Constraints
- Do NOT modify DB schema or RLS policies (migration 803 already handles RLS)
- Keep existing TypeScript types if possible, update them if columns change
- `npm run build` must pass
- After fix: leaderboard network requests should return 200, not 400
