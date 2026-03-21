# EduSync LMS — System Architecture

## Overview

EduSync is a Supabase-centric SaaS LMS. There is no traditional backend server. All business logic lives in PostgreSQL (SQL functions, triggers, RLS) or Supabase Edge Functions. The frontend is a React SPA that communicates directly with Supabase.

## Frontend

| Technology | Version | Role |
|-----------|---------|------|
| React | 19 | UI framework |
| Vite | 6 | Build tool, dev server |
| TypeScript | 5.8 | Type safety |
| Tailwind CSS | 4 | Styling |
| React Router | 7 | Hash-based routing |
| React Query | 5 | Server state, caching |
| Zustand | 5 | Local feature state (quiz player) |
| Framer Motion (`motion`) | 12 | Animations |
| Recharts | 3 | Analytics charts |
| Lucide React | 0.546 | Icons |

## Routing

- Hash-based routing: all URLs use `/#/` prefix (configured via `HashRouter` in `src/main.tsx`).
- Primary guard chain: `AuthGuard` → `TenantGuard` → `Layout` → `RoleGuard` / `RoleRoute`
- `RoleRoute` wraps individual routes to restrict by role string or array
- `RoleGuard` is used inside `/app/student`, `/app/teacher`, `/app/admin` prefixed routes
- `CourseEnrollmentGuard` verifies enrollment before allowing lesson access
- `TenantGuard` redirects to `/workspace-selector` if user has no active tenant
- Unauthenticated users are redirected to `/#/login`

**Key files:**
- `src/app/routes.tsx` — full route tree with lazy-loaded pages
- `src/components/guards/` — all guard components
- `src/components/RoleRoute.tsx` — simple role-based route wrapper

## Multi-Tenant Architecture

EduSync is multi-tenant. Each tenant represents a school organization. See [TENANT_ARCHITECTURE.md](../docs/TENANT_ARCHITECTURE.md) for the complete flow.

**Key points:**
- Every tenant-scoped table has a `tenant_id UUID NOT NULL` column with FK to `tenants(id)`
- `get_my_tenant_id()` SQL function returns the calling user's tenant from their profile
- `custom_access_token_hook` injects `tenant_id` into every JWT so the frontend can read it without a DB call
- `auto_set_tenant_id` trigger auto-fills `tenant_id` on INSERT as a safety net
- RLS policies on all tables enforce `tenant_id = get_my_tenant_id()`

## Role System

- Enum: `app_role` — values are `ADMIN`, `TEACHER`, `STUDENT` (stored UPPERCASE)
- Roles stored in `user_roles` table: `(user_id, role, tenant_id)` — NOT in `profiles.role`
- Frontend receives role via `AuthContext` and normalizes to lowercase for route guards
- `has_role(app_role)` SQL function checks role within the caller's tenant

**Frontend role access:**
```tsx
const { role, activeRole } = useAuth();  // 'admin' | 'teacher' | 'student'
```

## State Management

| Concern | Mechanism |
|---------|-----------|
| Auth user, profile, role, session, tenantId | `AuthContext` (`src/contexts/AuthContext.tsx`) |
| Course builder UI state | `BuilderContext` (`src/contexts/BuilderContext.tsx`) |
| Dark/light theme | `ThemeContext` (`src/contexts/ThemeContext.tsx`) |
| Toast notifications | `ToastContext` (`src/contexts/ToastContext.tsx`) |
| Server data (courses, quizzes, etc.) | React Query hooks in `src/features/*/queries/` |
| Quiz player in-progress state | Zustand store in `src/features/quizzes/store/` |

## Feature Module Structure

New features go in `src/features/{domain}/`:

```
src/features/{domain}/
├── api/          # Direct Supabase calls and RPC wrappers
├── queries/      # React Query hooks (useQuery, useMutation)
├── hooks/        # Custom React hooks
├── store/        # Zustand store (only if needed)
├── types/        # TypeScript interfaces and enums
├── components/   # React components for this domain
└── utils/        # Pure utility functions
```

## Backend (Supabase)

| Layer | Technology | Usage |
|-------|-----------|-------|
| Database | PostgreSQL 15 | All persistent data |
| Auth | Supabase Auth (GoTrue) | Email/password, JWT |
| Security | Row Level Security | Tenant isolation, role access |
| Business Logic | SQL functions (RPCs) | Grading, analytics, progress |
| Automation | PostgreSQL triggers | Progress rollup, XP, streaks, badges |
| Scheduled Jobs | pg_cron | Course stats refresh, XP processing |
| External integrations | Edge Functions (Deno) | AI, emails, webhooks |

### Edge Functions (Deno, deployed to Supabase)

| Function | Purpose |
|----------|---------|
| `ai-tutor` | AI chat using Groq llama-3.1-70b-versatile |
| `ai-grade-essay` | AI-assisted essay grading |
| `generate-ai-content` | AI content generation for lessons |
| `grade-quiz-attempt` | Quiz grading pipeline |
| `load-quiz-data` | Quiz data loading for player |
| `progress-events` | Progress event ingestion |
| `process-progress-events` | Progress event queue processor |

Edge Functions are stateless and used only for external API integrations. CRUD operations go directly through Supabase client with RLS.

## Data Flow: Learning Path

```
Student opens lesson
    → LessonViewer fetches get_lesson_viewer_payload() RPC
    → Smart Player renders content (article/video/quiz)
    → ProgressReporter fires LESSON_COMPLETED event
    → handle_lesson_progress_change() trigger runs
    → recompute_course_progress() updates course_progress
    → refresh_course_stats() updates aggregated course_stats
    → Teacher analytics dashboard reads from course_stats
```

## Build Output

```bash
npm run build   # → dist/  (static files for CDN/Vercel/Netlify)
```

Bundle is split into manual chunks:
- `vendor-react` — React, React DOM, React Router
- `vendor-supabase` — Supabase JS client
- `vendor-recharts` — Charts (analytics routes only)
- `vendor-pdf` — jsPDF, html2canvas (export routes only)
- `vendor-katex` — Math rendering
- `vendor-query` — React Query
