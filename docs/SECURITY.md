# EduSync LMS — Security Model

## Principles

1. **Deny by default** — RLS is enabled on every table. No policy = no access.
2. **Tenant isolation** — Every data query is scoped to the caller's tenant via `get_my_tenant_id()`.
3. **Role authorization** — `has_role()` checks role within the caller's tenant, not globally.
4. **No client secrets** — Service role keys never appear in frontend code. Only `VITE_SUPABASE_ANON_KEY` is exposed.

## Row Level Security (RLS)

All 26 tenant-scoped tables have RLS enabled. The standard SELECT policy pattern:

```sql
USING (tenant_id = (SELECT public.get_my_tenant_id()))
```

The scalar subquery `(SELECT ...)` is intentional — PostgreSQL caches the result per statement rather than re-evaluating for every row, which would be a performance problem at scale.

Global tables (`badges`, `user_badges`, `user_points`, `recommendations`) have no `tenant_id` but are scoped by `user_id = auth.uid()` for reads and `has_role('ADMIN')` for writes.

## Tenant Isolation

`get_my_tenant_id()` is the single source of truth for tenant context:

```sql
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid() $$;
```

No user-supplied `tenant_id` parameter is accepted by any security-critical function. The tenant is always derived from `auth.uid()`.

## RPC Security

All RPC functions that modify data must:

1. Check `auth.uid() IS NOT NULL`
2. Use `SET search_path TO 'public'` to prevent search path injection
3. Derive tenant from `get_my_tenant_id()` — never from a parameter

## Security Fixes Applied (Production Readiness Audit, 2026-03-23)

Eight additional vulnerabilities fixed during the production readiness audit:

| Fix   | Table/Function               | Issue                                                           | Resolution                                             |
| ----- | ---------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ |
| AUD-1 | 9 SQL role checks            | Compared lowercase `'admin'`/`'teacher'` against UPPERCASE enum | Changed to `'ADMIN'`/`'TEACHER'` in all 9 locations    |
| AUD-2 | `add_user_points`            | `SECURITY DEFINER` without `SET search_path`                    | Added `SET search_path TO 'public'`                    |
| AUD-3 | `award_badge_if_qualified`   | `SECURITY DEFINER` without `SET search_path`                    | Added `SET search_path TO 'public'`                    |
| AUD-4 | `expire_dead_attempt`        | `SECURITY DEFINER` without `SET search_path`                    | Added `SET search_path TO 'public'`                    |
| AUD-5 | `check_analytics_rate_limit` | `SECURITY DEFINER` without `SET search_path`                    | Added `SET search_path TO 'public'`                    |
| AUD-6 | `batch_save_answers`         | `SECURITY DEFINER` bypasses RLS but no tenant check             | Added `tenant_id = (SELECT get_my_tenant_id())` guard  |
| AUD-7 | `AuthContext` (frontend)     | Dev credentials (`password123`) exposed in production builds    | Guarded `fillAccount()` with `import.meta.env.DEV`     |
| AUD-8 | `useTenantQuery` (frontend)  | Used `SELECT *` — leaked unnecessary columns to client          | Changed to explicit columns parameter (default `'id'`) |

## Security Fixes Applied (Migration 836)

Five HIGH vulnerabilities were patched on 2026-03-20:

| Fix   | Table/Function           | Issue                                           | Resolution                                    |
| ----- | ------------------------ | ----------------------------------------------- | --------------------------------------------- |
| FIX-1 | `award_quiz_xp`          | Any user could grant XP to arbitrary user       | Added `auth.uid() = p_user_id` check          |
| FIX-2 | `v1_get_quiz_results`    | SECURITY DEFINER without `search_path`          | Added `SET search_path TO 'public'`           |
| FIX-3 | `aggregation_state`      | No RLS — analytics watermark poisoning possible | Enabled RLS, restricted to admin/service role |
| FIX-4 | `student_lesson_signals` | Students could read all peers' signals          | Tightened RLS: students see own rows only     |
| FIX-5 | `quiz_submission_queue`  | `user_id IS NULL` INSERT policy audit bypass    | Removed wildcard null check                   |

## Prior Vulnerabilities (from TENANT_SECURITY_AUDIT.md, date 2026-03-08)

Five additional issues were found and fixed in earlier migrations:

| Issue                                          | Fix                                            |
| ---------------------------------------------- | ---------------------------------------------- |
| `handle_new_user` trigger omitted `tenant_id`  | Updated to read from `raw_user_meta_data`      |
| `profiles_insert` policy missing tenant check  | Fixed — profile creation now passes tenant_id  |
| `create_class` RPC bypassed tenant_id          | Added `tenant_id = get_my_tenant_id()`         |
| `enroll_student` RPC bypassed tenant isolation | Added tenant filter on class lookup and insert |
| `mark_lesson_complete` RPC bypassed tenant_id  | Added `tenant_id = get_my_tenant_id()`         |

## Content Security Policy (CSP) — Phase 21D

CSP enforcement was upgraded from report-only mode to full enforcement. The CSP header is configured in the deployment layer (Vercel/Netlify) and restricts:

