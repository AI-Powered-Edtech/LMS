# EduSync LMS — Testing Guide

## Test Accounts

The following accounts exist in the shared dev Supabase project (tenant: `EduSync Dev`, ID `00000000-0000-0000-0000-00000000000d`):

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

## Known Limitation: .test TLD Emails

Accounts with `.test` TLD (e.g., `guru.mat@smanusantara1.test`) fail login due to GoTrue email validation. Do not use `.test` TLD for test accounts. Use `.dev` or real-domain emails.

Affected accounts (login FAILS, infra limitation, not a code bug):

- `guru.mat@smanusantara1.test`
- `siswa.andi@smanusantara1.test`
- `siswa.budi@smanusantara1.test`
- `tutor.mandiri@gmail.test`

## Known Limitation: `agent-browser` Click Simulation

When running automated QA via `agent-browser` CLI, standard click simulations sometimes fail on interactive React components (especially those using Framer Motion's `AnimatePresence` or complex portal structures).

- **Workaround:** If `agent-browser click @ref` fails, it may be an artifact of the simulation, not an actual bug in the app. Fall back to testing standard browser usage, or instruct the agent to use `element.click()` in JS.
- Defensive coding (e.g., adding `type="button"` and managing `pointerEvents: 'none'` during exit animations) helps mitigate this, but absolute compatibility with generic DOM click simulators is not guaranteed.

## Running the App for Testing
<<<<<<< HEAD
=======

```bash
pnpm install
pnpm dev
# App runs at http://localhost:5173
```

All URLs use hash routing. Navigate to `http://localhost:5173/#/login` to start.

## TypeScript Check

```bash
pnpm typecheck      # tsc --noEmit
```

Must pass with 0 errors before shipping.

## Lint Check

```bash
pnpm lint           # eslint src/
```

## Production Build Check

```bash
pnpm build          # must complete without errors
```

## Unit Tests

```bash
pnpm test           # Vitest
```

Tests are in `src/**/*.test.ts` and `src/**/*.test.tsx` files.

## E2E Testing

### Quick Start

```bash
# Run the comprehensive 24-flow test suite (recommended)
npx playwright test --config=playwright-24.config.ts

# Run the legacy Playwright suite
pnpm run test:e2e

# Run a specific flow (e.g., only auth tests)
npx playwright test --config=playwright-24.config.ts auth.spec.ts

# Run only student-role tests
npx playwright test --config=playwright-24.config.ts --project=student

# Run only teacher-role tests
npx playwright test --config=playwright-24.config.ts --project=teacher

# Run only admin-role tests
npx playwright test --config=playwright-24.config.ts --project=admin

# Open last HTML report
npx playwright show-report
```

### E2E Structure

```
e2e/
  .auth/                ← Auto-generated auth state (gitignored)
    student.json
    teacher.json
    admin.json
  helpers/
    auth.ts             ← loginAsStudent / loginAsTeacher / loginAsAdmin / gotoAndWait / dismissToast / skipIfNoAuth
    index.ts            ← barrel export
  flows/                ← Legacy authenticated flow tests
    student-journey.spec.ts
    teacher-journey.spec.ts
    admin-journey.spec.ts
    quiz-autosave-resume.spec.ts
    class-join-code.spec.ts
  flows24/              ← Comprehensive 24-flow E2E suite (604 tests)
    global.setup.ts     ← Authenticates student/teacher/admin, saves storage state
    auth.spec.ts        ← Flows 1-3: Login, Registration, Role Switching (18 tests)
    student.spec.ts     ← Flows 4,6,8,11,12,14,21,22,24: Student features (37 tests)
    teacher.spec.ts     ← Flows 5,7,9,10,13,15: Teacher features (37 tests)
    shared-admin.spec.ts← Flows 16-20,23: Communication, Admin, Settings (65 tests)
    cross-cutting.spec.ts← CC-1 to CC-4: Dark mode, Mobile, Console, Loading (70 tests)
    seeder.spec.ts      ← Data seeding for test prerequisites
  *.spec.ts             ← Unauthenticated + authenticated tests per domain
```

### flows24 Configuration (playwright-24.config.ts)

The `flows24/` suite uses a separate Playwright config with pre-authenticated storage states:

- **Setup project**: `global.setup.ts` authenticates all 3 roles via keyboard events (React controlled input workaround) and saves storage state to `e2e/.auth/*.json`.
- **Role-based projects**: `student`, `teacher`, `admin` — each project uses its own saved auth state so tests don't need to re-login.
- **Role filtering**: Tests use `test.skip(testInfo.project.name !== 'role')` to run only under the correct role project.
- **Timeout**: 120s per test (accounts for slow Supabase queries on first load).
- **Web server**: Auto-starts `pnpm dev` if not already running.

### flows24 Coverage Matrix (24 Flows + 4 Cross-Cutting)

| Flow | Feature                                | Tests | Spec File             |
| ---- | -------------------------------------- | ----- | --------------------- |
| F1   | Login & Auth Guard                     | 9     | auth.spec.ts          |
| F2   | Registration & Onboarding              | 3     | auth.spec.ts          |
| F3   | Role Switching & Tenant Guard          | 6     | auth.spec.ts          |
| F4   | Course Browsing & Enrollment           | 3     | student.spec.ts       |
| F5   | Course Builder                         | 6     | teacher.spec.ts       |
| F6   | Smart Player / Lesson Viewer           | 3     | student.spec.ts       |
| F7   | Class Management                       | 6     | teacher.spec.ts       |
| F8   | Quiz Taking                            | 5     | student.spec.ts       |
| F9   | Quiz Builder                           | 4     | teacher.spec.ts       |
| F10  | SpeedGrader                            | 2     | teacher.spec.ts       |
| F11  | Assignments                            | 3     | student.spec.ts       |
| F12  | Student Dashboard & Progress           | 6     | student.spec.ts       |
| F13  | Teacher Analytics Dashboard            | 9     | teacher.spec.ts       |
| F14  | Gamification (XP, Badges, Leaderboard) | 3     | student.spec.ts       |
| F15  | Gradebook                              | 6     | teacher.spec.ts       |
| F16  | Forum / Discussions                    | 5     | shared-admin.spec.ts  |
| F17  | Announcements                          | 7     | shared-admin.spec.ts  |
| F18  | Notifications                          | 8     | shared-admin.spec.ts  |
| F19  | Calendar                               | 5     | shared-admin.spec.ts  |
| F20  | Admin Dashboard                        | 11    | shared-admin.spec.ts  |
| F21  | Attendance                             | 3     | student.spec.ts       |
| F22  | Certificates                           | 3     | student.spec.ts       |
| F23  | Profile & Settings                     | 11    | shared-admin.spec.ts  |
| F24  | AI Tutor                               | 2     | student.spec.ts       |
| CC-1 | Dark Mode Full Sweep                   | 18    | cross-cutting.spec.ts |
| CC-2 | Mobile Responsive (375px)              | 20    | cross-cutting.spec.ts |
| CC-3 | Console Error Sweep                    | 18    | cross-cutting.spec.ts |
| CC-4 | Loading & Empty States                 | 14    | cross-cutting.spec.ts |

## Gap Analysis (March 2026)

A detailed gap analysis based on test execution results is available in `docs/GAP_ANALYSIS.md`. Key findings include:

- Need for robust `data-testid` usage globally (tests currently rely on Bahasa Indonesia display text matching).
- Handling Supabase connection delays under concurrent test load.
- Properly hiding visually hidden navigation elements (`span.text-[10px]`) from broad `text=/Pattern/` queries to prevent false positives before `h1` headings render.

### Clearing Auth State

If tests fail during setup (e.g., password changed, Supabase down), delete the cached auth state:

```bash
rm -f e2e/.auth/student.json e2e/.auth/teacher.json e2e/.auth/admin.json
```

The next run will re-authenticate all roles.

All authenticated tests call `skipIfNoAuth()` in `beforeEach` — they skip gracefully in CI
when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` env vars are not set.

### Manual Testing URLs

All URLs for manual testing use hash routing:

| Flow              | URL                                               |
| ----------------- | ------------------------------------------------- |
| Login             | `http://localhost:5173/#/login`                   |
| Student dashboard | `http://localhost:5173/#/app/student`             |
| Teacher dashboard | `http://localhost:5173/#/app/teacher`             |
| Admin dashboard   | `http://localhost:5173/#/app/admin`               |
| Analytics         | `http://localhost:5173/#/analytics`               |
| Course builder    | `http://localhost:5173/#/teaching/course-builder` |
| Quiz manager      | `http://localhost:5173/#/teaching/quiz-manager`   |
| Leaderboard       | `http://localhost:5173/#/leaderboard`             |
| Gradebook         | `http://localhost:5173/#/gradebook`               |

**Note:** The login form uses React controlled inputs. Playwright tests use keyboard events (`page.fill()`) with the correct selectors. See `e2e/helpers/auth.ts` for helper utilities.

## Key Test IDs (Shared Dev DB)

| Object      | ID                                     |
| ----------- | -------------------------------------- |
| Test quiz   | `f5521ccc-a6cf-43be-9999-ec2bdf115fd0` |
| Test course | `4022d60f-68d7-40ef-bac1-e58222d1ed1e` |
| Dev tenant  | `00000000-0000-0000-0000-00000000000d` |

## Critical Path to Verify

1. Login as teacher → create/publish a course with a quiz lesson
2. Login as student → join class via code → open lesson → take quiz
3. After quiz: verify XP awarded, leaderboard updates
4. Login as teacher → check analytics dashboard for student data

## Ship Criteria (from QA Sprint 2026-03-21)

- 0 CRITICAL bugs
- 0 HIGH bugs
- Auth: login, role routing work correctly
- Teacher: course builder, publish, analytics functional
- Student: lesson viewer, quiz player, gamification functional
- Multi-tenant: data isolated between schools (RLS verified)
- 0 TypeScript errors (`pnpm typecheck` clean)
- 0 ESLint errors (`pnpm lint` clean)
- Build passes (`pnpm build` clean)
- No console errors on happy paths
- All user-visible text in Bahasa Indonesia
- Dark mode works on all pages
- Mobile responsive at 375px

## Known Post-Ship Limitations

| ID          | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| BUG-C3-006  | QuizPlayer: `isOnline` hardcoded to `true` — offline warning never shows |
| BUG-C3-008  | HubView: no empty-state when 0 items match role                          |
| NEW-QA4-002 | Gradebook: uses local mock data, no Supabase persistence                 |
| FG-PRE-001  | No self-serve school registration wizard                                 |
| BUG-C2-002  | Student course discovery is join-code only (by design)                   |
| BUG-PRE-006 | Workspace selector "No Workspace Access" text in English                 |
>>>>>>> tundra-boa
