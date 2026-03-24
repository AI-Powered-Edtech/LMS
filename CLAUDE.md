# EduSync LMS — Claude Engineering Guide

## Project Overview

EduSync is a multi-tenant SaaS Learning Management System (LMS) for Indonesian schools. It runs on a Supabase-centric architecture with no traditional backend. PostgreSQL (RLS + SQL functions) is the logic layer. The frontend is React 19 + Vite + TypeScript + Tailwind. All user-visible text is in Bahasa Indonesia.

## Tech Stack

- React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4
- Supabase JS v2 (PostgreSQL + Auth + RLS + Edge Functions)
- React Router v7 (hash routing)
- React Query v5 (server state)
- Zustand v5 (local feature state — quiz player only)
- Lucide React (icons), Framer Motion/`motion` (animations), Recharts (charts)

## Key Conventions

### Identity

- Always use `useAuth()` to get user identity: `const { user, profile, role, tenantId } = useAuth()`
- Never hardcode user IDs, tenant IDs, names, or credentials in components
- `profile.role` does NOT exist — role comes from `user_roles` table, accessed via `useAuth().role`

### Routing

- All app links use `/#/` prefix (hash routing)
- Route protection: `RoleRoute role="teacher"` or `RoleRoute role={["teacher","admin"]}`
- Student routes: `/#/app/student/...`
- Teacher routes: `/#/app/teacher/...` or `/#/teaching/...`
- Admin routes: `/#/app/admin/...` or `/#/admin/...`

### Feature Modules

- New features go in `src/features/{domain}/`
- Structure: `api/ queries/ hooks/ store/ types/ components/ utils/`
- Pages in `src/pages/` are thin entry points — logic belongs in feature modules

### Language

- All user-visible strings must be Bahasa Indonesia
- No English labels, button text, error messages, or headers in the UI
- Supabase English error messages must be translated (see `translateAuthError()` in Login.tsx)

### Dark Mode

- All new components need `dark:` Tailwind variants
- Test at `class="dark"` on html element or via the ThemeContext toggle

### Database

- All new tables must have RLS enabled with `tenant_id = (SELECT get_my_tenant_id())` policy
- All new RPCs must have `auth.uid() IS NOT NULL` check and `SET search_path TO 'public'`
- Queries must never be unpaginated on large tables
- Never use `SELECT *` — always specify columns

## Known Gotchas

### SQL / Schema

- `quiz_questions.text` — column is `text`, NOT `question_text`
- `quiz_options.text` — column is `text`, NOT `option_text`
- `course_modules."order"` — `order` is a SQL reserved word, must be quoted
- `lessons."order"` — same, must be quoted
- `courses.status` — use `status = 'published'`, NOT `is_published` (that column does not exist)
- `enrollments.user_id` — NOT `student_id`
- `student_lesson_signals`: use `total_time_spent`, `last_accessed_at`, `latest_quiz_score`
  (not `time_spent_seconds`, `last_event_at`, `quiz_avg_score`)
- When checking teacher role in analytics RPCs: query `user_roles` table directly
  (do not use `has_role()` — it fails when JWT is missing tenant claim)
- `courses.status` enum includes `'in_review'` and `'approved'` (added by `20260324160000` migration)
- `course_collaborators` table uses `auto_set_tenant_id()` trigger — NOT `set_tenant_id_from_user()`
- Tenant auto-fill trigger function is `auto_set_tenant_id()` — always use this for new tables

### Auth

- `.test` TLD emails fail GoTrue validation — use `.dev` or real domains for test accounts
- React controlled inputs: login form cannot be filled programmatically — requires keyboard events
- `signOut()` must clear React state eagerly BEFORE calling `supabase.auth.signOut()` (prevents infinite spinner)

### Routing

- `RoleRoute` for leaderboard must include both `student` and `teacher`: `role={["student","teacher"]}` (not role="student" only)

