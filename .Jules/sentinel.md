## 2026-08-21 - Fix XSS/Open Redirect in GlobalSearchModal
**Vulnerability:** Unsanitized URL passed to `window.location.assign(url)` in `GlobalSearchModal.tsx` could allow DOM-based XSS (e.g. `javascript:` URLs) or open redirect.
**Learning:** Even search result URLs originating from internal structures might be polluted if data validation fails at the backend or if they are modified.
**Prevention:** Always wrap dynamically generated URLs passed to sinks like `window.location.assign` or `window.location.href` in `sanitizeUrl` to strip dangerous protocols.
