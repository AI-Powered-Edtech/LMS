# Data Safety — EduSync LMS (Google Play Console)

> **Audience:** PM, Legal counsel, DPO (Data Protection Officer)
> **Status:** Draft — pending PM + Legal sign-off before Play Console submission
> **Last updated:** 2026-04-17
> **Cross-refs:** [TWA.md](./TWA.md) (U11), [SECURITY.md](./SECURITY.md), [FEATURES.md](./FEATURES.md)

This document is the source of truth for the Google Play Console "Data Safety" section and the complementary data-flow mapping required by Indonesian **UU PDP No. 27/2022** (Pelindungan Data Pribadi).

---

## 1. Legal basis & scope

| Item | Value |
| --- | --- |
| Data Controller | PT EduSync Teknologi Nusantara |
| DPO contact | dpo@edusync.id |
| Privacy policy URL | https://edusync.id/privacy |
| Terms of Service URL | https://edusync.id/terms |
| Legal basis | Consent (PDP Art. 20), Contract performance (student enrolment), Legitimate interest (security logs) |
| Target audience | 13+ (Families Policy **not** applicable) |
| Territorial scope | Indonesia (primary), Southeast Asia (secondary) |
| Data residency | All student data in `ap-southeast-3` (Jakarta). Backups in `ap-southeast-1` (Singapore) for DR. |

---

## 2. Per-endpoint data-flow mapping

Source: `edusync-api/crates/api-server/src/main.rs` (routes) and the handler files listed below. Only **user-facing** endpoints that collect or transmit personal data are enumerated. Internal endpoints (`/api/v1/internal/*`, `/health`, `/ready`) collect no personal data.

### 2.1 Authentication — `auth/*.rs`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? | In-transit | At-rest |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/api/v1/auth/register` | POST | Email, name, password (bcrypt), tenant code | Postgres (primary), Sentry (error only) | Account creation | Required | TLS 1.3 | AES-256 (Postgres), argon2 for password |
| `/api/v1/auth/login` | POST | Email, password | Postgres, Sentry (error only) | Account access | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/signout` | POST | Refresh token | Postgres | Session teardown | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/refresh` | POST | Refresh token, IP (rate limit) | Postgres | Session renewal | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/switch-tenant` | POST | User ID, tenant ID | Postgres | Multi-tenant routing | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/bootstrap` | GET | Session token → profile | Postgres | Frontend init | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/ensure-profile` | POST | Name, avatar URL | Postgres, Cloudflare R2 (avatar) | Profile completion | Required | TLS 1.3 | AES-256 / R2 SSE-S3 |
| `/api/v1/auth/reset-password` | POST | Email | Postgres, SMTP (email relay) | Password reset | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/update-password` | POST | Password (argon2) | Postgres | Password change | Required | TLS 1.3 | Argon2 |
| `/api/v1/auth/verify` | POST | Email, verification token | Postgres | Email verification | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/login/google` | GET | OAuth state | Postgres | Google SSO init | Optional | TLS 1.3 | AES-256 |
| `/api/v1/auth/callback/google` | GET | Google OAuth token, email, name, avatar | Postgres, Google (OAuth provider) | Google SSO | Optional | TLS 1.3 | AES-256 |
| `/api/v1/auth/mfa/enroll` | POST | TOTP secret | Postgres | MFA setup | Optional | TLS 1.3 | AES-256 (encrypted column) |
| `/api/v1/auth/mfa/verify` | POST | TOTP code | Postgres | MFA challenge | Optional | TLS 1.3 | N/A (ephemeral) |
| `/api/v1/auth/mfa/unenroll` | DELETE | User ID | Postgres | MFA removal | Optional | TLS 1.3 | AES-256 |
| `/api/v1/auth/validate-invitation` | GET | Invitation token | Postgres | Invite preview | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/accept-invitation` | POST | Invitation token, user ID | Postgres | Join tenant | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/lookup-class` | GET | Class code | Postgres | Class discovery | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/enroll` | POST | User ID, class ID | Postgres | Student enrolment | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/onboard-student` | POST | Name, email, class assignment, parent contact (optional) | Postgres | Onboarding | Required | TLS 1.3 | AES-256 |
| `/api/v1/auth/create-tenant` | POST | School name, admin email | Postgres | Tenant provisioning | Required | TLS 1.3 | AES-256 |

### 2.2 Courses — `courses.rs`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/courses` | GET | User ID, tenant ID | Postgres | List enrolled courses | Required |
| `/api/v1/courses/:id` | GET | Course ID | Postgres | Course detail | Required |
| `/api/v1/courses` | POST | Course metadata | Postgres | Create course (teacher) | Required |
| `/api/v1/courses/:id` | PUT | Course metadata | Postgres | Edit course | Required |
| `/api/v1/courses/:id` | DELETE | Course ID | Postgres | Soft-delete course | Required |
| `/api/v1/courses/:id/modules` | GET | Course ID | Postgres | List modules | Required |

