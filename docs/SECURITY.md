# EduSync — Security Model

## Auth Security

### JWT Tokens

- **Algorithm**: HS256
- **Access token expiry**: 15 minutes (`JWT_SECRET`)
- **Refresh token expiry**: 7 days (`JWT_REFRESH_SECRET`)
- **Minimum secret length**: 32 characters (enforced at startup with error log)
- **Storage**: access token in memory/localStorage; refresh token in DB (`refresh_tokens` table) + localStorage

### Brute Force Protection

- Implemented in `edusync-middleware::brute_force::BruteForceTracker`
- 5 failed login attempts per IP address per 15-minute window → `429 Too Many Requests`
- Counter is in-memory (per server process); distributed deployments should use Redis or DB-backed tracking

### Password Hashing

- New passwords hashed with **Argon2** (`argon2` crate)
- Legacy bcrypt support for migration (`bcrypt` crate)
- No plaintext passwords stored

### Token Rotation

- Every `POST /auth/refresh` call **rotates** the refresh token: old token is invalidated, new token issued
- Signout (`POST /auth/signout`) deletes the refresh token from DB immediately

## Tenant Isolation

### Architecture

- Every data table has a `tenant_id UUID NOT NULL` column
- There is **no Row-Level Security (RLS)** at the database layer (removed Phase 6)
- All tenant isolation is enforced by VIL middleware:
  1. JWT is validated by `AuthedRequest` extractor
  2. `tenant_id` is extracted from JWT claims
  3. Every DB query is scoped: `WHERE tenant_id = $tenant_id`

### Cross-Tenant Access

- Impossible via the normal API surface — all data-plane endpoints inject caller's `tenant_id`
- No API exists to query across tenants
- Admin super-users (platform admins) are not yet implemented; tenant admins are scoped to their own tenant

### `auto_set_tenant_id()` Trigger

- Automatically fills `tenant_id` on INSERT for all tables that use it
- Ensures tenant_id cannot be accidentally omitted

## RBAC (Role-Based Access Control)

### Roles

| Role        | Capabilities                                                       |
| ----------- | ------------------------------------------------------------------ |
| `student`   | Read enrolled courses, submit quizzes/assignments, view own grades |
| `teacher`   | Create/manage courses, grade students, view class analytics        |
| `admin`     | Manage all tenant users, tenant settings, all reports              |
| `parent`    | View child's progress via parent portal                            |
| `principal` | Executive dashboard (read-only analytics)                          |

### Enforcement in Rust

The `AuthedRequest` Axum extractor validates the JWT on every request and exposes:

- `user_id: Uuid`
- `tenant_id: Uuid`
- `role: String`

Handlers call `authed.require_role(&["teacher", "admin"])` to enforce role requirements. Unauthorized requests return `403 Forbidden`.

### Enforcement in React Router

```tsx
<Route element={<RoleRoute role="teacher" />}>
  <Route path="/app/teacher/courses" element={<CoursesPage />} />
</Route>

// Multiple roles:
<Route element={<RoleRoute role={["student", "teacher"]} />}>
  <Route path="/leaderboard" element={<LeaderboardPage />} />
</Route>
```

Note: `RoleRoute` for leaderboard **must** include both `student` and `teacher`.

## Input Validation

### Frontend

- **Valibot** (v1) for form schema validation
- DOMPurify for sanitizing user-generated HTML content
- All API bodies are typed via TypeScript

### Backend

- All SQL queries use parameterized statements via sqlx — no string interpolation
- serde_json deserializes JSON bodies into typed Rust structs
- Invalid JSON or missing required fields return `400 Bad Request`

## CORS

- CORS is configured via `tower-http::cors` middleware on the VIL server
- Allowed origins configured via `CORS_ORIGINS` environment variable
- Default (dev): `http://localhost:5173`
- Production: set to your actual frontend domain

## Security Headers (nginx)

The nginx configuration should include (add to production `nginx.conf`):

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; ..." always;
```

## Storage Security

- All storage endpoints require a valid JWT (`Authorization: Bearer`)
- Object paths include `tenant_id` prefix — tenants cannot access each other's files
- Private files (videos, submissions) are never publicly accessible; access requires signed URLs
- Presigned PUT URLs are scoped to specific paths and have a 15-minute TTL
- No path traversal possible — paths are validated and normalized server-side

## WebSocket Security

- JWT access token passed via `?token=<token>` query parameter
- Token is validated before the WebSocket upgrade is accepted
- Unauthenticated connections are rejected with `401`
- Channel authorization: clients can only join channels scoped to their own `user_id` or `tenant_id`

## LTI Security

- LTI 1.3 uses RSA-signed JWTs (`LTI_RSA_PRIVATE_KEY` / `LTI_RSA_PUBLIC_KEY`)
- Nonces stored in `lti_nonces` table (service-role only) to prevent replay attacks
- JWKS endpoint is public (`/api/v1/lti/jwks`) — platforms use it to verify EduSync's identity

## SCORM Security

- SCORM content runs in a sandboxed `<iframe>`
- The SCORM API bridge attaches to the **parent** `window`, not the iframe's window
- `scorm_runtime_data.lesson_status` has sticky terminal states: once `completed` or `passed`, it cannot revert

## Secrets Checklist (Production)

| Secret                  | Min Length   | Notes                                |
| ----------------------- | ------------ | ------------------------------------ |
| `JWT_SECRET`            | 32 chars     | HS256 signing key for access tokens  |
| `JWT_REFRESH_SECRET`    | 32 chars     | HS256 signing key for refresh tokens |
| `LTI_RSA_PRIVATE_KEY`   | 2048-bit RSA | PEM format                           |
| `LTI_RSA_PUBLIC_KEY`    | 2048-bit RSA | PEM format                           |
| `S3_SECRET_ACCESS_KEY`  | —            | R2 / MinIO secret                    |
| `VAPID_PRIVATE_KEY`     | —            | Web Push private key                 |
| `SMTP_PASSWORD`         | —            | Email relay password                 |
| `WHATSAPP_ACCESS_TOKEN` | —            | Meta API token                       |

The server logs an error at startup if `JWT_SECRET` or `JWT_REFRESH_SECRET` are shorter than 32 characters.
