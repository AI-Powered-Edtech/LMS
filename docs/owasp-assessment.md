# EduSync LMS -- OWASP Top 10 (2021) Self-Assessment

> **Date**: 2026-03-21
> **Assessor**: Sprint 2.1 Day 4 Security Review
> **Architecture**: Supabase-centric SaaS LMS (no custom backend server)
> **Scope**: Frontend (React/Vite), Database (PostgreSQL + RLS), Edge Functions (Deno)

---

## Summary

| #   | Category                                   | Status        |
| --- | ------------------------------------------ | ------------- |
| A01 | Broken Access Control                      | **Protected** |
| A02 | Cryptographic Failures                     | **Protected** |
| A03 | Injection                                  | **Protected** |
| A04 | Insecure Design                            | **Protected** |
| A05 | Security Misconfiguration                  | **Partial**   |
| A06 | Vulnerable and Outdated Components         | **Protected** |
| A07 | Identification and Authentication Failures | **Protected** |
| A08 | Software and Data Integrity Failures       | **Protected** |
| A09 | Security Logging and Monitoring Failures   | **Partial**   |
| A10 | Server-Side Request Forgery (SSRF)         | **Protected** |

---

## A01:2021 -- Broken Access Control

**Status: Protected**

### How EduSync Protects Against This

EduSync enforces access control at four layers, making it impossible to bypass by manipulating the frontend alone:

1. **Row Level Security (RLS)** -- All 26 tenant-scoped tables enforce `tenant_id = get_my_tenant_id()` on every operation (SELECT, INSERT, UPDATE, DELETE). Policies are defined in PostgreSQL and cannot be circumvented from the client. See `docs/RLS_POLICIES.md` for the full policy matrix.

2. **Tenant isolation via `get_my_tenant_id()`** -- The tenant context is derived server-side from `auth.uid()` by querying the `profiles` table. No user-supplied `tenant_id` parameter is accepted by any security-critical function. The function is `SECURITY DEFINER` with `SET search_path TO 'public'`.

3. **Role-based guards** -- `has_role()` SQL function checks role within the caller's tenant. Frontend route protection uses `RoleRoute` (`src/components/RoleRoute.tsx`) and `RoleGuard` (`src/components/guards/RoleGuard.tsx`), but these are defense-in-depth -- the real enforcement is RLS.

4. **Resource-level ownership** -- Helper functions `is_class_member()`, `is_class_teacher()`, and `is_course_creator()` enforce fine-grained ownership checks within RLS policies. Students can only see their own submissions, progress, and grades.

### Evidence

- `docs/TENANT_SECURITY_AUDIT.md` -- 31 tables, 119 policies audited (2026-03-08)
- `docs/SECURITY.md` -- 5 HIGH vulnerabilities patched in Migration 836 (2026-03-20)
- `src/components/guards/RoleGuard.tsx` -- Frontend role guard redirects unauthorized users

### Remaining Gaps

None identified. All prior vulnerabilities (VULN-001 through VULN-005) have been patched.

---

## A02:2021 -- Cryptographic Failures

**Status: Protected**

### How EduSync Protects Against This

1. **No custom cryptography** -- EduSync does not implement its own encryption, hashing, or key derivation. All cryptographic operations are delegated to Supabase (GoTrue for auth, PostgreSQL for data-at-rest).

2. **Password handling** -- Passwords are hashed by Supabase GoTrue using bcrypt. The application never sees or stores plaintext passwords.

3. **Transport encryption** -- All communication with Supabase is over HTTPS/TLS. HSTS is enforced via `Strict-Transport-Security: max-age=31536000; includeSubDomains` (`vercel.json`).

4. **JWT tokens** -- Session tokens are signed JWTs managed by Supabase Auth. Custom claims (`tenant_id`, `role`) are injected via `custom_access_token_hook` (server-side SQL function).

5. **HMAC-signed offline queue** -- The lesson progress offline queue (`src/features/lessons/api/lessonService.ts`) uses Web Crypto API HMAC-SHA256 to sign queued payloads, preventing tampering with cached progress data.

6. **No secrets in frontend** -- Only `VITE_SUPABASE_ANON_KEY` is exposed client-side. Service role keys exist only in Edge Functions (`Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`).

### Remaining Gaps

None identified.

---

## A03:2021 -- Injection

**Status: Protected**

### How EduSync Protects Against This

1. **Parameterized queries** -- All database queries go through the Supabase JS client, which uses parameterized queries internally. No raw SQL string concatenation exists in frontend code.

2. **RPC functions** -- All SQL functions use parameter binding (`$1`, `$2`, etc.) and `SET search_path TO 'public'` to prevent search path injection.

3. **React output escaping** -- React 19 escapes all rendered output by default. No `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` calls exist anywhere in the codebase (verified via grep).

4. **Markdown rendering** -- `react-markdown` is used for content rendering with controlled remark/rehype plugins (`remark-gfm`, `remark-math`, `rehype-katex`). No raw HTML pass-through.

5. **No OS command execution** -- The frontend is a pure SPA. Edge Functions run in Deno's sandboxed runtime with no shell access.

