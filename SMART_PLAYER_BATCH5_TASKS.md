# Smart Player Batch 5 — Resume Engine (SP-11)

## Architecture Decision (from lead architect)

**Block-anchored resume** — saves block ID + index, NOT pixel scroll position.

Why: pixel position breaks when image heights change, lazy-mount reorders DOM,
viewport differs (mobile vs desktop), or teacher edits lesson content.

Resume fallback chain:
1. `last_block_id` → find element by id, scrollIntoView + scrollBy(offset)
2. `last_block_index` → fallback if block was deleted
3. `0` (top) → fallback if both missing

Migration 805 already adds the required fields and updates the RPC.

---

## Task B5-1: Active Block Tracking + Debounced Progress Save

**Goal:** Track which block the student is currently viewing, and debounce-save
the resume anchor to the database every 5 seconds.

### Files to modify:
- `src/components/LessonViewer/MultiBlockViewer.tsx`
- `src/features/lessons/api/lessonService.ts`
- `src/features/lessons/types/index.ts`

---

### 1a. Update `LessonProgress` type

**File:** `src/features/lessons/types/index.ts`

Add to `LessonProgress` interface:
```ts
last_block_id?: string | null;
last_block_index?: number | null;
last_block_offset?: number | null;
last_video_position?: number | null;
```

---

### 1b. Update `lessonService.updateProgress`

**File:** `src/features/lessons/api/lessonService.ts`

Update the `updateProgress` method to accept and forward resume fields to the RPC:

```ts
async updateProgress(
  lessonId: string,
  tenantId: string,
  status: 'started' | 'in_progress' | 'completed',
  progressPercentage: number,
  lastPosition?: number,
  resumeAnchor?: {
    lastBlockId?: string;
    lastBlockIndex?: number;
    lastBlockOffset?: number;
    lastVideoPosition?: number;
  }
): Promise<void>
```

Pass the new params to `update_lesson_progress_monotonic` RPC as:
- `p_last_block_id`
- `p_last_block_index`
- `p_last_block_offset`
- `p_last_video_position`

Also update `queueProgressUpdate` to accept and pass through the same `resumeAnchor` param.

---

### 1c. Add active block tracking to `MultiBlockViewer`

**File:** `src/components/LessonViewer/MultiBlockViewer.tsx`

Add a new prop:
```ts
onResumeAnchorUpdate?: (anchor: {
  lastBlockId: string;
  lastBlockIndex: number;
  lastBlockOffset: number;
}) => void;
```

Use a **single IntersectionObserver** (reuse the existing pattern) to track the
most-recently-visible block. Track using a ref so it doesn't trigger re-renders:

```ts
const activeBlockRef = useRef<{ id: string; index: number } | null>(null);
```

When a block is 30%+ visible, update `activeBlockRef`.

On a **5-second debounced interval**, call `onResumeAnchorUpdate` with:
```ts
{
  lastBlockId: activeBlockRef.current.id,
  lastBlockIndex: activeBlockRef.current.index,
  lastBlockOffset: Math.round(
    window.scrollY - (document.getElementById(`block-${id}`)?.getBoundingClientRect().top ?? 0)
  ),
}
```

**Important:** Use `setInterval` (not `setTimeout`) that clears on unmount.
Do NOT save on every scroll event — only on the 5s tick.
Do NOT save if the lesson is already completed.
Do NOT save if `activeBlockRef.current` is null.

---

### 1d. Wire up in `LessonViewer.tsx`

**File:** `src/pages/LessonViewer.tsx`

In the `handleProgressUpdate` / `useEffect` progress saving logic, after receiving
`onResumeAnchorUpdate` from MultiBlockViewer:

```ts
const handleResumeAnchorUpdate = useCallback(async (anchor) => {
  if (!lessonId || !tenantId || !user?.id) return;
  await lessonService.queueProgressUpdate(
    lessonId,
    tenantId,
    'in_progress',
    state.progress ?? 0,
    undefined,
    {
      lastBlockId: anchor.lastBlockId,
      lastBlockIndex: anchor.lastBlockIndex,
      lastBlockOffset: anchor.lastBlockOffset,
    }
  );
}, [lessonId, tenantId, user?.id, state.progress]);
```

Pass `onResumeAnchorUpdate={handleResumeAnchorUpdate}` to MultiBlockViewer.

---

## Task B5-2: Resume Logic + Banner UX

**Goal:** When a student reopens a lesson with saved progress, scroll to their
last position and offer a resume banner.

### Files to modify:
- `src/pages/LessonViewer.tsx`
- `src/components/LessonViewer/MultiBlockViewer.tsx`

---

### 2a. Resume Banner Component

In `LessonViewer.tsx`, show a banner after lesson loads IF `progress.last_block_id` exists
and lesson is not already completed:

```tsx
{showResumeBanner && (
  <div className="mx-6 mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
      <p className="text-sm font-medium text-blue-800">
        Lanjutkan dari terakhir kamu berhenti?
      </p>
    </div>
    <div className="flex gap-2 shrink-0">
      <button
        onClick={handleStartOver}
        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
      >
        Mulai dari awal
      </button>
      <button
        onClick={handleResume}
        className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        Lanjutkan
      </button>
    </div>
  </div>
)}
```

State:
```ts
const [showResumeBanner, setShowResumeBanner] = useState(false);
```