- **script-src**: `'self'` only (no inline scripts, no `eval`)
- **style-src**: `'self'` plus `'unsafe-inline'` (required by Tailwind's runtime)
- **connect-src**: `'self'` plus Supabase API endpoints and Sentry DSN
- **img-src**: `'self'`, `data:`, and Supabase storage bucket domains
- **frame-src**: `'self'` (SCORM iframes load from same origin via storage)
- **default-src**: `'none'` (deny by default)

Previously CSP was in `Content-Security-Policy-Report-Only` mode. The upgrade to enforcement blocks XSS and data exfiltration vectors.

## SECURITY DEFINER search_path Fixes — Phase 21D

All `SECURITY DEFINER` functions now include `SET search_path TO 'public'`. Migration `20260325_fix_search_path.sql` patched 19 functions that were missing this setting. Without it, an attacker who can control the session `search_path` could redirect unqualified name resolution to malicious schema objects.

This completes the security posture: every `SECURITY DEFINER` function in the system now has an explicit `search_path`. Previous fixes (migration 836, production readiness audit) covered 8 functions; this migration covers the remaining 19.

See `docs/DATABASE.md` for the full list of patched functions.

## Sentry Sensitive Data Filtering — Phase 21D

Sentry integration includes multi-layer sensitive data scrubbing:

- **`beforeBreadcrumb`**: Strips `Authorization` headers from XHR/fetch breadcrumbs before they leave the client
- **`beforeSend`**: Recursively scrubs event payloads, request headers, request bodies, query strings, breadcrumb data, and extra context for patterns matching tokens, passwords, secrets, and API keys
- **Utility**: `scrubSensitiveData()` is a reusable recursive scrubber that redacts values for keys matching `/token|password|secret|key|authorization|cookie|session/i`

This prevents accidental PII or credential leakage through error reporting.

## Token Refresh Monitoring — Phase 21D

The `AuthContext` now monitors Supabase session token refresh cycles:

- Listens for `TOKEN_REFRESHED` and `SIGNED_OUT` auth events
- Logs refresh timestamps for observability
- Handles refresh failures gracefully by clearing state and redirecting to login (preventing infinite spinner states)
- Session expiry is surfaced to the user via a modal prompt before automatic logout

## Frontend Security Checklist

Before merging any PR:

- [ ] No hardcoded user IDs, tenant IDs, or credentials
- [ ] No `VITE_SUPABASE_SERVICE_ROLE_KEY` or equivalent in client code
- [ ] All new tables have RLS enabled and `tenant_id` policy
- [ ] All new RPCs have `auth.uid()` check and `SET search_path TO 'public'`
- [ ] `useAuth()` used for identity — never hardcoded

## LTI 1.3 Security Model

EduSync acts as an **LTI Tool Provider** allowing external platforms (Canvas, Moodle) to launch into EduSync content.

### Authentication Flow

1. External platform sends OIDC login initiation → `lti-oidc-login` Edge Function
2. EduSync validates issuer against `lti_platform_registrations`, generates state + nonce (stored in `lti_nonces`)
3. Redirects to platform's OIDC authorization endpoint
4. Platform sends back `id_token` (JWT) via form POST → `lti-launch` Edge Function
5. EduSync validates: state replay protection, JWT signature (against platform JWKS), issuer, audience, nonce, LTI claims
6. Provisions or finds Supabase user, assigns tenant from platform registration
7. Generates magic link session token, redirects to `/#/lti/callback`

### Security Measures

| Measure                | Implementation                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Replay protection      | `lti_nonces` table with 10-minute TTL, single-use deletion                                    |
| JWT verification       | RSA signature verified against platform's published JWKS                                      |
| Tenant isolation       | LTI guest users inherit `tenant_id` from the pre-registered platform configuration            |
| Role mapping           | LTI role URIs mapped to EduSync roles (instructor → teacher, learner → student)               |
| RLS on LTI tables      | `lti_nonces` deny-all for anon/authenticated (service-role only); others use tenant isolation |
| No secrets in frontend | RSA keys (`LTI_RSA_PRIVATE_KEY`, `LTI_RSA_PUBLIC_KEY`) are Edge Function env vars only        |

### SCORM Sandboxing

SCORM content runs inside an `<iframe>` with restricted sandbox attributes:

```html
<iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
```

- `allow-scripts`: Required for SCORM JavaScript API communication
- `allow-same-origin`: Required for SCORM API bridge to find `window.API` on parent frame
- `allow-forms`: Some SCORM content uses form submissions
- `allow-popups`: Some SCORM content opens help windows
- **NOT allowed**: `allow-top-navigation`, `allow-modals`, `allow-downloads` (blocked by default)

SCORM runtime data (`scorm_runtime_data`) is protected by own-data-only RLS — students can only read/write their own CMI state.

#### SCORM Storage Bucket

The `scorm-packages` storage bucket is **public** (`public: true`). This is intentional — iframes load SCORM content via plain GET requests without Authorization headers, and SCORM packages contain interlinked files (HTML/JS/CSS/images) with relative paths, making signed URLs impractical.

**Mitigations:**

- Storage paths include `{tenant_id}/{package_id}/...` — cross-tenant enumeration requires guessing UUIDs
- The `scorm_packages` table has tenant-isolated RLS — students can only discover packages belonging to their tenant
- Write access (upload/update/delete) is restricted to teachers/admins via storage object policies
- The SCORM content itself is educational material (not sensitive PII)

<!-- Phase 5 Feature Cross-Reference -->

## Governance and Policies

For detailed operational security procedures, please refer to the following documents:

- [Secret Rotation SOP](security/SECRET_ROTATION_SOP.md)
- [Audit Logging Retention Policy](security/AUDIT_LOGGING_POLICY.md)

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