### Remaining Gaps

None identified.

---

## A04:2021 -- Insecure Design

**Status: Protected**

### How EduSync Protects Against This

1. **Defense in depth** -- Security is enforced at multiple layers (RLS, role guards, frontend guards, JWT claims). Compromising the frontend alone cannot bypass database-level access control.

2. **Database-first logic** -- Critical business logic (grading, XP awards, progress tracking) is implemented in SQL functions, not client-side code. The `award_quiz_xp` function validates `auth.uid() = p_user_id` server-side.

3. **Tenant isolation by design** -- Multi-tenancy is baked into the schema (`tenant_id` on all tenant-scoped tables) rather than bolted on as middleware. The `get_my_tenant_id()` function derives tenant from the authenticated user, preventing parameter tampering.

4. **Rate limiting** -- Client-side rate limiters (`src/utils/rateLimiter.ts`) protect login (5/min), quiz submission (1/session), AI tutor (10/min), and password reset (3/10min). Server-side rate limiting is provided by Supabase Auth (GoTrue) and Edge Function configuration.

5. **Quiz grading isolation** -- Quiz submissions are graded by a background Edge Function (`grade-quiz-attempt`) using `FOR UPDATE SKIP LOCKED`, preventing double-grading and race conditions. The function requires service role auth.

### Remaining Gaps

None identified at the design level.

---

## A05:2021 -- Security Misconfiguration

**Status: Partial**

### How EduSync Protects Against This

1. **Security headers** -- Comprehensive headers configured in both Vercel (`vercel.json`) and Docker/nginx (`docker/nginx.conf`):
   - `X-Frame-Options: DENY` (Vercel) / `SAMEORIGIN` (nginx)
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `X-DNS-Prefetch-Control: on`
   - nginx: `server_tokens off` (hides version)

2. **Content Security Policy** -- CSP is configured in report-only mode (`Content-Security-Policy-Report-Only`) in `vercel.json`, restricting scripts, styles, images, and connections to trusted origins.

3. **CORS** -- Edge Functions use configurable CORS origin (`Deno.env.get('CORS_ORIGIN')`) with fallback to `*` for development. Production should restrict this.

4. **No default credentials** -- Dev test accounts use `.dev` TLD emails. No default admin accounts ship with the platform.

### Remaining Gaps

| Gap                                                              | Risk   | Mitigation Plan                                                                                         |
| ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| CSP is report-only, not enforced                                 | Medium | Move to enforced `Content-Security-Policy` header after monitoring report-only logs for false positives |
| CORS fallback to `*` in Edge Functions                           | Low    | Set `CORS_ORIGIN` environment variable in production Supabase dashboard                                 |
| nginx config uses `X-Frame-Options: SAMEORIGIN` vs Vercel `DENY` | Low    | Standardize to `DENY` in both configurations                                                            |

---

## A06:2021 -- Vulnerable and Outdated Components

**Status: Protected**

### How EduSync Protects Against This

1. **Clean audit** -- `npm audit` (2026-03-21) reports 0 vulnerabilities across 535 packages.

2. **Modern stack** -- All major dependencies are at their latest major versions: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, React Query 5, Zustand 5.

3. **Dependabot** -- `.github/dependabot.yml` configured for weekly npm dependency updates with grouped minor/patch PRs.

4. **Lock file** -- `package-lock.json` pins transitive dependency versions to prevent supply-chain drift.

### Evidence

See `docs/security-audit.md` for the full audit report.

### Remaining Gaps

None. Automated monitoring is now in place.

---

## A07:2021 -- Identification and Authentication Failures

**Status: Protected**

### How EduSync Protects Against This

1. **Supabase GoTrue** -- Authentication is handled entirely by Supabase's GoTrue service, which implements:
   - bcrypt password hashing
   - JWT session tokens with configurable expiry
   - Email verification flow
   - Password reset flow
   - Automatic session refresh

2. **Client-side rate limiting** -- `src/utils/rateLimiter.ts` provides defense-in-depth:
   - Login: 5 attempts per 60 seconds
   - Password reset: 3 attempts per 10 minutes
   - Quiz submission: 1 per session
   - AI tutor: 10 per 60 seconds

3. **Server-side rate limiting** -- Supabase GoTrue has built-in rate limiting on auth endpoints. Supabase network bans activate on excessive failed attempts.

4. **Session management** -- `signOut()` eagerly clears React state before calling `supabase.auth.signOut()` (prevents infinite spinner and stale session bugs). Sessions are not stored in localStorage by the app -- Supabase handles persistence.

5. **JWT enrichment** -- `custom_access_token_hook` injects `tenant_id` and `role` into JWT claims server-side, preventing client-side claim manipulation.

### Evidence

- `src/utils/rateLimiter.ts` -- Rate limiter implementation with tests
- `docs/AUTH.md` -- Auth flow documentation
- `src/contexts/AuthContext.tsx` -- Session management

### Remaining Gaps

None identified. Auth is fully delegated to a battle-tested service (Supabase GoTrue).

---

## A08:2021 -- Software and Data Integrity Failures

