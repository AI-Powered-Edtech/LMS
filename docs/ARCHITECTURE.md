# EduSync LMS — System Architecture

## Overview

EduSync is a Supabase-centric SaaS LMS. There is no traditional backend server. All business logic lives in PostgreSQL (SQL functions, triggers, RLS) or Supabase Edge Functions. The frontend is a React SPA that communicates directly with Supabase.

## Frontend

| Technology               | Version | Role                              |
| ------------------------ | ------- | --------------------------------- |
| React                    | 19      | UI framework                      |
| Vite                     | 6       | Build tool, dev server            |
| TypeScript               | 5.8     | Type safety                       |
| Tailwind CSS             | 4       | Styling                           |
| React Router             | 7       | Hash-based routing                |
| React Query              | 5       | Server state, caching             |
| Zustand                  | 5       | Local feature state (quiz player) |
| Framer Motion (`motion`) | 12      | Animations                        |
| Recharts                 | 3       | Analytics charts                  |
| Lucide React             | 0.546   | Icons                             |

## Routing

- Hash-based routing: all URLs use `/#/` prefix (configured via `HashRouter` in `src/main.tsx`).
- Primary guard chain: `AuthGuard` → `TenantGuard` → `Layout` → `RoleGuard` / `RoleRoute`
- `RoleRoute` wraps individual routes to restrict by role string or array
- `RoleGuard` is used inside `/app/student`, `/app/teacher`, `/app/admin` prefixed routes
- `CourseEnrollmentGuard` verifies enrollment before allowing lesson access
- `TenantGuard` redirects to `/workspace-selector` if user has no active tenant
- Unauthenticated users are redirected to `/#/login`

**Key files:**

- `src/app/routes/index.tsx` — route tree orchestrator (imports from domain route files)
- `src/app/routes/` — domain-based route splits (see below)
- `src/app/lazyPages.tsx` — all lazy-loaded page imports with error boundaries
- `src/app/legacyRedirects.tsx` — backward-compatible URL redirects
- `src/components/guards/` — all guard components (AuthGuard, RoleGuard, TenantGuard, CourseEnrollmentGuard, RoleResolver)

### Route Splitting (Phase 21C)

The monolithic route tree was split into domain-based files under `src/app/routes/`:

| File                  | Purpose                                       | Roles               |
| --------------------- | --------------------------------------------- | ------------------- |
| `index.tsx`           | Re-exports and composes all route segments    | All                 |
| `studentRoutes.tsx`   | All `/app/student/*` routes                   | student             |
| `teacherRoutes.tsx`   | All `/app/teacher/*` and `/teaching/*` routes | teacher             |
| `adminRoutes.tsx`     | All `/app/admin/*` and `/admin/*` routes      | admin               |
| `parentRoutes.tsx`    | All `/app/parent/*` routes                    | parent, admin       |
| `principalRoutes.tsx` | All `/app/principal/*` routes                 | principal, admin    |
| `sharedRoutes.tsx`    | Routes accessible to multiple roles           | All (auth + public) |
| `legacyRedirects.tsx` | Backward-compatible URL redirects             | All                 |
| `utils.tsx`           | Shared route utilities (guards, wrappers)     | All                 |

### Route Structure

```
Public Routes:
  /#/login                           → Login page
  /#/forgot-password                 → Password recovery
  /#/reset-password                  → Password reset
  /#/verify-email                    → Email verification
  /#/workspace-selector              → Tenant picker
  /#/unauthorized                    → Access denied
  /#/404                             → Not found
  /#/offline                         → Offline fallback
  /#/invite/:token                   → Invite redemption
  /#/join                            → Class join
  /#/register-parent                 → Parent registration
  /#/lti/callback                    → LTI callback

Student Routes (/#/app/student/):
  /dashboard, /courses, /quizzes, /assignments, /classes/:classId,
  /certificates, /grades, /attendance, /gamification, /leaderboard

Teacher Routes (/#/app/teacher/):
  /dashboard, /teaching-hub, /courses, /course-builder, /quiz-manager,
  /question-bank, /quiz-gradebook, /assignment-gradebook, /gradebook,
  /grader, /course-analytics, /dashboards, /classes, /analytics,
  /scan-attendance, /documents, /creator, /student-progress, /leaderboard,
  /moderation, /struggle, /preview/:courseId

Admin Routes (/#/app/admin/):
  /dashboard, /users, /billing, /moderation, /finance, /ppdb, /administration,
  /audit, /analytics, /course-analytics, /documents, /creator, /courses,
  /course-builder, /quiz-manager, /question-bank, /gradebook, /quiz-gradebook,
  /assignment-gradebook, /grader, /classes, /scan-attendance, /student-progress,
  /system-health, /feature-flags, /struggle

Parent Routes (/#/app/parent/):
  /dashboard, /nilai, /kehadiran, /pesan, /pesan/:threadId, /pengaturan,
  /laporan, /laporan/:studentId/:year/:month

Principal Routes (/#/app/principal/):
  /dashboard, /settings, /report, /analytics, /survey

Shared Auth Routes:
  /#/forum, /#/profile, /#/p/:username, /#/settings, /#/calendar,
  /#/announcements, /#/assignments, /#/group-assignment, /#/directory,
  /#/social-hub, /#/notifications
```

