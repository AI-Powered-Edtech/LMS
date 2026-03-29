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

```tsx
const { role, activeRole } = useAuth() // 'admin' | 'teacher' | 'student'
```

## State Management

| Concern                                     | Mechanism                                                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth user, profile, role, session, tenantId | `AuthContext` (`src/contexts/AuthContext.tsx`)                                                                                                                              |
| Course builder UI state                     | `BuilderContext` (`src/contexts/BuilderContext.tsx`) — composes domain hooks, realtime presence, mobile state, and offline persistence from `src/features/courses/builder/` |
| Theme (light/dark/system)                   | `ThemeContext` (`src/contexts/ThemeContext.tsx`)                                                                                                                            |
| Toast notifications                         | `ToastContext` (`src/contexts/ToastContext.tsx`)                                                                                                                            |
| Server data (courses, quizzes, etc.)        | React Query hooks in `src/features/*/queries/`                                                                                                                              |
| Quiz player in-progress state               | Zustand store in `src/features/quizzes/store/`                                                                                                                              |

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

| Layer                 | Technology             | Usage                                |
| --------------------- | ---------------------- | ------------------------------------ |
| Database              | PostgreSQL 15          | All persistent data                  |
| Auth                  | Supabase Auth (GoTrue) | Email/password, JWT                  |
| Security              | Row Level Security     | Tenant isolation, role access        |
| Business Logic        | SQL functions (RPCs)   | Grading, analytics, progress         |
| Automation            | PostgreSQL triggers    | Progress rollup, XP, streaks, badges |
| Scheduled Jobs        | pg_cron                | Course stats refresh, XP processing  |
| External integrations | Edge Functions (Deno)  | AI, emails, webhooks                 |

### Edge Functions (Deno, deployed to Supabase)

| Function                  | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `ai-tutor`                | AI chat using Groq llama-3.1-70b-versatile |
| `ai-grade-essay`          | AI-assisted essay grading                  |
| `generate-ai-content`     | AI content generation for lessons          |
| `grade-quiz-attempt`      | Quiz grading pipeline                      |
| `load-quiz-data`          | Quiz data loading for player               |
| `progress-events`         | Progress event ingestion                   |
| `process-progress-events` | Progress event queue processor             |

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
- `vendor-pdf` — removed (replaced by `generate-pdf` Edge Function)
- `vendor-katex` — Math rendering
- `vendor-query` — React Query
- `vendor-motion` — Framer Motion animations
- `vendor-dnd` — Drag-and-drop (dnd-kit)
- `vendor-markdown` — Markdown rendering
- `vendor-sentry` — Sentry error tracking
- `vendor-date` — date-fns

## Performance Patterns

### Virtualisation

Large lists and tables use `@tanstack/react-virtual` to render only visible rows.

- **Component:** `src/components/ui/VirtualTable.tsx` — generic virtualized table
- **Used in:** QuizGradebook, AssignmentGradebook, ClassroomTable, DiscussionTable
- **Direct hook:** `useVirtualizer` in QuestionBankPage (card list)
- **Benefit:** DOM node count reduced ~90% when scrolling tables with 100+ rows

### Infinite Scroll

Course catalog uses `useInfiniteQuery` with IntersectionObserver sentinel.

- **Query:** `useInfiniteCoursesQuery` in `src/features/courses/queries/courseQueries.ts`
- **Page size:** 12 courses per page
- **Pattern:** Sentinel `<div>` at end of grid triggers `fetchNextPage()` when visible
- **Benefit:** Initial load 12 items vs 50; remaining items load lazily on scroll

### Stale-Time Tiers

All React Query `staleTime` values use named constants from `src/utils/queryConstants.ts`.

| Tier             | Value  | Used for                                                    |
| ---------------- | ------ | ----------------------------------------------------------- |
| `STALE.STATIC`   | 30 min | Tenant config, onboarding, badges, recommendations, reports |
| `STALE.MODERATE` | 5 min  | Courses, scores, leaderboard, analytics, streak/XP          |
| `STALE.DYNAMIC`  | 30 s   | Calendar, active assignments, gradebook, discussions        |
| `STALE.REALTIME` | 0      | Notifications (updated via WebSocket subscription)          |

### Bundle Splitting

`vite.config.ts` defines 11 vendor chunks for optimal caching:

```
vendor-react, vendor-supabase, vendor-recharts, vendor-pdf, vendor-katex, vendor-query,
vendor-motion, vendor-dnd, vendor-markdown, vendor-sentry, vendor-date
```

Each chunk is independently cacheable. Updating one library does not bust other chunks.

### Web Vitals

`src/utils/webVitals.ts` reports LCP, FID, FCP, CLS, TTFB, INP:

- **Dev:** logs to console with rating
- **Prod:** stores in `sessionStorage['web_vitals']` (last 20 entries); forwards to Sentry if SDK active

Run Lighthouse CI: `npm run perf:lighthouse`

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 24 feature module yang saling terintegrasi:

| Feature         | Domain         | Deskripsi                                                                                                                  |
| --------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| administration  | Admin          | Administrasi — Manajemen tenant, konfigurasi modul sekolah, sinkronisasi data                                              |
| ai-tutor        | Learning       | AI Tutor — Asisten belajar berbasis AI yang memberikan penjelasan personal kepada siswa                                    |
| analytics       | Analytics      | Analitik — Dashboard analitik komprehensif untuk guru dan admin                                                            |
| announcements   | Communication  | Pengumuman — Sistem pengumuman sekolah                                                                                     |
| assignments     | Assessment     | Tugas — Manajemen tugas dari pembuatan hingga penilaian                                                                    |
| calendar        | Academic       | Kalender — Kalender akademik terintegrasi dengan jadwal pelajaran, ujian, deadline tugas, dan kegiatan sekolah             |
| classroom       | Academic       | Kelas — Manajemen kelas virtual dan fisik                                                                                  |
| courses         | Academic       | Kursus — Core learning module                                                                                              |
| dashboards      | Analytics      | Dashboard — Dashboard kustom dengan widget builder                                                                         |
| discussions     | Communication  | Diskusi — Forum diskusi per kursus                                                                                         |
| gamification    | Engagement     | Gamifikasi — Sistem gamifikasi lengkap: XP, badge, level, streak counter, dan leaderboard                                  |
| gradebook       | Assessment     | Buku Nilai — Buku nilai digital untuk guru                                                                                 |
| guidance        | Admin          | Panduan — Sistem panduan in-app (tooltip, walkthrough, banner, checkpoint)                                                 |
| lessons         | Learning       | Pelajaran — Konten pelajaran dengan block-based editor                                                                     |
| moderation      | Admin          | Moderasi — Moderasi konten user-generated (diskusi, komentar)                                                              |
| notifications   | Communication  | Notifikasi — Sistem notifikasi real-time dengan bell icon dan panel                                                        |
| onboarding      | Admin          | Onboarding — Wizard onboarding untuk pengguna baru                                                                         |
| progress        | Learning       | Kemajuan Belajar — Tracking progress belajar siswa secara granular per kursus, modul, dan pelajaran                        |
| question-bank   | Assessment     | Bank Soal — Repositori soal yang bisa digunakan ulang di berbagai kuis                                                     |
| quizzes         | Assessment     | Kuis — Sistem kuis komprehensif dengan timer, anti-cheat, autosave, review mode, dan analitik hasil per soal               |
| recommendations | Learning       | Rekomendasi — Engine rekomendasi konten berdasarkan progress, performa, dan pola belajar siswa                             |
| reports         | Analytics      | Laporan — Generator laporan akademik, keuangan (SPP), PPDB, dan custom                                                     |
| storage         | Infrastructure | Penyimpanan — Manajemen file dan media untuk materi pembelajaran                                                           |
| struggle        | Analytics      | Deteksi Kesulitan — Deteksi otomatis siswa yang kesulitan berdasarkan pola belajar, waktu per soal, dan penurunan performa |

Setiap feature module mengikuti arsitektur standar dengan folder: api/, queries/, hooks/, types/, components/, dan **tests**/. Semua feature mendukung dark mode dan skeleton loading screens.

## Course Builder Architecture (Phase 22)

The Course Builder is the most complex feature module, spanning multiple concerns:

### Real-Time Collaboration (Fase 2)

Uses Supabase Realtime (not Yjs/CRDT) with two channel features:

- **Broadcast** (`useBuilderChannel`) — structural changes (add/update/delete modules, lessons, blocks) are broadcast to all editors on `builder:{courseId}` channel. Received changes dispatch `REMOTE_*` actions that bypass undo/redo history.
- **Presence** (`useBuilderPresence`) — tracks active collaborators with block-level locking. When a user focuses a block, they "lock" it; other users see a `CollaboratorCursor` overlay with the editor's name.

### Accessibility (Fase 3)

WCAG 2.2 AA compliance across the builder:

- Semantic landmarks: `<header>`, `<nav>`, `<main>` in page shell (`CourseBuilder.tsx`)
- Skip-to-content link targeting `#builder-main`
- Focus trap in modals (custom ~30 line implementation, no dependency)
- ARIA labels on all inputs, `role="switch"` on toggles, `role="alert"` on status messages
- Keyboard-accessible file drop zones (Enter/Space)
- Non-drag reorder alternative: Move Up/Down buttons on blocks
- Color contrast: minimum `text-slate-600 dark:text-slate-300` for secondary text

### Mobile & Offline (Fase 4)

- **Responsive** — `useMobileBuilder` detects viewport via `matchMedia` at `lg` breakpoint; sidebar becomes a slide-in drawer on mobile with backdrop blur
- **Touch targets** — minimum 44px tap areas, haptic feedback stubs via `navigator.vibrate`
- **Offline persistence** — `useBuilderOffline` auto-saves builder state to IndexedDB (`builder-drafts` store) on every change; restores on mount if newer than server
- **Upload queue** — `offlineUploadQueue.ts` queues file uploads when offline; flushes on reconnect via `useNetworkStatus`
- **IndexedDB schema** — `offlineStorage.ts` manages DB v2 with 4 stores: `courses`, `progress`, `builder-drafts`, `upload-queue`
