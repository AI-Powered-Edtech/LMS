# courses — Feature Module

Pengelolaan katalog kursus, rilis, kolaborator, versi, dan template. Fitur ini bertanggung jawab atas **course management** (list, detail, settings, governance) saja.

> **Catatan:** Fitur **builder/editor** kursus telah dipindahkan ke modul terpisah di [`src/features/course-builder/`](../course-builder/README.md).

## Arsitektur

```
src/features/courses/
├── api/
│   ├── courseService.ts        # Supabase CRUD kursus (list, detail, create, update)
│   ├── templateService.ts      # Import/export content template
│   └── versionService.ts       # Version history, snapshot, restore, diff
├── queries/
│   ├── courseKeys.ts           # React Query key factory (tenant-scoped)
│   ├── courseQueries.ts        # useCourses, useInfiniteCoursesQuery
│   ├── useCourseEnrollmentCount.ts
│   ├── useCourseVersions.ts    # useCourseVersions, useSaveVersion, useRestoreVersion
│   └── useTemplates.ts
├── hooks/
│   ├── useCourse.ts
│   ├── useCourseReadiness.ts   # Readiness engine: score, blockers, warnings, actions
│   └── useCourseSettings.ts    # React Query hook untuk CourseSettingsModal
├── types/
│   └── index.ts                # Course, CourseInsert, CourseUpdate, CourseStatus
├── components/
│   ├── CourseCollaborators.tsx
│   ├── CourseReleasePanel.tsx
│   ├── CourseSettingsModal.tsx
│   ├── CourseVersionHistoryDrawer.tsx
│   ├── InteractiveVideoEditor.tsx
│   ├── MobileCourseBuilderNav.tsx
│   ├── SaveTemplateModal.tsx
│   └── TemplateModal.tsx
├── services/
│   └── videoCaptionService.ts
└── __tests__/
    ├── courseService.test.ts
    ├── collaboratorService.test.ts
    ├── useCourseReadiness.test.ts
    └── versionService.test.ts
```

## Query Keys

Semua query key di modul ini ter-scope ke `tenantId` via `courseKeys`:

| Key                                              | Factory                             |
| ------------------------------------------------ | ----------------------------------- |
| `courseKeys.all(tenantId)`                       | Base scope semua course queries     |
| `courseKeys.detail(tenantId, courseId)`          | Detail satu course                  |
| `courseKeys.collaborators(tenantId, courseId)`   | Daftar kolaborator                  |
| `courseKeys.versions(tenantId, courseId)`        | Version history                     |
| `courseKeys.builder(tenantId, courseId)`         | Builder structure (modules+lessons) |
| `courseKeys.enrollmentCount(tenantId, courseId)` | Jumlah kelas yang di-assign         |
| `courseKeys.activity(tenantId, courseId)`        | Activity feed                       |
| `courseKeys.infinite(tenantId, search?)`         | Infinite list (CourseBrowser)       |

## Readiness Engine

`useCourseReadiness()` menerima state builder dan mengembalikan:

- `readinessScore` (0–100)
- `blockers` — hal yang mencegah publish
- `warnings` — hal yang disarankan sebelum publish
- `infos` — informasi kontekstual
- `availableActions` — aksi yang tersedia berdasarkan role × status

### Scoring

| Kriteria                  | Poin          |
| ------------------------- | ------------- |
| Has modules               | +30           |
| Has lessons               | +30           |
| Has published lessons     | +25           |
| Has description           | +10           |
| No empty modules          | +5            |
| Has thumbnail             | +5            |
| Has lesson duration       | +5            |
| **Total (capped at 100)** | 110 max → 100 |

## Testing

```bash
pnpm vitest run src/features/courses
```

## Dokumentasi Terkait

- [DATABASE.md](../../docs/DATABASE.md)
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md)
- [course-builder README](../course-builder/README.md)