### Page Refactors (Phase 21C)

Large page components were refactored from monolithic files into feature-module hooks and components:

- Logic extracted into `src/features/*/hooks/` custom hooks
- UI split into smaller, composable components in `src/features/*/components/`
- Pages in `src/pages/` became thin entry points that compose hooks and components

### Service Architecture

While domain-specific API logic is collocated within feature modules (`src/features/*/api/`), core infrastructure services remain in a top-level directory:

- `src/services/supabase/client.ts` — Shared Supabase client initialization and singleton export.
- `src/services/supabase/auth.ts` — Auth-related helper methods (if present).
- `src/lib/` — Third-party library wrappers and generic utilities.

Oversized legacy service files have been split and moved to their respective feature modules under `src/features/*/api/`.

## Multi-Tenant Architecture

EduSync is multi-tenant. Each tenant represents a school organization. See [TENANT_ARCHITECTURE.md](TENANT_ARCHITECTURE.md) for the complete flow.

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
- Additional roles (`parent`, `principal`) are managed at the application level

**Frontend role access:**

```tsx
// Always use useAuth() for identity
const { user, profile, role, tenantId } = useAuth()

// role values: 'student' | 'teacher' | 'admin' | 'parent' | 'principal' (lowercase)
// Role comes from user_roles table, NOT profile.role

// Route protection
<RoleRoute role="teacher">
  <TeacherPage />
</RoleRoute>

// Multiple roles
<RoleRoute role={["student", "teacher"]}>
  <SharedPage />
</RoleRoute>

// Guard chain: AuthGuard → TenantGuard → RoleGuard
```

## State Management

| Layer          | Tool           | Purpose                              |
| -------------- | -------------- | ------------------------------------ |
| Server state   | React Query v5 | Data fetching, caching, invalidation |
| Local state    | Zustand v5     | Quiz player state only               |
| Global context | React Context  | Auth, Theme, Builder                 |

**React Query patterns:**

- Queries in `src/features/*/queries/`
- Query keys in `src/shared/lib/queryKeys.ts`
- Stale time constants in `src/utils/queryConstants.ts` (`STALE.STATIC`, `STALE.MODERATE`, `STALE.DYNAMIC`, `STALE.REALTIME`)

## Feature Module Structure

Each feature follows a standard structure in `src/features/{domain}/`:

```
src/features/{domain}/
├── api/            ← Supabase calls (DB queries, RPC, Edge Functions)
├── queries/        ← React Query hooks (useQuery, useMutation)
├── hooks/          ← Custom React hooks (non-query business logic)
├── types/          ← TypeScript interfaces (index.ts)
├── components/     ← React components for this domain
├── store/          ← Zustand store (only if needed — e.g., quizzes)
├── utils/          ← Pure utility functions
├── __tests__/      ← Vitest unit tests
├── index.ts        ← Public barrel export
└── README.md       ← Feature documentation
```

**49 feature modules:**

`accessibility`, `adaptive-paths`, `administration`, `ai-authoring`, `ai-quiz-gen`, `ai-recommendations`, `ai-tutor`, `analytics`, `announcements`, `assignments`, `attendance`, `auth`, `calendar`, `certificates`, `classroom`, `course-builder`, `courses`, `creator`, `dashboards`, `discussions`, `gamification`, `gradebook`, `guidance`, `interactive-blocks`, `lessons`, `lti`, `moderation`, `notifications`, `onboarding`, `parent`, `peer-review`, `plagiarism`, `principal`, `profile`, `progress`, `question-bank`, `quests`, `quizzes`, `recommendations`, `reports`, `rubrics`, `search`, `semester`, `settings`, `storage`, `struggle`, `surveys`, `video`, `xapi`

