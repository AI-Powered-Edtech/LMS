# EduSync VIL API Reference

## Backend Framework

All endpoints are served by the VIL (Vastar Intermediate Language) backend.
VIL is a process-oriented Rust framework (https://github.com/OceanOS-id/VIL)
built on Axum 0.7.

**Base URL**: `http://localhost:8080` (dev) or via nginx at port 80  
**Observer**: `http://localhost:8080/_vil/dashboard/` (live metrics)  
**Auto-registered endpoints** (free from VilApp):

| Method | Path               | Description                       |
| ------ | ------------------ | --------------------------------- |
| `GET`  | `/health`          | Liveness probe                    |
| `GET`  | `/ready`           | Readiness probe                   |
| `GET`  | `/metrics`         | Prometheus metrics                |
| `GET`  | `/_vil/dashboard/` | VIL Observer UI                   |
| `GET`  | `/_vil/api/routes` | Registered routes JSON            |
| `GET`  | `/_vil/api/system` | OS metrics (cpu, memory, threads) |

---

Base prefix: `/api/v1/`

## Authentication

All endpoints except `/auth/register`, `/auth/login`, `/lti/jwks`, and `/auth/login/google` require a Bearer token:

```
Authorization: Bearer <access_token>
```

Access tokens expire in 15 minutes. Use `/auth/refresh` with the refresh token to obtain a new pair.

---

## Auth — `/api/v1/auth/`

### `POST /api/v1/auth/register`

Register a new user account.

**Body:**

```json
{ "email": "user@example.com", "password": "...", "full_name": "..." }
```

**Response:** `{ access_token, refresh_token, user }`

---

### `POST /api/v1/auth/login`

Sign in with email and password.

**Body:**

```json
{ "email": "user@example.com", "password": "..." }
```

**Response:** `{ access_token, refresh_token, expires_in, user: { id, email, role, tenant_id } }`

**Rate limit:** 5 attempts per 15 minutes per IP. Subsequent attempts return `429 Too Many Requests`.

---

### `POST /api/v1/auth/signout`

Invalidate the current refresh token.

**Auth:** Bearer required  
**Body:** `{ "refresh_token": "..." }`

---

### `POST /api/v1/auth/refresh`

Exchange a refresh token for a new access + refresh token pair.

**Body:** `{ "refresh_token": "..." }`  
**Response:** `{ access_token, refresh_token, expires_in }`

---

### `GET /api/v1/auth/bootstrap`

Restore session on frontend load. Returns current user profile and roles.

**Auth:** Bearer required  
**Response:** `{ user, profile, roles, tenant_id }`

---

### `POST /api/v1/auth/ensure-profile`

Create or update the user's profile record.

**Auth:** Bearer required

---

### `POST /api/v1/auth/reset-password`

Send a password reset email.

**Body:** `{ "email": "user@example.com" }`

---

### `POST /api/v1/auth/update-password`

Set a new password using a recovery token.

**Body:** `{ "token": "...", "password": "..." }`

---

### `POST /api/v1/auth/verify`

Verify email address using a verification token.

**Body:** `{ "token": "..." }`

---

### `GET /api/v1/auth/login/google`

Initiate Google OAuth flow. Redirects to Google consent screen.

### `GET /api/v1/auth/callback/google`

Google OAuth callback. Issues VIL session tokens on success.

---

### `POST /api/v1/auth/mfa/enroll`

Enroll TOTP MFA. Returns QR code and secret.

**Auth:** Bearer required

### `POST /api/v1/auth/mfa/verify`

Verify a TOTP code to complete MFA enrollment or login.

**Auth:** Bearer required  
**Body:** `{ "code": "123456" }`

### `DELETE /api/v1/auth/mfa/unenroll`

Disable MFA for the current user.

**Auth:** Bearer required

---

### Tenant / Class RPCs

| Method | Path                        | Description                  |
| ------ | --------------------------- | ---------------------------- |
| `GET`  | `/auth/validate-invitation` | Validate an invitation token |
| `POST` | `/auth/accept-invitation`   | Accept a tenant invitation   |
| `GET`  | `/auth/lookup-class`        | Look up a class by code      |
| `POST` | `/auth/enroll`              | Enroll a student in a class  |
| `POST` | `/auth/onboard-student`     | Complete student onboarding  |
| `POST` | `/auth/create-tenant`       | Create a new tenant (admin)  |

---

## Health

| Method | Path             | Description                                 |
| ------ | ---------------- | ------------------------------------------- |
| `GET`  | `/api/v1/health` | Liveness probe — returns `{ status: "ok" }` |
| `GET`  | `/api/v1/ready`  | Readiness probe — checks DB connectivity    |

---

## Data Plane (PostgREST-compatible) — `/api/v1/`

The data plane provides a PostgREST-compatible interface for querying any table the caller has access to. Tenant isolation is enforced server-side.

### `POST /api/v1/data/:table`

Query a table with filters, ordering, and pagination.

**Auth:** Bearer required  
**Body:**

```json
{
  "select": "id,title,status",
  "filters": { "status": "published" },
  "order": "created_at.desc",
  "limit": 20,
  "offset": 0
}
```

**Response:** `{ data: [...], count: N }`

---

### `POST /api/v1/rpc/:name`

Call a PostgreSQL stored procedure (RPC).

**Auth:** Bearer required  
**Body:** JSON object of named parameters  
**Response:** Procedure return value

**Example:**

```bash
POST /api/v1/rpc/get_student_progress
{ "p_course_id": "uuid", "p_student_id": "uuid" }
```

---

## Courses — `/api/v1/courses/`

| Method   | Path                          | Description                             |
| -------- | ----------------------------- | --------------------------------------- |
| `GET`    | `/api/v1/courses`             | List courses (paginated, tenant-scoped) |
| `GET`    | `/api/v1/courses/:id`         | Get single course by ID                 |
| `POST`   | `/api/v1/courses`             | Create a new course                     |
| `PUT`    | `/api/v1/courses/:id`         | Update a course                         |
| `DELETE` | `/api/v1/courses/:id`         | Delete a course                         |
| `GET`    | `/api/v1/courses/:id/modules` | Get course modules with lessons         |

**Auth:** Bearer required for all.  
**Create/Update/Delete:** requires `teacher` or `admin` role.

---

## AI — `/api/v1/ai/`

All AI endpoints require `GROQ_API_KEY` to be configured on the backend. Returns `503` if not configured.

**Auth:** Bearer required for all.

### `POST /api/v1/ai/grade-essay`

AI-assisted essay grading using a rubric.

**Body:**

```json
{
  "submission_id": "uuid",
  "rubric": "...",
  "content": "student essay text"
}
```

### `POST /api/v1/ai/tutor`

AI tutoring chat. Sends a student query and returns a contextual response.

**Body:** `{ "message": "...", "context": "..." }`

### `POST /api/v1/ai/generate-content`

Generate learning content from a topic or outline.

**Body:** `{ "topic": "...", "level": "SMA", "language": "id" }`

### `POST /api/v1/ai/generate-quiz`

Generate quiz questions from provided learning content.

**Body:** `{ "content": "...", "num_questions": 10, "type": "mcq" }`

---

## LTI 1.3 — `/api/v1/lti/`

### `GET /api/v1/lti/jwks`

Return the public JWKS for LTI platform verification. **Public — no auth required.**

### `GET /api/v1/lti/oidc-login`

Initiate the LTI 1.3 OIDC login flow. Redirects to the platform.

**Query params:** `iss`, `login_hint`, `target_link_uri`, `lti_message_hint`

### `POST /api/v1/lti/launch`

Receive and validate an LTI 1.3 launch JWT. Creates or updates the guest user. Returns redirect to the target resource.

**Env vars required:** `LTI_RSA_PRIVATE_KEY`, `LTI_RSA_PUBLIC_KEY`, `LTI_LAUNCH_URL`, `APP_URL`

---

## Storage — `/api/v1/storage/`

**Auth:** Bearer required for all.

### `POST /api/v1/storage/upload`

Upload a file via multipart/form-data (max 10 MB via this endpoint; larger files should use presigned PUT).

**Form fields:** `file` (binary), `bucket` (string), `path` (string)

### `GET /api/v1/storage/object/:bucket/*path`

Proxy-download a private file from S3. Checks auth and tenant ownership.

### `DELETE /api/v1/storage/object/:bucket`

Delete one or more files from a bucket.

**Body:** `{ "paths": ["path/to/file.jpg"] }`

### `GET /api/v1/storage/public-url/:bucket/*path`

Return the public CDN URL for a file.

### `POST /api/v1/storage/sign`

Create a time-limited signed URL for private file access.

**Body:** `{ "bucket": "...", "path": "...", "expires_in": 3600 }`

### `POST /api/v1/storage/presign-upload`

Create a presigned PUT URL for direct large-file upload (≥ 10 MB) to S3.

**Body:** `{ "bucket": "...", "path": "...", "content_type": "video/mp4" }`

### `GET /api/v1/storage/list/:bucket`

List objects in a bucket (tenant-scoped).

**Query params:** `prefix`, `limit`, `offset`

### `GET /api/v1/storage/migration-status`

Return storage migration status (for admin tooling).

---

## Progress & Processing — `/api/v1/`

### `POST /api/v1/progress`

Batch-enqueue telemetry events (lesson progress, quiz answers, time-on-task).

**Auth:** Bearer required  
**Body:** `{ "events": [{...}] }`

### `GET /api/v1/quiz/:quiz_id/load`

Load a full quiz (questions + options) for a student session.

**Auth:** Bearer required  
**Response:** `{ quiz, questions: [{ text, options: [{text, id}] }] }`

### `POST /api/v1/scorm/extract`

Extract and index a SCORM ZIP package uploaded to storage.

**Auth:** Bearer required (teacher/admin)  
**Body:** `{ "storage_path": "...", "lesson_id": "uuid" }`

### `POST /api/v1/import/users`

Bulk-import users from a CSV file.

**Auth:** Bearer required (admin)  
**Body:** multipart/form-data with `file` field (CSV)

---

## Notifications — `/api/v1/`

### `POST /api/v1/push/send`

Send a Web Push notification (VAPID).

**Auth:** Bearer required  
**Body:** `{ "user_id": "uuid", "title": "...", "body": "..." }`

**Env vars required:** `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`

### `POST /api/v1/whatsapp/send-otp`

Send a WhatsApp OTP to a phone number.

**Body:** `{ "phone": "+62812...", "user_id": "uuid" }`

**Env vars required:** `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`

### `POST /api/v1/whatsapp/verify-otp`

Verify a WhatsApp OTP code.

**Body:** `{ "phone": "+62812...", "code": "123456" }`

### `GET /api/v1/webhooks/whatsapp`

WhatsApp webhook verification (GET).

### `POST /api/v1/webhooks/whatsapp`

WhatsApp incoming message webhook (POST).

---

## PDF — `/api/v1/pdf/`

### `POST /api/v1/pdf/certificate`

Generate a completion certificate PDF and store it in S3.

**Auth:** Bearer required  
**Body:** `{ "enrollment_id": "uuid" }`  
**Response:** `{ url: "https://..." }` (public S3 URL)

---

## WebSocket — `/ws`

### `GET /ws?token=<access_token>`

Upgrade HTTP connection to WebSocket. The JWT access token is passed as a query parameter.

After connecting, send JSON messages to join/leave channels. See [REALTIME.md](REALTIME.md) for the full protocol.

---

## Observability (Internal)

| Method | Path                                 | Description                   |
| ------ | ------------------------------------ | ----------------------------- |
| `GET`  | `/api/v1/internal/shadow-config`     | Get shadow mode config        |
| `POST` | `/api/v1/internal/divergence-events` | Log a shadow divergence event |

---

## Error Responses

All errors follow this shape:

```json
{
  "error": "Deskripsi kesalahan dalam Bahasa Indonesia.",
  "code": "ERROR_CODE",
  "status": 400
}
```

Common status codes:

| Code  | Meaning                                    |
| ----- | ------------------------------------------ |
| `400` | Bad request / validation error             |
| `401` | Not authenticated                          |
| `403` | Forbidden (wrong role or tenant)           |
| `404` | Resource not found                         |
| `409` | Conflict (e.g., duplicate email)           |
| `429` | Rate limit exceeded                        |
| `500` | Internal server error                      |
| `503` | Service unavailable (e.g., AI key missing) |
