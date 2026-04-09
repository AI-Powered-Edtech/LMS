# ai-builder-copilot — Feature Module

AI Copilot real-time terintegrasi di dalam Course Builder untuk otomatisasi, pengingat, dan rekomendasi kontekstual untuk guru dan konten creator. Menyediakan drawer panel di sisi kanan untuk menghasilkan kerangka kursus, draft pelajaran, asesmen, dan transformasi konten.

## Status

**Production-Ready** — Phase 30B selesai (2026-04-09)

## Arsitektur

```
src/features/ai-builder-copilot/
├── types/
│   └── index.ts                     # Type definitions (artifacts, requests, responses)
├── api/
│   └── aiBuilderCopilotService.ts   # Supabase client calls (edge functions + RPCs)
├── queries/
│   └── aiBuilderCopilotQueries.ts   # React Query hooks
├── store/
│   └── builderAICopilot.store.ts    # Zustand store: drawer state, active tab, history artifact
├── hooks/
│   ├── useAICopilotFeatureGate.ts   # Feature flag gate with hydration
│   ├── useSuggestionEngine.ts       # Logic pengurutan dan filtering saran
│   └── useActionExecutor.ts         # Eksekusi otomatisasi aksi
├── components/
│   ├── CourseBuilderAICopilotDrawer.tsx # Main drawer shell with tab bar
│   ├── OutlineTab.tsx                   # Course outline generation
│   ├── LessonDraftTab.tsx               # Lesson content draft
│   ├── AssessmentTab.tsx                # Assessment generation (quiz/reading/writing)
│   ├── ImproveTab.tsx                   # Content transform with diff preview
│   ├── HistoryTab.tsx                   # Artifact history browser
│   └── shared/
│       ├── ArtifactStatusBadge.tsx
│       ├── BlockPreviewCard.tsx
│       ├── CopilotLoadingState.tsx
│       ├── DiffPreview.tsx
│       └── ModuleOutlineCard.tsx
├── utils/
│   └── contextExtractor.ts          # Ekstraksi konteks dari state builder
├── __tests__/
├── index.ts                         # Public barrel export
└── README.md
```

## Data Flow

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ Course Builder State    │────▶│ Context Extractor       │────▶│ Suggestion Engine       │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
                                                               │
                                                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│ User Action Execution   │◀────│ Action Validator        │◀────│ LLM Suggestion          │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Audit Log + Cache       │
└─────────────────────────┘
```

## Capability

| Capability                | Method                    | Edge Function / Backend         |
| ------------------------- | ------------------------- | ------------------------------- |
| Generate course outline   | `generateCourseOutline()` | `generate-course-outline`       |
| Generate lesson draft     | `generateLessonDraft()`   | `generate-lesson-draft`         |
| Transform konten          | `transformContent()`      | `transform-course-content`      |
| Auto-reorder modules      | `autoReorderModules()`    | Client-side                     |
| Kurikulum alignment check | `checkCurriculumAlign()`  | Client validator                |
| Undo last copilot action  | `undoLastAction()`        | Client store + Supabase revert  |
| Apply outline ke kursus   | `applyOutlineArtifact()`  | RPC `apply_ai_outline_artifact` |
| Apply draft ke lesson     | `applyLessonArtifact()`   | RPC `apply_ai_lesson_artifact`  |

## Database Tables

| Tabel                  | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `ai_builder_artifacts` | Semua artefak yang dihasilkan beserta status dan metadata    |
| `ai_copilot_sessions`  | Session per user per course builder sesi                     |
| `ai_copilot_actions`   | Semua aksi yang dieksekusi beserta rollback data             |
| `ai_copilot_logs`      | Audit log lengkap dengan user agent, timestamp, tenant scope |

> ✅ Semua tabel memiliki RLS aktif dengan `tenant_id` scoping dan trigger `auto_set_tenant_id()`
>
> Migrasi: `supabase/migrations/20260509000001_ai_builder_copilot.sql`

## Store State Structure

```typescript
interface BuilderCopilotStore {
  isDrawerOpen: boolean
  activeTab: 'outline' | 'lesson' | 'assessment' | 'improve' | 'history'
  currentSessionId: UUID | null
  activeArtifact: AIBuilderArtifact | null
  artifactHistory: AIBuilderArtifact[]
  context: {
    courseId: UUID | null
    moduleId: UUID | null
    lessonId: UUID | null
    blockId: UUID | null
  }
  undoStack: CopilotUndoEntry[]
}
```

## Security Features

1.  **RLS Enabled**: Semua tabel hanya dapat diakses oleh user pada tenant yang sama
2.  **Authorization Check**: Hanya `teacher`, `admin`, `principal` dapat mengaktifkan copilot
3.  **Audit Log Immutable**: Tidak ada update / delete yang diizinkan pada tabel log
4.  **No PII Logging**: Tidak ada informasi pribadi yang disimpan di log copilot
5.  **Action Confirmation**: Semua aksi yang memodifikasi data menampilkan diff preview sebelum apply
6.  **Rate Limiting**: 12 request per menit per user, enforced di Edge Function

## Usage Examples

### Mengaktifkan Drawer Copilot

```tsx
import { useBuilderCopilotStore } from '@/features/ai-builder-copilot'

// Di dalam Course Builder TopBar
const { isDrawerOpen, toggleDrawer } = useBuilderCopilotStore()

return (
  <Button variant="ghost" onClick={toggleDrawer} aria-label="Toggle AI Copilot">
    <SparklesIcon />
  </Button>
)
```

### Generate Outline Kursus

```tsx
import { useGenerateCourseOutline } from '@/features/ai-builder-copilot'

const generateMutation = useGenerateCourseOutline()

const handleGenerate = () => {
  generateMutation.mutate({
    courseId,
    subject: 'Matematika',
    gradeLevel: '10',
    totalModules: 6,
  })
}
```

## Entry Points

1.  **TopBar** — Sparkles/AI button (between Settings and Release)
2.  **Sidebar empty state** — "Hasilkan dengan AI" button
3.  **Lesson editor empty state** — "Buat Konten dengan AI" button
4.  **Block header actions** — Sparkles button on TEXT blocks (opens Improve tab)
5.  **History tab** — Memuat ulang artefak lama beserta konteks lesson/block jika tersedia

## Feature Flag

Gated behind `ai_course_builder_copilot` feature flag (default: enabled=true, rollout=0%).

## Testing

```bash
# Run unit tests untuk module ini
pnpm test src/features/ai-builder-copilot/__tests__/

# Integration test
pnpm test:integration copilot
```

## Related Files

| File Path                                                      | Deskripsi                              |
| -------------------------------------------------------------- | -------------------------------------- |
| `src/features/course-builder/components/BuilderLayout.tsx:142` | Tempat Copilot Drawer dimount          |
| `supabase/migrations/20260509000001_ai_builder_copilot.sql`    | Skema tabel migrasi                    |
| `src/shared/config/featureFlags.ts`                            | Flag fitur `ai_course_builder_copilot` |
| `src/utils/queryConstants.ts:78`                               | Query key stale time untuk copilot     |
