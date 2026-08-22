## 2026-08-22 - DOM-based XSS Prevention on Navigation
**Vulnerability:** window.location.assign was used with an un-sanitized url sourced from an API in GlobalSearchModal, which could lead to DOM-based XSS if the url was a javascript: or data: URI.
**Learning:** Always sanitize urls coming from API search results or untrusted inputs before navigating or redirecting using window.location methods.
**Prevention:** Use the sanitizeUrl utility function (from @/utils/sanitize) to sanitize URLs before passing them to window.location.assign.
