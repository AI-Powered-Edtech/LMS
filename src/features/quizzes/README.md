# Quizzes Feature Module

This module contains the scaffolding for the Quizzes feature refactor (Phase 2).

## Architecture

This module follows the feature-based architecture pattern:

```
src/features/quizzes/
├── api/           # API calls (RPCs, Supabase queries)
├── queries/       # React Query hooks
├── hooks/         # Custom React hooks
├── store/         # Zustand state management
├── types/         # TypeScript interfaces
├── components/    # React components
└── utils/         # Utility functions
```

## Status

**Phase 1: Scaffolding** - In Progress

The current implementation of quizzes is located in:
- `src/pages/Quiz.tsx` - Quiz player/taking
- `src/pages/QuizManager.tsx` - Quiz creation/management
- `src/services/quizService.ts` - Quiz API service

## Migration Plan

During Phase 2, logic will be migrated from the existing pages to this feature module:

1. Move API calls from `quizService.ts` to `api/quizzes.service.ts`
2. Create React Query hooks in `queries/quizzes.queries.ts`
3. Create Zustand store in `store/quizzes.store.ts` for quiz player state
4. Migrate components to `components/`
5. Update imports in pages to use new feature module

## Related Documentation

- [QUIZ_FEATURE_ARCHITECTURE.md](../../../docs/architecture/QUIZ_FEATURE_ARCHITECTURE.md)
- [FRONTEND_REFactor_ROADMAP.md](../../../docs/architecture/FRONTEND_REFactor_ROADMAP.md)
