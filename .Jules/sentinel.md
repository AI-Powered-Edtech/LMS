## 2024-08-16 - DOM-Based XSS in React Navigation
**Vulnerability:** Calling `window.location.assign(url)` with unvalidated data from an API response (search results) allows for DOM-based XSS (e.g., via `javascript:` URIs) and Open Redirect.
**Learning:** Even internal API responses should be treated as untrusted data when passed to dangerous sinks like `window.location`. React's built-in escaping does not protect against XSS when modifying the `window.location` directly.
**Prevention:** To prevent DOM-based XSS and Open Redirect vulnerabilities in React components, always wrap dynamic or user-provided URLs in the `sanitizeUrl` utility function (imported from `@/utils/sanitize`) before passing them to sinks like `window.location.assign()`.
