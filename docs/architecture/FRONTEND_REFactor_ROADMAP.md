# EduSync Frontend Refactor Roadmap (Phase 1-6)

This document is a strategic plan to migrate code from the legacy structure (`src/pages/*` and `src/components/*`) to a new feature-driven architecture without halting new feature development.

---

## 🟢 Phase 1: Foundation & Stability (COMPLETED ✅)
**Goal**: Build the infrastructure pipeline that supports the new architecture.
- [x] Install `@tanstack/react-query`, `zustand`, and `@tanstack/react-query-devtools`.
- [x] Create `src/services/supabase/` (Centralized Client, Auth, and Realtime).
- [x] Setup global `QueryClient` with 5-minute staleTime.
- [x] Implement `AppProviders` and integrate into `main.tsx`.
- [x] Create `src/services/queryKeys.ts` as cache key registry.
- [x] Create `scripts/generate_feature.sh` for feature scaffolding automation.

---

## 🟡 Phase 2: The Pilot Feature (Refactor Quiz Engine)
**Goal**: Break down the most complex module as a blueprint standard.
- **Target**: `src/pages/Quiz.tsx` → `src/features/quizzes/`.
- **Steps**:
  1. Define `quiz.types.ts`.
  2. Move RPC call logic to `api/quiz.service.ts`.
  3. Create `queries/quiz.queries.ts` (Fetch attempt, questions).
  4. Move temporary answer state to `store/quizPlayer.store.ts` (Zustand).
  5. Break down large component into `player/QuizPlayer.tsx`, `player/QuizTimer.tsx`, etc.
  6. **Verification**: Test autosave race condition and timer synchronization.

---

## 🔵 Phase 3: Domain Decoupling (Courses & Assignments)
**Goal**: Separate learning materials from project assignments.
- **Target**: `src/pages/CourseBuilder.tsx`, `src/pages/Assignments.tsx`.
- **Steps**:
  1. Run `./scripts/generate_feature.sh courses` and `assignments`.
  2. Implement **Smart Player** (Learning Mode) in `features/courses`.
  3. Implement **Assignment Submission** in `features/assignments`.
  4. Use `QueryKeys` for automatic invalidation when new assignments are created.

---

## 🟠 Phase 4: Teacher Excellence (Gradebook & SpeedGrader)
**Goal**: Improve teacher grading efficiency.
- **Target**: `src/pages/SpeedGrader.tsx`, `src/pages/Gradebook.tsx`.
- **Steps**:
  1. Migrate to `features/gradebook/`.
  2. Implement **Data Prefetching** strategy (load next student data in background).
  3. Use **Optimistic Updates** for instant grading.

---

## 🔴 Phase 5: Engagement & Analytics
**Goal**: Integrate gamification system and data visualization.
- **Target**: `src/pages/Leaderboard.tsx`, `src/pages/Analytics.tsx`.
- **Steps**:
  1. Migrate to `features/gamification/` and `features/analytics/`.
  2. Centralize metric calculation in API layer (Supabase RPC).
  3. Implement **Realtime Broadcast** for live Leaderboard updates.

---

## 🟣 Phase 6: Final Clean-up & Routing Overhaul
**Goal**: Remove legacy code and optimize navigation.
- **Steps**:
  1. Move `src/App.tsx` routes to `src/app/router.tsx` using **Data API Router** (v6).
  2. Apply `React.lazy()` for Code Splitting per feature to reduce bundle size.
  3. Delete `src/pages/` folder after all content is migrated.
  4. Final audit to ensure no more `supabase.from()` is called directly from UI components.

---

### Coexistence Strategy (Bridge Period)
During the transition, legacy and new components will run side-by-side.
- **Rule #1**: New features **MUST** be created using `generate_feature.sh`.
- **Rule #2**: If touching bug fixes in `src/pages/`, spend 20% effort trying to move small logic parts to the new Service Layer.
- **Rule #3**: All new data must flow through React Query, do not add new `useEffect` for data fetching.
