# EduSync — Auth Architecture

## Overview

EduSync uses a custom JWT-based auth system implemented in Rust (`edusync-api/crates/auth/`). There is no GoTrue, no Supabase Auth, and no external identity provider required.

## Token Pair

| Token         | Algorithm | Expiry     | Storage                  |
| ------------- | --------- | ---------- | ------------------------ |
| Access token  | HS256     | 15 minutes | In-memory / localStorage |
| Refresh token | HS256     | 7 days     | DB + localStorage        |

- **Access token** (`JWT_SECRET`): short-lived, sent in `Authorization: Bearer` header on every API request
- **Refresh token** (`JWT_REFRESH_SECRET`): long-lived, stored in the `refresh_tokens` table and in `localStorage`; exchanged for a new token pair at `/auth/refresh`

Both secrets must be at least 32 characters. The server logs an error at startup if they are shorter.

## Auth Flow

```
┌──────────┐        ┌─────────────────────────────┐       ┌──────────────┐
│  Client  │        │    VIL Auth Service          │       │  PostgreSQL  │
└────┬─────┘        └──────────────┬──────────────┘       └──────┬───────┘
     │                             │                              │
     │ POST /auth/register         │                              │
     │────────────────────────────>│  INSERT users, profiles,     │
     │                             │  user_roles                  │
     │<────────────────────────────│──────────────────────────────│
     │  { access_token,            │                              │
     │    refresh_token, user }    │                              │
     │                             │                              │
     │ POST /auth/login            │                              │
     │────────────────────────────>│  SELECT user, verify Argon2  │
     │                             │──────────────────────────────>
     │                             │  <user row>                  │
     │<────────────────────────────│  INSERT refresh_tokens       │
     │  { access_token (15m),      │                              │
     │    refresh_token (7d) }     │                              │
     │                             │                              │
     │ GET /auth/bootstrap         │                              │
     │ Authorization: Bearer ...   │                              │
     │────────────────────────────>│  Verify JWT, SELECT profile  │
     │<────────────────────────────│  + roles + tenant_id         │
     │  { user, profile, roles }   │                              │
     │                             │                              │
     │ POST /auth/refresh          │                              │
     │ { refresh_token }           │                              │
     │────────────────────────────>│  Validate token, rotate      │
     │<────────────────────────────│  new access + refresh tokens │
     │  { access_token,            │                              │
     │    refresh_token }          │                              │
     │                             │                              │
     │ POST /auth/signout          │                              │
     │────────────────────────────>│  DELETE refresh_tokens row   │
     │<────────────────────────────│  200 OK                      │
```

## Role System

Roles are stored in the `user_roles` table, **not** in the JWT payload directly. The VIL backend reads the user's role and `tenant_id` from `user_roles` at login and embeds them in the JWT claims.

| Role      | Access                                       |
| --------- | -------------------------------------------- |
| `student` | Student dashboard, enrolled courses, quizzes |
| `teacher` | Course management, gradebook, analytics      |
| `admin`   | Tenant management, user management, reports  |

Additional roles (`parent`, `principal`) may exist in `user_roles` for extended portal access.

### Reading the role in React

```tsx
// CORRECT:
const { user, profile, role, tenantId } = useAuth()

// WRONG — profile.role does NOT exist:
const role = profile.role // undefined
```

Role comes from `useAuth().role`, which reads from the JWT claims loaded at bootstrap.

## Multi-Tenant Identity

- Every user belongs to exactly one tenant (school)
- `tenant_id` is embedded in the JWT access token at login
- All VIL data-plane queries automatically scope results to `tenant_id`
- Admins may create tenants via `POST /auth/create-tenant`

## RBAC in Rust

The `edusync-middleware` crate provides:

- **`AuthedRequest`**: Axum extractor that validates the Bearer JWT and extracts `user_id`, `tenant_id`, `role`
- **`RbacGuard`**: enforces role requirements per handler

```rust
// Requires a valid JWT with teacher or admin role:
async fn create_course_handler(
    authed: AuthedRequest,  // extracts + validates JWT
    State(state): State<AppState>,
    Json(body): Json<CreateCourseRequest>,
) -> Result<Json<Course>, AppError> {
    authed.require_role(&["teacher", "admin"])?;
    // ...
}
```

## MFA (TOTP)

Optional TOTP-based multi-factor authentication:

1. `POST /auth/mfa/enroll` — returns QR code + TOTP secret
2. User scans QR in authenticator app
3. `POST /auth/mfa/verify` — verifies first TOTP code, enables MFA
4. Subsequent logins require TOTP code after password verification
5. `DELETE /auth/mfa/unenroll` — disables MFA

Implemented using the `totp-rs` crate.

## OAuth (Google)

- `GET /auth/login/google` — initiates OAuth flow
- `GET /auth/callback/google` — handles callback, creates VIL session
- On first OAuth login, a profile and `user_roles` row are created

## Email Verification & Password Reset

- `POST /auth/reset-password` — sends reset email via SMTP (lettre)
- `POST /auth/update-password` — sets new password using recovery token
- `POST /auth/verify` — verifies email address via token

SMTP is configured via `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`.

## LTI Guest Users

When an LTI 1.3 launch occurs from an external platform, EduSync creates a guest user account with a deterministic email:

```
lti-{platformId8}-{sub}@lti.edusync.internal
```

where `platformId8` is the first 8 chars of the SHA-256 of the platform's `iss` URL, and `sub` is the LTI subject claim. This ensures idempotent account creation across multiple launches.

## Brute Force Protection

- Implemented in `edusync-middleware::brute_force::BruteForceTracker`
- Tracks failed login attempts per IP address
- After 5 failed attempts within 15 minutes, subsequent attempts return `429 Too Many Requests`
- Counter resets after the 15-minute window

## Session Storage (Frontend)

The `vilAuthProvider.ts` stores tokens using `vilSession.ts` helpers:

- Access token stored in memory and/or `localStorage` under key `access_token`
- Refresh token stored in `localStorage`
- `subscribeVilSession()` allows components to react to session changes
- `clearVilSession()` is called on signout **before** calling the API signout endpoint, preventing infinite spinner on auth failures

## Known Gotchas

- `.test` TLD emails fail validation — use `.dev` or real domain for test accounts
- React controlled inputs: login form cannot be filled programmatically — requires keyboard events (for E2E testing)
- `signOut()` must clear React state eagerly **before** calling the auth provider's signOut