All encryption: TLS 1.3 in-transit, AES-256 at-rest.

### 2.3 AI — `ai_handlers.rs`, `ai_streaming_handlers.rs`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/ai/grade-essay` | POST | Essay text, rubric, student ID | **Groq** (prompt), Postgres | AI grading | Optional (teacher opt-in per assignment) |
| `/api/v1/ai/tutor` | POST | Chat message, context, student ID | **Groq**, Postgres | AI tutor | Optional (student opt-in) |
| `/api/v1/ai/generate-content` | POST | Lesson topic, grade level | **Groq** | Content gen | Optional (teacher) |
| `/api/v1/ai/generate-quiz` | POST | Lesson content | **Groq**, Postgres | Quiz gen | Optional (teacher) |

> **Note on Groq:** Prompts are sent to Groq's US-hosted inference API under a DPA that forbids training on customer data. No long-term retention by Groq (zero data-retention tier). Student PII is scrubbed via `ai::redact::pii_scrubber` before transmission — only `student_pseudonym_id` (opaque UUID) is sent.

### 2.4 Storage — `storage/handlers.rs`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/storage/upload` | POST | File bytes, metadata, owner ID | **Cloudflare R2**, Postgres | File upload (avatars, submissions, lesson media) | Required for submissions |
| `/api/v1/storage/object/:bucket/*path` | GET | Object path | Cloudflare R2 | File download | Required |
| `/api/v1/storage/object/:bucket` | DELETE | Object path, owner ID | Cloudflare R2 | File deletion | Required |
| `/api/v1/storage/public-url/:bucket/*path` | GET | Object path | Cloudflare R2 | Public-asset URL | Optional |
| `/api/v1/storage/sign` | POST | Object path, TTL | (in-process) | Signed URL | Required |
| `/api/v1/storage/presign-upload` | POST | Object path | Cloudflare R2 | Presigned upload | Required |
| `/api/v1/storage/list/:bucket` | GET | Bucket name | Cloudflare R2 | List files | Required |

Encryption at rest: **Cloudflare R2 SSE-S3** (AES-256). TLS 1.3 in-transit. R2 bucket lives in Cloudflare's global network; object replication is disabled for `student-submissions` to minimize egress.

### 2.5 Notifications — `notification_handlers.rs`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/push/send` | POST | Device push token, notification body | **Google FCM**, Postgres | Push notifications | Optional (per-user opt-in) |
| `/api/v1/webhooks/whatsapp` | GET/POST | Phone number, message | **Meta WhatsApp Cloud API** | WhatsApp bot replies | Optional |
| `/api/v1/whatsapp/send-otp` | POST | Phone number | Meta WhatsApp | OTP delivery | Optional |
| `/api/v1/whatsapp/verify-otp` | POST | Phone number, OTP | Postgres | OTP verification | Optional |
| `/api/v1/pdf/certificate` | POST | Student name, course name, grade | (in-process) | Certificate gen | Optional |

