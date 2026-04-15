# Auth — Feature Module

Alur autentikasi: login, registrasi, reset password, invite redemption

## Arsitektur

```
src/features/auth/
├── api/           # Auth service layer (authService.ts)
├── components/    # Auth-related components
└── hooks/         # Custom React hooks (useLoginState, etc.)
```

## Status

**Complete** — Semua alur auth berfungsi.

## Key Files

| File                     | Purpose                                 |
| ------------------------ | --------------------------------------- |
| `api/authService.ts`     | Wraps 8 auth RPCs + Edge Function calls |
| `hooks/useLoginState.ts` | Login form state + rate limiting        |

## Key RPCs

| RPC                            | Purpose                           |
| ------------------------------ | --------------------------------- |
| `ensure_profile_exists()`      | Safety net untuk profile creation |
| `accept_invitation()`          | Menerima invite token             |
| `enroll_student()`             | Enroll siswa ke kelas             |
| `onboard_student_join_class()` | Onboarding siswa via join code    |
| `create_school_tenant()`       | Buat tenant sekolah baru          |

## Pages

- `src/pages/Login.tsx` — Login page
- `src/pages/ForgotPassword.tsx` — Password recovery
- `src/pages/ResetPassword.tsx` — Password reset
- `src/pages/VerifyEmail.tsx` — Email verification
- `src/pages/InviteRedeem.tsx` — Invite redemption
- `src/pages/WorkspaceSelector.tsx` — Tenant picker + onboarding
