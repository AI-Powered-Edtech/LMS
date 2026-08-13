## 2026-08-13 - DOM XSS via un-sanitized window.location.assign
**Vulnerability:** User-provided URLs were directly passed to `window.location.assign(url)` in Global Search.
**Learning:** Even internal navigation or features pulling URLs from backend APIs must be sanitized. A malicious URL starting with `javascript:` could be injected and executed on click.
**Prevention:** Always use `sanitizeUrl()` from `@/utils/sanitize` when passing any URL to sinks like `window.location.assign()` or `window.location.href`.
