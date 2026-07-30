## 2024-06-15 - Unsanitized API-Provided URLs
**Vulnerability:** API-provided URLs like `file_url` and `issuer` were directly interpolated into `href` attributes.
**Learning:** React JSX does not automatically sanitize `href` attributes against malicious schemes like `javascript:`, enabling potential XSS if the API payload is tampered with.
**Prevention:** Always wrap dynamically rendered external URLs with `sanitizeUrl` from `@/utils/sanitize` before binding them to `href`.
