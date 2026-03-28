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

- `src/app/routes.tsx` — route tree orchestrator (imports from domain route files)
- `src/app/routes/` — domain-based route splits (see below)
- `src/app/lazyPages.tsx` — all lazy-loaded page imports with error boundaries
- `src/app/legacyRedirects.tsx` — backward-compatible URL redirects
- `src/components/guards/` — all guard components
- `src/components/RoleRoute.tsx` — simple role-based route wrapper

### Route Splitting (Phase 21C)

The monolithic route tree was split into domain-based files under `src/app/routes/`:

| File                  | Purpose                                       |
| --------------------- | --------------------------------------------- |
| `index.tsx`           | Re-exports and composes all route segments    |
| `studentRoutes.tsx`   | All `/app/student/*` routes                   |
| `teacherRoutes.tsx`   | All `/app/teacher/*` and `/teaching/*` routes |
| `adminRoutes.tsx`     | All `/app/admin/*` and `/admin/*` routes      |
| `sharedRoutes.tsx`    | Routes accessible to multiple roles           |
| `legacyRedirects.tsx` | Backward-compatible URL redirects             |
| `utils.tsx`           | Shared route utilities (guards, wrappers)     |

### Page Refactors (Phase 21C)

Ten large page components were refactored from monolithic files into feature-module hooks and components:

- Logic extracted into `src/features/*/hooks/` custom hooks
- UI split into smaller, composable components in `src/features/*/components/`
- Pages in `src/pages/` became thin entry points that compose hooks and components

### Service File Splits (Phase 21C)

Four oversized service files were split into focused modules:

- Each service was decomposed into smaller, single-responsibility files
- Collocated with their respective feature modules under `src/features/*/api/`

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