**Status: Protected**

### How EduSync Protects Against This

1. **HMAC-signed offline queue** -- The Smart Player lesson progress system (`src/features/lessons/api/lessonService.ts`) signs queued progress updates with HMAC-SHA256 using the Web Crypto API. Payloads are verified before replay, preventing tampering with cached progress data.

2. **No `eval()` or dynamic code execution** -- Verified via codebase grep: zero instances of `eval()`, `Function()` constructor, `innerHTML`, or `dangerouslySetInnerHTML`.

3. **CI pipeline** -- `.github/workflows/ci.yml` runs type checking, build validation, and unit tests on every push and PR to `main`.

4. **Lock file pinning** -- `package-lock.json` ensures deterministic dependency resolution, preventing supply-chain substitution attacks.

5. **Dependabot** -- Automated dependency updates allow rapid response to compromised packages.

6. **Quiz grading integrity** -- Quiz answers are graded server-side in the `grade-quiz-attempt` Edge Function using `FOR UPDATE SKIP LOCKED` to prevent double-processing. The function validates against the question manifest, not client-supplied answers.

### Remaining Gaps

None identified.

---

## A09:2021 -- Security Logging and Monitoring Failures

**Status: Partial**

### How EduSync Protects Against This

1. **Activity logs table** -- `activity_logs` table tracks user actions within the platform. RLS restricts visibility to own logs or tenant admin.

2. **Auth event logging** -- Supabase GoTrue logs authentication events (login, signup, token refresh, failed attempts) in the Supabase dashboard.

3. **Edge Function logging** -- All Edge Functions (`ai-tutor`, `grade-quiz-attempt`, `progress-events`) include `console.error` and `console.warn` for operational issues, visible in Supabase Function logs.

4. **Event-driven telemetry** -- The Smart Player system uses a batched telemetry pipeline (`LESSON_COMPLETED`, `QUIZ_COMPLETED`, etc.) with queue-based processing for high-frequency events.

### Remaining Gaps

| Gap                                                                        | Risk   | Mitigation Plan                                                                                                                          |
| -------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| No centralized log aggregation (e.g., Datadog, Loki)                       | Medium | Acceptable for current scale. Evaluate when user base exceeds 1,000 concurrent users.                                                    |
| No real-time alerting on suspicious auth patterns                          | Medium | Supabase provides basic auth rate limiting and network bans. Consider adding webhook-based alerts for repeated failed logins per tenant. |
| Frontend errors not reported to a monitoring service                       | Low    | Consider adding Sentry or similar error tracking for production frontend errors.                                                         |
| No audit trail for admin actions (tenant config changes, role assignments) | Medium | Add database triggers to log admin mutations to `activity_logs`.                                                                         |

---

## A10:2021 -- Server-Side Request Forgery (SSRF)

**Status: Protected**

### How EduSync Protects Against This

1. **No custom backend server** -- EduSync has no Express, NestJS, or custom Node.js server. There is no server-side HTTP request handler that could be manipulated to make internal requests.

2. **Edge Function isolation** -- Supabase Edge Functions run in Deno's sandboxed runtime. External requests are limited to:
   - OpenAI/Groq API for AI tutor (hardcoded endpoint, not user-supplied)
   - Supabase API for database operations (internal, service-role authenticated)

3. **No user-controlled URLs** -- No Edge Function accepts a URL parameter from the user that is then fetched server-side. The AI tutor function accepts a `message` string, not a URL.

4. **Network isolation** -- Supabase Edge Functions cannot access internal Supabase infrastructure (e.g., PostgreSQL directly). They communicate through the Supabase REST API.

### Remaining Gaps

None identified. The architecture inherently prevents SSRF by not having a general-purpose server.

---

## Appendix: File References

| File                                             | Relevance                                            |
| ------------------------------------------------ | ---------------------------------------------------- |
| `docs/SECURITY.md`                               | Security model and patch history                     |
| `docs/RLS_POLICIES.md`                           | Complete RLS policy matrix (26 tables, 119 policies) |
| `docs/TENANT_SECURITY_AUDIT.md`                  | Multi-tenant security audit (2026-03-08)             |
| `docs/AUTH.md`                                   | Authentication flow and session management           |
| `vercel.json`                                    | Security headers (Vercel deployment)                 |
| `docker/nginx.conf`                              | Security headers (Docker/nginx deployment)           |
| `src/utils/rateLimiter.ts`                       | Client-side rate limiting                            |
| `src/components/guards/RoleGuard.tsx`            | Frontend role-based access control                   |
| `src/components/RoleRoute.tsx`                   | Route-level role protection                          |
| `src/features/lessons/api/lessonService.ts`      | HMAC-signed offline queue                            |
| `supabase/functions/grade-quiz-attempt/index.ts` | Server-side quiz grading with auth check             |
| `supabase/functions/ai-tutor/index.ts`           | AI tutor with rate limiting and context grounding    |
| `.github/dependabot.yml`                         | Automated dependency update configuration            |
| `.github/workflows/ci.yml`                       | CI pipeline (type check, build, tests)               |

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
