## 2026-08-17 - DOM-based XSS via window.location.assign
**Vulnerability:** window.location.assign was called with an unsanitized URL from search results, allowing potential DOM-based XSS via javascript: URIs.
**Learning:** Any dynamic or API-provided URLs passed to window.location sinks must be sanitized to prevent malicious script execution.
**Prevention:** Always use sanitizeUrl from @/utils/sanitize before passing dynamic values to window.location.assign or window.location.replace.
