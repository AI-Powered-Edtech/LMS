## 2026-08-19 - DOM-based XSS in Global Search
**Vulnerability:** Dynamic URLs passed directly to `window.location.assign()` without sanitization.
**Learning:** Even if URLs come from an internal search service, defense-in-depth requires sanitizing them at the sink to prevent malicious data (like `javascript:` payloads) from exploiting client-side routing logic.
**Prevention:** Always wrap dynamic URLs in the `sanitizeUrl` utility function before passing them to sensitive sinks like `window.location.assign()`.
