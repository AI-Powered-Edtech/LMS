# course-builder

Modul editor kursus: state machine builder, action hooks, kolaborasi real-time, dan sinkronisasi offline.

## Struktur

- `builderReducer.ts` — core reducer dengan undo/redo dan pendingBlocksByLesson
- `useCourseActions.ts` — publish, draft, review, approve
- `useModuleActions.ts` — CRUD + reorder module
- `useLessonActions.ts` — CRUD + reorder lesson, select/close
- `useBlockActions.ts` — CRUD + reorder block, autosave
- `useBuilderChannel.ts` — real-time collaboration via Supabase Broadcast
- `useBuilderPresence.ts` — cursor presence tracking
- `useBuilderOffline.ts` — IndexedDB draft + conflict resolution
- `useMobileBuilder.ts` — responsive sidebar state
- `api/` — service layer untuk semua DB calls builder

## Consumer utama

`src/contexts/BuilderContext.tsx` — mengagregasi semua hook di atas menjadi satu context.
