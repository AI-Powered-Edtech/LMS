# Quizzes Feature Module

This module is the canonical home for all quiz-related logic in EduSync.

## Architecture

```
src/features/quizzes/
├── api/           # Supabase RPC calls (v1_start_quiz_attempt, v1_submit_quiz_attempt, etc.)
├── queries/       # React Query hooks
├── hooks/         # Custom React hooks (useQuizTimer, useAutosave, etc.)
├── store/         # Zustand state management for quiz player state
├── types/         # TypeScript interfaces
├── components/    # React components
│   ├── analytics/ # QuizStatsOverview
│   ├── player/    # QuizPlayer, QuizHeader, QuizBody, QuizFooter, QuizReviewScreen
│   └── student/   # QuizCard, QuizResultsView, StartQuizModal
└── utils/         # Utility functions
```

## Status

**Complete** — Phase 5 (Quiz Engine Refactor) is done.

All quiz logic lives in this module. Entry pages:

- `src/pages/Quiz.tsx` — quiz player page (student-facing)
- `src/pages/QuizManager.tsx` — quiz creation/management (teacher-facing)

## Key RPCs

| RPC                                                     | Purpose                        |
| ------------------------------------------------------- | ------------------------------ |
| `v1_start_quiz_attempt(p_quiz_id)`                      | Start or resume a quiz attempt |
| `v1_save_partial_answers(p_attempt_id, p_answers)`      | Autosave in-progress answers   |
| `v1_submit_quiz_attempt(p_attempt_id, p_final_answers)` | Submit and auto-grade attempt  |
| `v1_get_quiz_results(p_attempt_id)`                     | Fetch attempt results          |

## Related Documentation

- [docs/DATABASE_ARCHITECTURE.md](../../../docs/DATABASE_ARCHITECTURE.md) — Quiz engine schema
- [docs/architecture/QUIZ_SYSTEM_ARCHITECTURE.md](../../../docs/architecture/QUIZ_SYSTEM_ARCHITECTURE.md)
