# EduSync LMS — Authentication Guide

## Overview

EduSync uses Supabase email/password authentication. All auth flows go through `supabase.auth.signInWithPassword()`. Mock sessions or fake JWTs are strictly forbidden — they break RLS and FK constraints.

## How Auth Works

```
Login
  → supabase.auth.signInWithPassword()
  → custom_access_token_hook fires
    → reads tenant_id + role from profiles/user_roles
    → injects into JWT claims
  → Frontend receives session with enriched JWT
  → AuthContext parses JWT, fetches profile
  → User routed to correct dashboard by role
```

## JWT Claims

The `custom_access_token_hook` injects:

- `tenant_id` — the user's school organization UUID
- `role` — the user's `app_role` (ADMIN/TEACHER/STUDENT)

These are available at `session.access_token` (decoded) and via `AuthContext`.

## AuthContext

`src/contexts/AuthContext.tsx` provides:

```tsx
const {
  user, // Supabase auth.User
  profile, // profiles row: first_name, last_name, avatar_url, tenant_id, etc.
  role, // Active role string: 'admin' | 'teacher' | 'student'
  activeRole, // Same as role
  roles, // All roles for this user (array)
  session, // Supabase Session
  tenantId, // UUID from profile.tenant_id
  activeTenant, // tenant object
  loading, // Auth state loading
  signOut, // Clears state eagerly then calls supabase.auth.signOut()
} = useAuth()
```

**Important:** `signOut()` clears local state before calling Supabase to prevent infinite spinner on the login screen (BUG-C1-005, fixed).

## Role Routing

- `RoleRoute` wraps routes: `<RoleRoute role="teacher">` or `<RoleRoute role={["teacher","admin"]}>`
- `RoleGuard` is used inside `/app/student`, `/app/teacher`, `/app/admin` route groups
- `RoleResolver` at `/app` redirects to the correct role-specific dashboard

## Sign Up Flow

New users must be created via Supabase Auth (Dashboard or `signUp()` call). The `handle_new_user` trigger automatically:

1. Creates a `profiles` row with `tenant_id` from `raw_user_meta_data`
2. Creates a `user_roles` row with default role `STUDENT`

To pass `tenant_id` during signup:

```tsx
await supabase.auth.signUp({
  email,
  password,
  options: { data: { tenant_id: '...', first_name: '...', last_name: '...' } },
})
```

If `tenant_id` is omitted, the trigger falls back to default tenant `00000000-0000-0000-0000-000000000001`.

## Setting Up Dev Accounts

See [AUTH_SETUP_GUIDE.md](AUTH_SETUP_GUIDE.md) for complete step-by-step instructions to set up your Supabase project and create dev accounts.

Quick reference for existing shared dev project:

| Email                 | Password      | Role    |
| --------------------- | ------------- | ------- |
| `teacher@edusync.dev` | `password123` | TEACHER |
| `student@edusync.dev` | `password123` | STUDENT |
| `admin@edusync.dev`   | `password123` | ADMIN   |

## Known Limitations

- `.test` TLD emails (e.g., `guru.mat@smanusantara1.test`) fail login due to GoTrue email validation. This is an infrastructure limitation. Use `.dev` or real domain emails for test accounts.
- Auth loading flash: on token refresh, `loading || loadingMemberships` may briefly flash before stabilizing (BUG-C2-001, low priority).
- React controlled inputs: agent-browser and automated tools cannot programmatically fill the login form — it must be filled via keyboard events.

## VIL Auth Backend (Phase 1B)

The VIL Rust backend at `edusync-api/` implements a parallel auth path at `/api/v1/auth/*`. The frontend switches provider via `VITE_AUTH_PROVIDER=vil`.

### Endpoints

| Method | Path                          | Description                          |
| ------ | ----------------------------- | ------------------------------------ |
| POST   | `/api/v1/auth/register`       | Email/password registration          |
| POST   | `/api/v1/auth/login`          | Login, returns access+refresh tokens |
| POST   | `/api/v1/auth/signout`        | Revoke refresh token                 |
| POST   | `/api/v1/auth/refresh`        | Token rotation with reuse detection  |
| GET    | `/api/v1/auth/bootstrap`      | Profile + memberships (parity with `get_auth_bootstrap()`) |
| POST   | `/api/v1/auth/reset-password` | Request password reset               |
| PUT    | `/api/v1/auth/reset-password` | Execute reset with token             |
| POST   | `/api/v1/auth/verify-email`   | Verify email OTP                     |
| GET    | `/api/v1/auth/oauth/{provider}` | OAuth redirect init (Phase 1C)     |
| POST   | `/api/v1/auth/mfa/enroll`     | TOTP enroll                          |
| POST   | `/api/v1/auth/mfa/verify`     | TOTP verify                          |
| DELETE | `/api/v1/auth/mfa`            | TOTP unenroll                        |

### Token format

- Access token: HS256 JWT, 1h TTL, claims: `sub`, `email`, `tenant_id`, `role`, `exp`, `iat`
- Refresh token: opaque random bytes, SHA-256 hashed in DB, 30d TTL, single-use (rotated)

### Password format

- Primary: Argon2id
- Fallback: bcrypt (legacy Supabase users), auto-rehashed to Argon2 on next login

### Bootstrap parity

`GET /api/v1/auth/bootstrap` returns shape identical to Supabase `get_auth_bootstrap()`:

```json
{
  "profile": { "id", "email", "first_name", "last_name", "avatar_url", "tenant_id" },
  "memberships": [{ "role", "status", "is_active", "joined_at", "tenant_id", "tenant_name", "tenant_slug", "tenant_logo" }],
  "default_tenant_id": "...",
  "requires_email_verification": false
}
```

## Security Rules

- Never create fake sessions or hardcode tokens in frontend code
- Never expose service role keys in client code — only use `VITE_SUPABASE_ANON_KEY`
- RLS enforces access at the database level regardless of frontend guards
- All RPCs that modify data check `auth.uid()` and `get_my_tenant_id()`

<!-- Phase 5 Feature Cross-Reference -->

## Feature Module Cross-Reference

EduSync LMS terdiri dari 49 feature module yang saling terintegrasi:

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
