# EduSync LMS

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL+RLS-3FCF8E?logo=supabase&logoColor=white)
![Coverage](https://img.shields.io/badge/coverage-pending-lightgrey)

A multi-tenant SaaS Learning Management System built for Indonesian schools. EduSync supports multiple school organizations (tenants) on a shared platform with complete data isolation via PostgreSQL Row-Level Security. All student/teacher-facing UI text is in Bahasa Indonesia.

---

## Architecture

```mermaid
graph TB
    subgraph Presentation["Presentation Layer — React 19 + Vite 6"]
        Pages["Pages (lazy-loaded)"]
        Features["24 Feature Modules"]
        Guards["Auth Guard Chain"]
        RQ["React Query v5 (server state)"]
        Zustand["Zustand v5 (local state)"]
    end

    subgraph AuthChain["3-Layer Auth Guard Chain"]
        direction LR
        AG["AuthGuard<br/>(session check)"] --> TG["TenantGuard<br/>(tenant resolution)"] --> RG["RoleGuard<br/>(role enforcement)"]
    end

    subgraph Supabase["Supabase — No Traditional Backend"]
        Auth["Auth (GoTrue)"]
        PG["PostgreSQL<br/>+ RLS Policies"]
        RPC["SQL Functions (RPC)"]
        EF["Edge Functions<br/>(AI, email, webhooks)"]
        RT["Realtime"]
    end

    subgraph FeatureModules["Feature Modules (src/features/)"]
        direction LR
        FM1["courses | quizzes | lessons"]
        FM2["analytics | gamification | ai-tutor"]
        FM3["assignments | classroom | discussions"]
        FM4["notifications | reports | progress"]
        FM5["recommendations | struggle | guidance"]
        FM6["announcements | calendar | storage"]
        FM7["dashboards | administration | moderation"]
        FM8["question-bank"]
    end

    Pages --> Guards
    Guards --> AuthChain
    Pages --> Features
    Features --> FeatureModules
    Features --> RQ
    RQ -->|"supabase-js v2"| Auth
    RQ -->|"queries & mutations"| PG
    RQ -->|"RPC calls"| RPC
    RQ -->|"invoke()"| EF
    PG -->|"tenant_id isolation"| RPC
```

### Key Architectural Decisions

- **No traditional backend** -- no Express, NestJS, or custom Node servers. All business logic lives in PostgreSQL (RLS policies, SQL functions, triggers) or Supabase Edge Functions.
- **Database-first** -- critical logic (tenant isolation, access control, grade calculations) is implemented in SQL, not in the frontend.
- **Multi-tenant via RLS** -- every tenant-scoped table includes `tenant_id`; Row-Level Security policies enforce isolation at the database level.
- **Feature-module architecture** -- 24 self-contained modules under `src/features/`, each with its own `api/`, `queries/`, `types/`, and `components/` subdirectories.
- **Event-driven telemetry** -- high-frequency events (lesson progress, quiz attempts) use client-side batching and Edge Function ingestion.

---

## Prerequisites

| Tool             | Version | Notes                                                            |
| ---------------- | ------- | ---------------------------------------------------------------- |
| **Node.js**      | 20+     | LTS recommended                                                  |
| **pnpm**         | 9+      | `npm install -g pnpm`                                            |
| **Supabase CLI** | latest  | `npm install -g supabase` -- needed for local dev and migrations |
| **Git**          | 2.30+   |                                                                  |

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/edusync-lms.git
cd edusync-lms

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your Supabase project URL and anon key

# 4. Start Supabase locally (optional -- or use a remote project)
supabase start

# 5. Start the dev server
pnpm dev
# App runs at http://localhost:5173
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. Do **not** commit `.env` to version control.

| Variable                 | Required | Description                                                |
| ------------------------ | -------- | ---------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL (`https://<ref>.supabase.co`)         |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anon/public key (safe for frontend)               |
| `VITE_DEV_PASSWORD`      | No       | Pre-fills Quick Login buttons on the login page (dev only) |

**Edge Function secrets** (set via `supabase secrets set`, not in `.env`):

| Secret                      | Purpose                            |
| --------------------------- | ---------------------------------- |
| `GROQ_API_KEY`              | AI Tutor and AI Grading (via Groq) |
| `SUPABASE_URL`              | Auto-available in Edge Functions   |
| `SUPABASE_ANON_KEY`         | Auto-available in Edge Functions   |
| `SUPABASE_SERVICE_ROLE_KEY` | Auto-available in Edge Functions   |
| `SUPABASE_DB_URL`           | Auto-available in Edge Functions   |

---

## Available Scripts

| Script          | Command           | Description                          |
| --------------- | ----------------- | ------------------------------------ |
| `pnpm dev`      | `vite --host`     | Start dev server with network access |
| `pnpm build`    | `vite build`      | Production build to `dist/`          |
| `pnpm preview`  | `vite preview`    | Preview production build locally     |
| `pnpm clean`    | `rm -rf dist`     | Remove build artifacts               |
| `pnpm lint`     | `tsc --noEmit`    | TypeScript type checking (no emit)   |
| `pnpm test`     | `vitest`          | Run unit tests with Vitest           |
| `pnpm test:e2e` | `playwright test` | Run end-to-end tests with Playwright |

---

## Project Structure

```
src/
├── app/                    # App entry point, routes.tsx
├── App.tsx                 # Root component
├── main.tsx                # Vite entry
│
├── components/             # Shared UI components
│   ├── guards/             # AuthGuard, TenantGuard, RoleGuard, RoleResolver,
│   │                       # CourseEnrollmentGuard
│   ├── layout/             # Header, Sidebar, Layout, AppLoading
│   ├── LessonViewer/       # Smart Player components
│   ├── CourseBuilder/       # Course builder UI
│   ├── CourseOverview/      # Course overview UI
│   ├── ui/                 # Reusable primitives (buttons, modals, etc.)
│   ├── common/             # Shared domain components
│   ├── admin/              # Admin panel components
│   └── moderation/         # Content moderation UI
│
├── config/                 # navigation.ts, feature flags
├── constants/              # App-wide constants
├── contexts/               # React contexts (Auth, Builder, Theme, Toast)
├── domain/                 # Domain types and logic
├── hooks/                  # Shared React hooks
├── lib/                    # Supabase client (supabase.ts)
├── pages/                  # Page components (thin, lazy-loaded via routes.tsx)
├── services/               # Shared service utilities
├── utils/                  # General utility functions
│
└── features/               # 24 feature modules (see below)
    ├── administration/     # Tenant administration
    ├── ai-tutor/           # AI Tutor context, chat, prompt engineering
    ├── analytics/          # Teacher analytics dashboard, charts
    ├── announcements/      # Class announcements
    ├── assignments/        # Assignment submission and grading
    ├── calendar/           # Academic calendar
    ├── classroom/          # Class management, enrollments
    ├── courses/            # Course catalog and builder logic
    ├── dashboards/         # Role-specific dashboard data
    ├── discussions/        # Class discussions / forums
    ├── gamification/       # XP, badges, leaderboard, streaks
    ├── guidance/           # In-app walkthroughs, onboarding tooltips
    ├── lessons/            # Lesson viewer, Smart Player, progress tracking
    ├── moderation/         # Content moderation queries
    ├── notifications/      # In-app notification system
    ├── progress/           # Student progress tracking
    ├── question-bank/      # Shared question bank management
    ├── quizzes/            # Quiz player, grading, Zustand store
    ├── recommendations/    # Smart next-lesson recommendations
    ├── reports/            # Academic reports and exports
    ├── storage/            # File storage abstraction
    └── struggle/           # Struggle detection and teacher alerts
```

Each feature module follows a consistent internal structure:

```
features/<module>/
├── api/          # Supabase query functions
├── queries/      # React Query hooks (useQuery, useMutation)
├── types/        # TypeScript interfaces and types
├── components/   # Module-specific UI components
├── hooks/        # Module-specific React hooks
├── store/        # Zustand stores (where applicable)
├── utils/        # Module-specific utilities
└── index.ts      # Public barrel export
```

---

## Routing

All routes use hash-based routing (`/#/`). Route protection is enforced by the guard chain: `AuthGuard` -> `TenantGuard` -> `RoleGuard`.

| Path                         | Access           |
| ---------------------------- | ---------------- |
| `/#/login`                   | Public           |
| `/#/app/student/*`           | Student          |
| `/#/app/teacher/*`           | Teacher          |
| `/#/app/admin/*`             | Admin            |
| `/#/teaching/course-builder` | Teacher, Admin   |
| `/#/teaching/quiz-manager`   | Teacher, Admin   |
| `/#/analytics`               | Teacher, Admin   |
| `/#/gradebook`               | Teacher, Admin   |
| `/#/leaderboard`             | Student, Teacher |

---

## Database

Migrations live in `supabase/migrations/` and should be applied in numeric order. See [docs/DATABASE.md](docs/DATABASE.md) for the full schema reference and [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md) for Row-Level Security details.

Key constraints:

- Every tenant-scoped table has a `tenant_id` column
- RLS policies enforce `tenant_id = get_my_tenant_id()` on all operations
- All RPCs include `auth.uid() IS NOT NULL` checks
- Queries are paginated on large tables; `SELECT *` is never used

---

## Documentation

| Document                                                       | Description                           |
| -------------------------------------------------------------- | ------------------------------------- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                   | System architecture overview          |
| [docs/DATABASE.md](docs/DATABASE.md)                           | Database schema and RPC reference     |
| [docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md) | Detailed database architecture        |
| [docs/AUTH.md](docs/AUTH.md)                                   | Authentication flow and setup         |
| [docs/SECURITY.md](docs/SECURITY.md)                           | Security model and threat mitigations |
| [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md)                   | Row-Level Security policy catalog     |
| [docs/TENANT_ARCHITECTURE.md](docs/TENANT_ARCHITECTURE.md)     | Multi-tenant architecture details     |
| [docs/ANALYTICS.md](docs/ANALYTICS.md)                         | Teacher analytics system              |
| [docs/GAMIFICATION.md](docs/GAMIFICATION.md)                   | XP, badges, leaderboard               |
| [docs/TESTING.md](docs/TESTING.md)                             | Testing guide and test accounts       |
| [docs/ENGINEERING_ROADMAP.md](docs/ENGINEERING_ROADMAP.md)     | Engineering phase roadmap             |
| [docs/DEVELOPER_RUNBOOK.md](docs/DEVELOPER_RUNBOOK.md)         | Developer runbook and recipes         |
| [CONTRIBUTING.md](CONTRIBUTING.md)                             | Contribution guidelines               |
| [CHANGELOG.md](CHANGELOG.md)                                   | Version history                       |

---

## License

Proprietary. All rights reserved.