## Documentation Policy

After ANY significant task:

1. Update the relevant file in `docs/`
2. If creating a new feature module, create a `README.md` inside it
3. If deleting a feature or file, remove its documentation
4. Add an entry to `CHANGELOG.md`
5. Update `docs/DATABASE.md` if schema changed

Key docs:

- `docs/ARCHITECTURE.md` — system architecture
- `docs/DATABASE.md` — table/RPC reference (update after schema changes)
- `docs/AUTH.md` — auth flow and setup
- `docs/SECURITY.md` — security model
- `docs/ANALYTICS.md` — analytics system
- `docs/GAMIFICATION.md` — XP, badges, leaderboard
- `docs/TESTING.md` — test accounts and known limitations
- `docs/ENGINEERING_ROADMAP.md` — phase status

## Edge Functions

All Edge Functions live in `supabase/functions/`. Each is self-contained (no shared module). Use `Deno.serve`, `jsr:` imports, and the standard CORS/response helpers.

| Function                  | Purpose                                         | Auth                          |
| ------------------------- | ----------------------------------------------- | ----------------------------- |
| `ai-grade-essay`          | AI essay grading via Groq                       | User JWT                      |
| `ai-tutor`                | AI tutor chat                                   | User JWT                      |
| `generate-ai-content`     | AI content generation                           | User JWT                      |
| `generate-pdf`            | PDF certificate generation                      | User JWT                      |
| `grade-quiz-attempt`      | Background quiz grading                         | Service role                  |
| `health-check`            | System health status                            | None (public)                 |
| `load-quiz-data`          | Load quiz for student                           | User JWT                      |
| `process-progress-events` | Batch progress event processing                 | API key                       |
| `progress-events`         | Enqueue progress events                         | User JWT                      |
| `send-email-digest`       | Email digest sender                             | Service role                  |
| `send-push`               | Push notification sender                        | User JWT                      |
| `lti-jwks`                | Public JWKS for LTI platforms                   | None (public GET)             |
| `lti-oidc-login`          | LTI OIDC login initiation                       | None (platform-initiated)     |
| `lti-launch`              | LTI launch token validation + user provisioning | None (validates LTI id_token) |
| `scorm-extract`           | SCORM ZIP upload, validation, extraction        | User JWT (teacher/admin)      |

### LTI/SCORM Environment Variables

| Variable              | Used By                  |
| --------------------- | ------------------------ |
| `LTI_RSA_PRIVATE_KEY` | `lti-launch`, `lti-jwks` |
| `LTI_RSA_PUBLIC_KEY`  | `lti-jwks`               |
| `LTI_LAUNCH_URL`      | `lti-oidc-login`         |
| `APP_URL`             | `lti-launch`             |

## LTI / SCORM Gotchas

- `lti_nonces` table uses `service_role` only — anon/authenticated RLS is `USING (false)`
- LTI guest users get deterministic email: `lti-{platformId8}-{sub}@lti.edusync.internal`
- SCORM content runs in sandboxed `<iframe>` — the SCORM API bridge is attached to the parent `window` (not the iframe's window)
- `scorm_runtime_data.lesson_status` has sticky terminal states: once `completed` or `passed`, cannot revert (enforced in `upsert_scorm_runtime` RPC)
- `lesson_resources.type` CHECK constraint includes `'scorm'` — added by migration `20260324200000`

## Test Accounts (Shared Dev Project)

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

Dev app: `http://localhost:5173` (after `npm run dev`)

## Engineering Workflow

Before implementing any feature:

1. Identify the domain (identity, tenant, academic, learning, assessment, activity)
2. Decide the correct layer: database first, then edge function if external API is needed, then frontend
3. Propose an implementation plan and wait for confirmation before coding

Before finalizing any change:

- Tenant isolation preserved
- RLS policies respected
- No secrets exposed
- Queries scale (paginated, indexed)
- Documentation updated
