# LTI — Feature Module

LTI 1.3 integration untuk launch dari external LMS platforms (Canvas, Moodle)

## Arsitektur

```
src/features/lti/
├── api/           # LTI service layer
├── queries/       # React Query hooks
├── types/         # TypeScript interfaces
├── components/    # LTI components
└── __tests__/     # Unit tests (vitest)
```

## Status

**Complete** — LTI 1.3 Tool Provider.

## Key Tables

| Table                        | Purpose                       |
| ---------------------------- | ----------------------------- |
| `lti_platform_registrations` | External LMS platform configs |
| `lti_nonces`                 | OIDC replay protection        |
| `lti_sessions`               | Active LTI guest sessions     |

## Edge Functions

| Function         | Purpose                                     | Auth                          |
| ---------------- | ------------------------------------------- | ----------------------------- |
| `lti-jwks`       | Public JWKS endpoint                        | None (public GET)             |
| `lti-oidc-login` | OIDC login initiation                       | None (platform-initiated)     |
| `lti-launch`     | Launch token validation + user provisioning | None (validates LTI id_token) |

## Pages

- `src/pages/LtiCallback.tsx` — LTI callback handler
