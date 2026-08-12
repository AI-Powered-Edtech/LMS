## 2024-05-20 - [Fix DOM XSS / Open Redirect in Global Search Modal]
**Vulnerability:** window.location.assign was directly receiving un-sanitized dynamic URLs retrieved from the database search results.
**Learning:** The database data could be compromised or polluted with malicious `javascript:` URIs leading to Open Redirect or DOM-based XSS attacks.
**Prevention:** Always wrap dynamic or user-provided URLs in the `sanitizeUrl` utility function (imported from `@/utils/sanitize`) before passing them to sinks like `window.location.assign()`.
