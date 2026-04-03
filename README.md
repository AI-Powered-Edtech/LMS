# EduSync LMS

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL+RLS-3FCF8E?logo=supabase&logoColor=white)
![Status](https://img.shields.io/badge/status-production--ready-brightgreen)

A multi-tenant SaaS Learning Management System built for Indonesian schools. EduSync supports multiple school organizations (tenants) on a shared platform with complete data isolation via PostgreSQL Row-Level Security. All student/teacher-facing UI text is in Bahasa Indonesia.

---

## Quick Start

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server → http://localhost:5173
pnpm build            # Production build → dist/
pnpm test             # Run unit tests (Vitest)
pnpm test:e2e         # Run E2E tests (Playwright)
pnpm typecheck        # TypeScript check
pnpm lint             # ESLint
```

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for complete setup instructions.

---

## Architecture

- **Frontend:** React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL + Auth + RLS + 23 Edge Functions)
- **State:** React Query v5 (server), Zustand v5 (local quiz state)
- **Routing:** React Router v7 (hash routing — all URLs use `/#/` prefix)
- **Testing:** Vitest (unit), Playwright (E2E — 24 flows + cross-cutting)

### Key Principles

- **Supabase-centric** — no traditional backend server. All business logic lives in PostgreSQL (SQL functions, triggers, RLS) or Supabase Edge Functions
- **Multi-tenant** — every tenant is a school. Data isolation via `tenant_id` + RLS policies
- **Role-based access** — 5 roles: `student`, `teacher`, `admin`, `parent`, `principal`
- **Feature modules** — 32 domain-based modules under `src/features/`

---

## Project Structure

```
src/
├── app/                    # App bootstrap (routes, providers, query client)
│   ├── routes/             # Domain-based route splits
│   └── lazyPages.tsx       # Lazy-loaded page registry
├── components/             # Shared UI components
│   ├── ui/                 # UI primitives (Button, Card, Modal, etc.)
│   ├── layout/             # Layout components
│   ├── guards/             # AuthGuard, RoleGuard, TenantGuard
│   └── skeletons/          # Loading skeleton components
├── contexts/               # React contexts (Auth, Theme, Builder)
├── features/               # 32 feature modules (see below)
├── hooks/                  # Shared custom hooks
├── lib/                    # Utility libraries
├── pages/                  # Thin page entry points
├── services/               # Supabase client
├── shared/                 # Shared types, schemas, config
├── styles/                 # Global styles
├── testing/                # Testing utilities
└── utils/                  # App-wide utilities
```

### Feature Modules (32)

| Module            | Domain         | Description                                    |
| ----------------- | -------------- | ---------------------------------------------- |
| `administration`  | Admin          | Tenant management, school module configuration |
| `ai-tutor`        | Learning       | AI-powered study assistant (Groq)              |
| `analytics`       | Analytics      | Teacher & admin analytics dashboards           |
| `announcements`   | Communication  | School announcement system                     |
| `assignments`     | Assessment     | Assignment management & grading                |
| `attendance`      | Academic       | Attendance tracking                            |
| `auth`            | Identity       | Authentication flows                           |
| `calendar`        | Academic       | Academic calendar integration                  |
| `classroom`       | Academic       | Virtual & physical class management            |
| `courses`         | Academic       | Course catalog & builder                       |
| `creator`         | Content        | AI content generation                          |
| `dashboards`      | Analytics      | Custom dashboard with widget builder           |
| `discussions`     | Communication  | Per-course discussion forums                   |
| `gamification`    | Engagement     | XP, badges, levels, streaks, leaderboard       |
| `gradebook`       | Assessment     | Digital gradebook, SpeedGrader                 |
| `guidance`        | Admin          | In-app walkthroughs, tooltips                  |
| `lessons`         | Learning       | Lesson viewer, Smart Player, SCORM             |
| `lti`             | Integration    | LTI 1.3 integration                            |
| `moderation`      | Admin          | Content moderation                             |
| `notifications`   | Communication  | In-app + push notifications                    |
| `onboarding`      | Admin          | New user onboarding wizard                     |
| `parent`          | Parent         | Parent portal                                  |
| `principal`       | Principal      | Principal executive dashboard                  |
| `profile`         | Identity       | User profile management                        |
| `progress`        | Learning       | Progress tracking                              |
| `question-bank`   | Assessment     | Reusable question bank                         |
| `quizzes`         | Assessment     | Quiz player, grading, anti-cheat               |
| `recommendations` | Learning       | Content recommendation engine                  |
| `reports`         | Analytics      | Academic & financial report generator          |
| `settings`        | Identity       | User settings                                  |
| `storage`         | Infrastructure | File & media management                        |
| `struggle`        | Analytics      | Automatic struggle detection                   |

---

## Documentation

| Document                                                   | Description                                    |
| ---------------------------------------------------------- | ---------------------------------------------- |
| [docs/DX.md](docs/DX.md)                                   | Developer experience guide & documentation map |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)               | System architecture                            |
| [docs/DATABASE.md](docs/DATABASE.md)                       | Database reference (tables, columns, RPCs)     |
| [docs/SECURITY.md](docs/SECURITY.md)                       | Security model & threat mitigations            |
| [docs/TESTING.md](docs/TESTING.md)                         | Test accounts, unit & E2E guide                |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                   | Deployment guide                               |
| [docs/ENGINEERING_ROADMAP.md](docs/ENGINEERING_ROADMAP.md) | Phase status & roadmap                         |
| [CHANGELOG.md](CHANGELOG.md)                               | All changes by phase                           |

---

## Test Accounts

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | Teacher |
| `student@edusync.dev` | `password123` | Student |
| `admin@edusync.dev`   | `password123` | Admin   |

---

## License

Proprietary — EduSync LMS © 2026