Show banner logic (in useEffect after lesson loads):
```ts
if (
  progress?.last_block_id &&
  state.status !== 'completed'
) {
  setShowResumeBanner(true);
}
```

`handleStartOver`: hide banner, do nothing (stay at top).
`handleResume`: hide banner, call `scrollToBlock(progress.last_block_id, progress.last_block_index, progress.last_block_offset)`.

---

### 2b. `scrollToBlock` function

Add a helper in `LessonViewer.tsx`:

```ts
const scrollToBlock = useCallback((
  blockId?: string | null,
  blockIndex?: number | null,
  offset?: number | null,
) => {
  // 1. Try by block id
  if (blockId) {
    const el = document.getElementById(`block-${blockId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (offset && offset > 0) {
        setTimeout(() => window.scrollBy({ top: offset, behavior: 'smooth' }), 300);
      }
      return;
    }
  }
  // 2. Fallback to block index
  if (blockIndex != null && blockIndex > 0) {
    const blocks = document.querySelectorAll('[data-block-id]');
    const el = blocks[blockIndex];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
  }
  // 3. Fallback: top
}, []);
```

**Important:** The scroll must happen AFTER blocks are mounted in the DOM.
Wrap the `handleResume` call with a short `setTimeout(fn, 100)` to ensure
lazy-mounted blocks are rendered first.

---

### 2c. Auto-resume for completed lessons

If lesson is already completed, do NOT show the banner. Just scroll to top silently.
Completed students should start fresh, not resume.

---

## Task B5-3: Video Resume

**Goal:** When a video block is resumed, automatically seek to the last saved position.

### Files to modify:
- `src/components/LessonViewer/blocks/VideoBlock.tsx`
- `src/pages/LessonViewer.tsx`
- `src/components/LessonViewer/MultiBlockViewer.tsx`
- `src/components/LessonViewer/BlockRenderer.tsx`

---

### 3a. Add `savedVideoPosition` prop to VideoBlock

**File:** `src/components/LessonViewer/blocks/VideoBlock.tsx`

Add prop:
```ts
interface VideoBlockProps {
  url: string;
  isCompleted: boolean;
  savedVideoPosition?: number | null;   // seconds
  onProgressUpdate?: (percentage: number) => void;
  onCompletionMet?: () => void;
  onStartViewing?: () => void;
  onVideoTimeUpdate?: (seconds: number) => void;  // NEW: report current time
}
```

For **direct video** (`<video>` element):
- On `canplay` event (not `canplaythrough`), seek to position:
  ```ts
  if (savedVideoPosition && videoRef.current) {
    videoRef.current.currentTime = savedVideoPosition;
  }
  ```
- On `timeupdate`, call `onVideoTimeUpdate(Math.floor(video.currentTime))`
  BUT only every 5 seconds to avoid flooding (use a ref counter):
  ```ts
  const lastReportedSecond = useRef(0);
  // In handleTimeUpdate:
  const currentSecond = Math.floor(video.currentTime);
  if (currentSecond - lastReportedSecond.current >= 5) {
    lastReportedSecond.current = currentSecond;
    onVideoTimeUpdate?.(currentSecond);
  }
  ```

For **YouTube/Vimeo embed**: seeking is not possible via JS (cross-origin).
Skip `savedVideoPosition` for embeds silently. Note this in a comment.

---

### 3b. Thread video position through BlockRenderer

**File:** `src/components/LessonViewer/BlockRenderer.tsx`

Add to `BlockRendererProps`:
```ts
savedVideoPosition?: number | null;
onVideoTimeUpdate?: (seconds: number) => void;
```

Pass both to `VideoBlock` in the `case 'video'` branch.

---

### 3c. Thread video position through MultiBlockViewer

**File:** `src/components/LessonViewer/MultiBlockViewer.tsx`

Add to `MultiBlockViewerProps`:
```ts
savedVideoPosition?: number | null;
onVideoTimeUpdate?: (blockId: string, seconds: number) => void;
```

Pass `savedVideoPosition` only to the block whose `block.id` matches the
`progress.last_block_id` (only resume the most recent video, not all videos):

```tsx
<BlockRenderer
  ...
  savedVideoPosition={
    block.id === savedVideoBlockId ? savedVideoPosition : null
  }
  onVideoTimeUpdate={(seconds) => onVideoTimeUpdate?.(block.id, seconds)}
/>
```

---

### 3d. Wire video resume in LessonViewer

**File:** `src/pages/LessonViewer.tsx`

Pass to MultiBlockViewer:
```ts
savedVideoPosition={progress?.last_video_position}
onVideoTimeUpdate={handleVideoTimeUpdate}
```

Handler:
```ts
const handleVideoTimeUpdate = useCallback(async (blockId: string, seconds: number) => {
  if (!lessonId || !tenantId) return;
  await lessonService.queueProgressUpdate(
    lessonId,
    tenantId,
    'in_progress',
    state.progress ?? 0,
    undefined,
    { lastBlockId: blockId, lastVideoPosition: seconds }
  );
}, [lessonId, tenantId, state.progress]);
```

---

## Constraints for all tasks

- TypeScript strict — no `as any` in new code
- Debounce saves: do NOT call API more than once every 5 seconds
- All new props must be optional with sensible defaults
- Do NOT break existing progress tracking behavior
- `npm run build` must pass with zero errors

## Parallelism

B5-1 and B5-2 can run in parallel — they touch different parts.
B5-3 depends on B5-1 completing (needs the updated `updateProgress` signature).
