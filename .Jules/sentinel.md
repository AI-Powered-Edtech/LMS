## 2026-07-27 - [Fix XSS vulnerability in external links]
**Vulnerability:** External links in Integrations and LTI Management used `href` attributes directly with potentially unsafe URLs without sanitization.
**Learning:** `j.file_url` and `p.issuer` variables can contain malicious URIs like `javascript:` leading to Cross-Site Scripting (XSS).
**Prevention:** Always sanitize dynamic URLs used in `href` using `sanitizeUrl` from `@/utils/sanitize` to prevent script execution.
