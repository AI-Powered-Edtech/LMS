# EduSync LMS

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![VIL](https://img.shields.io/badge/VIL-Rust+PostgreSQL+RLS-orange)
![Status](https://img.shields.io/badge/status-release--candidate-orange)

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
- **Backend:** VIL Rust backend (PostgreSQL via sqlx + Auth + RLS)
- **State:** React Query v5 (server), Zustand v5 (local quiz state)
- **Routing:** React Router v7 (hash routing — all URLs use `/#/` prefix)
- **Testing:** Vitest (unit), Playwright (E2E — 400+ scenarios across 50+ suites)

### Key Principles

- **VIL-native** — VIL Rust backend handles all API, auth, storage, and realtime. Business logic lives in PostgreSQL (SQL functions, triggers, RLS) and VIL handlers (`edusync-api/`)
- **Multi-tenant** — every tenant is a school. Data isolation via `tenant_id` + RLS policies
- **Role-based access** — 5 roles: `student`, `teacher`, `admin`, `parent`, `principal`
- **Feature modules** — 49 domain-based modules under `src/features/`

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
├── features/               # 49 feature modules (see below)
├── hooks/                  # Shared custom hooks
├── lib/                    # Utility libraries
├── pages/                  # Thin page entry points
├── services/               # VIL service clients (api, auth, storage, realtime)
├── shared/                 # Shared types, schemas, config
├── styles/                 # Global styles
├── testing/                # Testing utilities
└── utils/                  # App-wide utilities
```

### Feature Modules (49)

| Module               | Domain         | Description                                    |
| -------------------- | -------------- | ---------------------------------------------- |
| `accessibility`      | UI/UX          | Accessibility testing & compliance             |
| `adaptive-paths`     | Learning       | Adaptive learning path engine                  |
| `administration`     | Admin          | Tenant management, school module configuration |
| `ai-authoring`       | Content        | AI-assisted lesson authoring                   |
| `ai-quiz-gen`        | Assessment     | AI quiz generation from content                |
| `ai-recommendations` | Learning       | AI-powered personalized recommendations        |
| `ai-tutor`           | Learning       | AI-powered study assistant (Groq)              |
| `analytics`          | Analytics      | Teacher & admin analytics dashboards           |
| `announcements`      | Communication  | School announcement system                     |
| `assignments`        | Assessment     | Assignment management & grading                |
| `attendance`         | Academic       | Attendance tracking                            |
| `auth`               | Identity       | Authentication flows                           |
| `calendar`           | Academic       | Academic calendar integration                  |
| `certificates`       | Learning       | Certificate generation & management            |
| `classroom`          | Academic       | Virtual & physical class management            |
| `course-builder`     | Content        | Drag-and-drop course builder                   |
| `courses`            | Academic       | Course catalog & builder                       |
| `creator`            | Content        | AI content generation                          |
| `dashboards`         | Analytics      | Custom dashboard with widget builder           |
| `discussions`        | Communication  | Per-course discussion forums                   |
| `gamification`       | Engagement     | XP, badges, levels, streaks, leaderboard       |
| `gradebook`          | Assessment     | Digital gradebook, SpeedGrader                 |
| `guidance`           | Admin          | In-app walkthroughs, tooltips                  |
| `interactive-blocks` | Content        | Interactive lesson content blocks              |
| `lessons`            | Learning       | Lesson viewer, Smart Player, SCORM             |
| `lti`                | Integration    | LTI 1.3 integration                            |
| `moderation`         | Admin          | Content moderation                             |
| `notifications`      | Communication  | In-app + push notifications                    |
| `onboarding`         | Admin          | New user onboarding wizard                     |
| `parent`             | Parent         | Parent portal                                  |
| `peer-review`        | Assessment     | Peer review management                         |
| `plagiarism`         | Assessment     | Plagiarism detection integration               |
| `principal`          | Principal      | Principal executive dashboard                  |
| `profile`            | Identity       | User profile management                        |
| `progress`           | Learning       | Progress tracking                              |
| `question-bank`      | Assessment     | Reusable question bank                         |
| `quests`             | Engagement     | Gamified quests & challenges                   |
| `quizzes`            | Assessment     | Quiz player, grading, anti-cheat               |
| `recommendations`    | Learning       | Content recommendation engine                  |
| `reports`            | Analytics      | Academic & financial report generator          |
| `rubrics`            | Assessment     | Assessment rubrics builder                     |
| `search`             | Infrastructure | Global search engine                           |
| `semester`           | Academic       | Semester & academic period management          |
| `settings`           | Identity       | User settings                                  |
| `storage`            | Infrastructure | File & media management                        |
| `struggle`           | Analytics      | Automatic struggle detection                   |
| `surveys`            | Analytics      | School surveys & feedback                      |
| `video`              | Content        | Video hosting & player integration             |
| `xapi`               | Learning       | Experience API (xAPI) tracking                 |

---

## Documentation

| Document                                                                   | Description                                          |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| [docs/README.md](docs/README.md)                                           | Developer experience guide & documentation map       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                               | System architecture                                  |
| [docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md)             | Database reference (tables, columns, RPCs)           |
| [docs/SECURITY.md](docs/SECURITY.md)                                       | Security model & threat mitigations                  |
| [docs/TESTING.md](docs/TESTING.md)                                         | Test accounts, unit & E2E guide                      |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                                   | Deployment guide                                     |
| [docs/PRODUCTION_READINESS_STATUS.md](docs/PRODUCTION_READINESS_STATUS.md) | Production readiness status (single source of truth) |
| [docs/ENGINEERING_ROADMAP.md](docs/ENGINEERING_ROADMAP.md)                 | Phase status & roadmap                               |
| [CHANGELOG.md](CHANGELOG.md)                                               | All changes by phase                                 |

---

## Test Accounts

> ⚠️ **Production Security:** These credentials are for local development only.  
> See [docs/DEVELOPER_RUNBOOK.md](docs/DEVELOPER_RUNBOOK.md) for test account management.

For production deployment, configure VIL backend credentials via environment variables. See `edusync-api/` for backend setup.

---

## License

Proprietary — EduSync LMS © 2026