### 2.6 Processing — `processing_handlers.rs`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/progress` | POST | Lesson progress events, time-on-task | Postgres | Progress tracking | Required |
| `/api/v1/quiz/:quiz_id/load` | GET | Quiz ID, student ID | Postgres | Load quiz | Required |
| `/api/v1/scorm/extract` | POST | SCORM zip | Cloudflare R2 | SCORM import | Optional (admin) |
| `/api/v1/import/users` | POST | CSV of names + emails | Postgres | Bulk user import | Optional (admin) |

### 2.7 LTI 1.3 — `lti_handlers.rs`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? |
| --- | --- | --- | --- | --- | --- |
| `/api/v1/lti/jwks` | GET | (public keys only) | — | LTI interop | N/A |
| `/api/v1/lti/oidc-login` | GET | LMS LTI context | External LMS (Moodle/Canvas) | LTI handshake | Optional |
| `/api/v1/lti/launch` | POST | LTI JWT (user, course) | External LMS | LTI launch | Optional |

### 2.8 Realtime — `realtime/*`

| Endpoint | Method | Data collected | Shared with | Purpose | Required? |
| --- | --- | --- | --- | --- | --- |
| `/ws` | GET (Upgrade) | Auth token, chat messages, presence | Postgres (persistence), peer clients (broadcast) | Chat, presence, collab | Required for chat feature |

---

## 3. Third-party sub-processors

| Processor | Data categories | Region | Purpose | DPA signed |
| --- | --- | --- | --- | --- |
| Cloudflare R2 | Files, avatars, submissions | Global edge | Object storage | Yes (Cloudflare DPA v2025-01) |
| Groq Inc. | AI prompts (pseudonymized) | US | LLM inference | Yes (zero-retention tier) |
| Sentry (Functional Software) | Crash stack traces, user ID (hash) | EU (Frankfurt) | Error monitoring | Yes |
| Google FCM | Device push token, notification body | Global | Push notifications | Yes (Google Cloud DPA) |
| Meta WhatsApp Cloud API | Phone number, message content | Global | WhatsApp bot | Yes (Meta Business Tools DPA) |
| SMTP (Amazon SES) | Email, subject, body | `ap-southeast-1` | Transactional email | Yes (AWS DPA) |
| Google OAuth | Google email, name, profile picture | Global | SSO | Yes (Google API ToS) |
| Supabase (Postgres host) | All tenant data | `ap-southeast-3` Jakarta | Managed Postgres | Yes (Supabase DPA) |

---

## 4. Play Console — Data Safety form answers

Copy-paste directly into the Play Console form.

### 4.1 Data types collected

| Category | Type | Collected? | Shared? | Ephemeral? | Required? | Purpose |
| --- | --- | --- | --- | --- | --- | --- |
| **Personal info** | Name | Yes | No | No | Required | Account functionality |
| Personal info | Email address | Yes | No | No | Required | Account functionality, communication |
| Personal info | User IDs | Yes | Yes (Sentry hash) | No | Required | Account, analytics, developer comms |
| Personal info | Phone number | Yes | Yes (Meta WhatsApp) | No | Optional | Parent/student WhatsApp integration |
| **Messages** | In-app messages | Yes | No | No | Optional | Chat / classroom Q&A |
| **Photos & videos** | Photos | Yes | Yes (Cloudflare R2) | No | Optional | Avatars, assignment submissions |
| **Files & docs** | Files & docs | Yes | Yes (Cloudflare R2) | No | Optional | Lesson materials, submissions |
| **Audio** | Voice or sound recordings | Yes | Yes (Cloudflare R2) | No | Optional | Voice-note submissions (guru feedback) |
| **App activity** | App interactions | Yes | No | No | Required | App functionality, analytics |
| App activity | In-app search history | Yes | No | No | Optional | Personalization |
| App activity | Installed apps | No | — | — | — | — |
| App activity | Other user-generated content | Yes (quiz answers, essays, grades) | Yes (Groq, pseudonymized for AI grading opt-in only) | No | Required | Core LMS |
| **Web browsing** | Web browsing history | No | — | — | — | — |
| **App info & perf.** | Crash logs | Yes | Yes (Sentry) | No | Required | App functionality, bug fixing |
| App info | Diagnostics | Yes | Yes (Sentry) | No | Required | App functionality |
| App info | Other app perf. data | Yes | Yes (Sentry) | No | Required | App functionality |
| **Device or other IDs** | Device or other IDs | Yes | Yes (Google FCM) | No | Required | Push notification delivery |

