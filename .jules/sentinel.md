## 2026-08-23 - DOM-based XSS and Open Redirect in Global Search Modal
**Vulnerability:** The `GlobalSearchModal` uses `window.location.assign()` directly with dynamic search result URLs, leaving the application vulnerable to DOM-based XSS and Open Redirect if a malicious payload is injected into search results.
**Learning:** React's built-in XSS protection does not apply to sinks like `window.location`. User-controlled input or dynamic variables passed to these APIs must always be strictly validated or sanitized before assignment.
**Prevention:** Always wrap dynamic or user-provided URLs in a robust sanitization utility like `sanitizeUrl` before passing them to sensitive sinks such as `window.location.assign()`.
