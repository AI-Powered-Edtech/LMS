# EduSync LMS — Testing Guide

## Test Accounts

The following accounts exist in the shared dev Supabase project (tenant: `EduSync Dev`, ID `00000000-0000-0000-0000-00000000000d`):

| Email | Password | Role |
|-------|----------|------|
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev` | `password123` | ADMIN |

## Known Limitation: .test TLD Emails

Accounts with `.test` TLD (e.g., `guru.mat@smanusantara1.test`) fail login due to GoTrue email validation. Do not use `.test` TLD for test accounts. Use `.dev` or real-domain emails.

Affected accounts (login FAILS, infra limitation, not a code bug):
- `guru.mat@smanusantara1.test`
- `siswa.andi@smanusantara1.test`
- `siswa.budi@smanusantara1.test`
- `tutor.mandiri@gmail.test`

## Running the App for Testing

```bash
npm install
npm run dev
# App runs at http://localhost:5173
```

All URLs use hash routing. Navigate to `http://localhost:5173/#/login` to start.

## TypeScript Check

```bash
npm run lint        # alias for: npx tsc --noEmit
```

Must pass with 0 errors before shipping.

## Production Build Check

```bash
npm run build       # must complete without errors
```

## Unit Tests

```bash
npm run test        # Vitest
```

Tests are in `src/**/*.test.ts` and `src/**/*.test.tsx` files.

## E2E Testing

```bash
npm run test:e2e    # Playwright
```

### Manual E2E via agent-browser

The `agent-browser` CLI (Vercel Labs) can be used for headless browser testing:

```bash
npm i -g agent-browser && agent-browser install
```

All URLs for manual testing use hash routing:

| Flow | URL |
|------|-----|
| Login | `http://localhost:5173/#/login` |
| Student dashboard | `http://localhost:5173/#/app/student` |
| Teacher dashboard | `http://localhost:5173/#/app/teacher` |
| Analytics | `http://localhost:5173/#/analytics` |
| Course builder | `http://localhost:5173/#/teaching/course-builder` |
| Quiz manager | `http://localhost:5173/#/teaching/quiz-manager` |
| Leaderboard | `http://localhost:5173/#/leaderboard` |
| Gradebook | `http://localhost:5173/#/gradebook` |

**Important:** The login form cannot be filled programmatically (React controlled inputs). Agent-browser must use keyboard events or `page.fill()` with the correct selectors.

## Key Test IDs (Shared Dev DB)

| Object | ID |
|--------|----|
| Test quiz | `f5521ccc-a6cf-43be-9999-ec2bdf115fd0` |
| Test course | `4022d60f-68d7-40ef-bac1-e58222d1ed1e` |
| Dev tenant | `00000000-0000-0000-0000-00000000000d` |

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
- 0 TypeScript errors (`npm run lint` clean)
- Build passes (`npm run build` clean)
- No console errors on happy paths
- All user-visible text in Bahasa Indonesia
- Dark mode works on all pages
- Mobile responsive at 375px

## Known Post-Ship Limitations

| ID | Description |
|----|-------------|
| BUG-C3-006 | QuizPlayer: `isOnline` hardcoded to `true` — offline warning never shows |
| BUG-C3-008 | HubView: no empty-state when 0 items match role |
| NEW-QA4-002 | Gradebook: uses local mock data, no Supabase persistence |
| FG-PRE-001 | No self-serve school registration wizard |
| BUG-C2-002 | Student course discovery is join-code only (by design) |
| BUG-PRE-006 | Workspace selector "No Workspace Access" text in English |