## Database Architecture

- PostgreSQL on Supabase with Row-Level Security
- 200+ tables with RLS enabled
- 400+ RLS policies
- 133 migration files (including archived)
- All tables use `tenant_id` for multi-tenant isolation
- `auto_set_tenant_id()` trigger on all new tables
- SQL functions use `SECURITY DEFINER` with `SET search_path TO 'public'`

See [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md) for complete table and RPC reference.

## Edge Functions

28 Deno Edge Functions deployed to Supabase (`supabase/functions/`):

| Function                     | Purpose                         | Auth              |
| ---------------------------- | ------------------------------- | ----------------- |
| `ai-grade-essay`             | AI essay grading via Groq       | User JWT          |
| `ai-tutor`                   | AI tutor chat                   | User JWT          |
| `generate-ai-content`        | AI content generation           | User JWT          |
| `generate-pdf`               | PDF certificate generation      | User JWT          |
| `grade-quiz-attempt`         | Background quiz grading         | Service role      |
| `health-check`               | System health status            | None (public)     |
| `load-quiz-data`             | Load quiz for student           | User JWT          |
| `process-progress-events`    | Batch progress event processing | API key           |
| `progress-events`            | Enqueue progress events         | User JWT          |
| `send-email-digest`          | Email digest sender             | Service role      |
| `send-push`                  | Push notification sender        | User JWT          |
| `lti-jwks`                   | Public JWKS for LTI platforms   | None (public GET) |
| `lti-oidc-login`             | LTI OIDC login initiation       | None (platform)   |
| `lti-launch`                 | LTI launch token validation     | None (LTI)        |
| `lti-grade-passback`         | LTI 1.3 grade passback          | Service role      |
| `scorm-extract`              | SCORM ZIP extraction            | User JWT          |
| `check-plagiarism`           | Plagiarism detection check      | User JWT          |
| `generate-quiz-from-content` | AI quiz generation              | User JWT          |
| `recommend-learning-path`    | AI path recommendation          | User JWT          |
| `video-webhook`              | Video processing webhook        | Service role      |
| `generate-executive-report`  | Executive report generation     | Service role      |
| `generate-parent-report`     | Parent report generation        | Service role      |
| `bulk-import-users`          | Bulk user import                | Service role      |
| `check-rate-limit`           | Rate limiting check             | Service role      |
| `send-parent-digest`         | Parent digest sending           | Service role      |
| `send-parent-otp`            | Parent OTP sending              | Service role      |
| `whatsapp-webhook`           | WhatsApp webhook handler        | Service role      |

## Security Model

- **Row-Level Security** — all tenant-scoped tables have RLS enabled
- **Tenant isolation** — `tenant_id = get_my_tenant_id()` policy on all tables
- **CSP headers** — enforced Content-Security-Policy in `index.html`
- **Sentry monitoring** — error tracking with PII scrubbing
- **Rate limiting** — server-side rate limiting via `check-rate-limit` Edge Function
- **Input sanitization** — `escapeHtml()` and `sanitizeUrl()` utilities

See [SECURITY.md](SECURITY.md) for complete security documentation.

## Testing

| Type          | Tool       | Location                                                                                                         | Count          |
| ------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | -------------- |
| Unit          | Vitest     | `src/**/__tests__/*.test.ts(x)`                                                                                  | 700+ tests     |
| E2E           | Playwright | `e2e/*.spec.ts`, `e2e/critical-paths/`, `e2e/flows/`, `e2e/flows-phase26-30/`, `e2e/gradebook/`, `e2e/security/` | 400+ scenarios |
| Cross-cutting | Playwright | `e2e/visual-regression.spec.ts`, `e2e/dark-mode.spec.ts`                                                         | 4 suites       |

See [TESTING.md](TESTING.md) for complete testing guide.

## CI/CD

- GitHub Actions for typecheck, lint, test, build, bundle size check
- Pre-commit hooks via Husky + lint-staged
- Bundle size enforcement via bundlesize2
- E2E tests run on PR with pre-authenticated storage states
