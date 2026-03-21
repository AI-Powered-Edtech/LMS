# EduSync LMS

EduSync is a multi-tenant SaaS Learning Management System built for Indonesian schools. It supports multiple school organizations (tenants) on a shared platform with complete data isolation. All user-facing text is in Bahasa Indonesia.

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions + RLS)
- **Routing:** React Router v7, hash-based routing (`/#/`)
- **State:** React Context (Auth, Builder, Theme, Toast) + React Query v5 for server state + Zustand for local feature state
- **UI:** Lucide React, Framer Motion (`motion`), Recharts, Tailwind Merge
- **Testing:** Vitest (unit), Playwright (E2E)

## Prerequisites

- Node.js 20+
- A Supabase project (see [docs/AUTH.md](docs/AUTH.md) for setup)

## Environment Variables

Create a `.env.local` file at project root. All variables read by the app (verified by searching `import.meta.env` in `src/`):

```bash
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
VITE_DEV_PASSWORD=password123   # Optional: pre-fills Quick Login buttons in dev
```

Do NOT commit `.env.local` — it is in `.gitignore`.

## Setup

```bash
npm install
npm run dev          # Start dev server at http://localhost:5173
npm run build        # Production build → dist/
npm run lint         # TypeScript type check (npx tsc --noEmit)
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

## Database Setup

Apply migrations in numeric order from `supabase/migrations/`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full instructions.

## Project Structure

```
src/
├── app/               # App entry, routes.tsx
├── components/        # Shared UI components
│   ├── guards/        # AuthGuard, TenantGuard, RoleGuard, CourseEnrollmentGuard
│   ├── layout/        # Header, Sidebar, Layout, AppLoading
│   └── LessonViewer/  # Smart Player components
├── contexts/          # React contexts: AuthContext, BuilderContext, ThemeContext, ToastContext
├── features/          # Feature modules (see below)
├── hooks/             # Shared React hooks
├── pages/             # Page components (lazy-loaded via routes.tsx)
├── config/            # navigation.ts, feature flags
└── lib/               # supabase.ts client
```

### Feature Modules (`src/features/`)

| Module | Domain |
|--------|--------|
| `analytics` | Teacher analytics dashboard |
| `ai-tutor` | AI Tutor context and chat |
| `announcements` | Class announcements |
| `assignments` | Assignment submission and grading |
| `classroom` | Class management, enrollments |
| `courses` | Course catalog and builder |
| `gamification` | XP, badges, leaderboard, streaks |
| `guidance` | In-app walkthroughs and tooltips |
| `lessons` | Lesson viewer, progress tracking |
| `quizzes` | Quiz player, question bank, grading |
| `recommendations` | Smart next-lesson recommendations |
| `struggle` | Struggle detection and alerts |
| `notifications` | In-app notification system |

## Routing

All routes use hash-based routing. Primary routes:

| Path | Access |
|------|--------|
| `/#/login` | Public |
| `/#/app/student` | Student dashboard |
| `/#/app/teacher` | Teacher dashboard |
| `/#/app/admin` | Admin dashboard |
| `/#/analytics` | Teacher/Admin |
| `/#/teaching/course-builder` | Teacher/Admin |
| `/#/teaching/quiz-manager` | Teacher/Admin |
| `/#/leaderboard` | Student/Teacher |
| `/#/gradebook` | Teacher/Admin |

## Further Reading

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture
- [docs/DATABASE.md](docs/DATABASE.md) — Database schema reference
- [docs/AUTH.md](docs/AUTH.md) — Authentication and setup
- [docs/SECURITY.md](docs/SECURITY.md) — Security model
- [docs/GAMIFICATION.md](docs/GAMIFICATION.md) — XP, badges, leaderboard
- [docs/ANALYTICS.md](docs/ANALYTICS.md) — Teacher analytics
- [docs/TESTING.md](docs/TESTING.md) — Testing guide
- [CONTRIBUTING.md](CONTRIBUTING.md) — Developer guide
- [DEPLOYMENT.md](DEPLOYMENT.md) — Deployment guide
- [CHANGELOG.md](CHANGELOG.md) — Version history