### 4.2 Data collection summary answers

- **Is all of the user data collected by your app encrypted in transit?** → **Yes** (TLS 1.3 enforced, HSTS, see `docs/SECURITY.md` §4)
- **Do you provide a way for users to request that their data be deleted?** → **Yes** (`/privacy/delete-account` in-app; DPO email fallback `dpo@edusync.id`)
- **Do you provide a way for users to export their data?** → **Yes** (`/privacy/export-data` returns a ZIP with JSON + uploaded files within 30 days, UU PDP Art. 9)
- **Does your app comply with the Families Policy?** → **No** (target audience 13+; min age enforced at registration)
- **Has your app been independently validated against a global security standard (MASVS Level 2)?** → **In progress** — MASVS L2 audit scheduled Q3 2026.

### 4.3 Data-sharing disclosure (Play Console free-text)

> "EduSync shares a limited set of user data with vetted sub-processors strictly for service delivery: (1) Sentry — anonymized crash reports with hashed user IDs, for bug fixing; (2) Cloudflare R2 — file, avatar, and submission storage under an SSE-S3-encrypted bucket; (3) Groq — AI prompts with PII scrubbed and pseudonymous IDs, only when a teacher or student has explicitly opted in to AI features; (4) Google FCM — device push tokens, for notifications the user has enabled; (5) Meta WhatsApp Cloud API — phone numbers and message content, only for users who opt in to the WhatsApp integration. No data is sold to advertisers; no ad tech SDKs are bundled. See our Privacy Policy at https://edusync.id/privacy for details."

### 4.4 User controls

| Control | Endpoint | UI location |
| --- | --- | --- |
| Export my data | `GET /api/v1/privacy/export-data` | Settings → Privacy → Export |
| Delete my account | `POST /api/v1/privacy/delete-account` | Settings → Privacy → Delete account |
| Withdraw AI consent | `POST /api/v1/privacy/ai-opt-out` | Settings → AI features |
| Revoke push notifications | `DELETE /api/v1/push/subscriptions/:id` | Settings → Notifications |
| View audit log of my data access | `GET /api/v1/privacy/access-log` | Settings → Privacy → Access log |

### 4.5 Compliance statements

- **UU PDP No. 27/2022 (Indonesia):** compliant. DPO appointed, data residency in Jakarta, breach-notification within 3×24 hours (Art. 46).
- **GDPR:** best-effort compliant for EU teachers/admins; not primary audience.
- **COPPA:** not applicable — app not directed at children under 13.
- **Families Policy:** not applicable — min age 13 enforced.
- **Google Play Developer Program Policies:** compliant.

---

## 5. Breach notification plan

See `docs/incidents/` and `docs/DISASTER_RECOVERY.md`. Summary:
- **T+0:** detect via Sentry alert or customer report.
- **T+1h:** DPO + Legal paged via PagerDuty.
- **T+24h:** internal root-cause analysis.
- **T+72h:** notify Kominfo (Indonesia regulator) and affected users per UU PDP Art. 46.

---

## 6. Sign-off

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| PM | _______ | _______ | _______ |
| Legal | _______ | _______ | _______ |
| DPO | _______ | _______ | _______ |
| CTO | _______ | _______ | _______ |

Once signed, this document becomes the source of truth for Play Console Data Safety answers and must be re-reviewed quarterly or on any new sub-processor.
