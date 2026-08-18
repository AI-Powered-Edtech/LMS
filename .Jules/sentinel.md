## 2026-08-18 - Prevent password reset token exposure in logs
**Vulnerability:** The password reset endpoint logged the full password reset URL containing the secret token in plain text using tracing::info!, which exposes it to anyone with access to the logs.
**Learning:** Even when comments claim "In dev: log the reset URL", tracing::info! is still logged in production unless explicitly guarded.
**Prevention:** Always verify that sensitive information logged for development purposes is wrapped in an environment check (e.g. APP_ENV == "development") or uses a debug tracing level that is stripped in production.
