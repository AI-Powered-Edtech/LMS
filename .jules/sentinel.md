## 2026-08-25 - Prevent DOM XSS and Open Redirect
**Vulnerability:** Dynamic URLs were being passed directly to window.location.assign() without sanitization in the GlobalSearchModal component.
**Learning:** Even if URLs currently originate from internal backend responses, they can become an attack vector for DOM-based XSS or Open Redirects if the data source is compromised or later refactored to include user-supplied input. Sinks like window.location.assign() must always treat input as untrusted.
**Prevention:** Always wrap dynamic or user-provided URLs in the sanitizeUrl utility function before passing them to navigation sinks.
