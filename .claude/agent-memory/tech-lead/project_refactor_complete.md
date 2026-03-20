---
name: Project Refactor Phase 0-7 Complete
description: Full 7-phase structure refactor completed 2026-03-20. All services migrated, shims removed, components moved to feature modules.
type: project
---

Full 7-phase structure refactor completed 2026-03-20.

**Why:** Align codebase with feature-based architecture (EduSync constitution). Remove shim layers, dead code, and misplaced files.

**How to apply:** Any new service logic belongs in `src/features/{domain}/api/`. Any new component belongs in the relevant feature module. No new files should go in `src/services/` unless they are truly cross-cutting and have no feature home.

## What was done

### Services migrated to features/
- `assignmentService` → `features/assignments/api/`
- `gradebookService` → `features/assignments/api/`
- `discussionService` → `features/discussions/api/`
- `classroomService` → `features/classroom/api/`
- `calendarService` → `features/calendar/api/`
- `studentProgressService` → `features/progress/api/`
- `progressService` → `features/progress/api/`
- `moderationService` → `features/moderation/api/`
- `questionBankService` → `features/question-bank/api/`
- `quizAnalyticsService` → `features/quizzes/api/`
- `administrationService` → `features/administration/api/`
- `courseBuilderService` → `features/courses/api/`
- `builder/*` → `features/courses/api/builder/`

### Shims deleted from services/
- `courseService`, `lessonService`, `gamificationService`, `leaderboardService`, `analyticsService`, `quizService`, `aiPromptBuilder`, `aiTutorService`

### Components moved
- `LessonViewer/QuizViewer` → `features/quizzes/components/`
- `CourseBuilder/blocks/QuizBlockEditor` → `features/quizzes/components/`
- `Quiz/QuizAssignModal` + `QuizAssignmentStatus` → `features/quizzes/components/`
- `LessonViewer/AITutorPanel`, `AITutorInput`, `AITutorTyping` → `features/ai-tutor/components/`
- `components/gamification/LevelBadge` → `features/gamification/components/`

### Dead code removed
- `services/aiPromptBuilder.ts` (shim, no consumers)
- `components/gamification/LevelProgress.tsx` (no consumers)

### New feature modules created
- `features/discussions/`
- `features/classroom/`
- `features/calendar/`
- `features/progress/`
- `features/administration/`

### Services still in src/services/ (intentionally left)
- `adminUserService.ts` — admin user management (no feature home)
- `aiGraderService.ts` — AI grading (no feature home)
- `announcementService.ts` — announcements feature
- `commentService.ts` — comments feature
- `notificationService.ts` — notifications (has features/notifications)
- `supabase/` — supabase client directory
- `__tests__/` — test files

## Key patterns established
- All feature services use `import { supabase } from '@/src/lib/supabase'`
- Feature barrels (`index.ts`) export public API for each module
- quizzes barrel exports `quizService` namespace for backward compat
- defaultGuides wired as fallback in `useApplicableGuides` query hook
