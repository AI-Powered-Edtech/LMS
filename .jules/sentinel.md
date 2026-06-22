## 2025-06-22 - Missing Client-Side URL Sanitization
**Vulnerability:** User-controlled URLs (like `file_url` or `issuer`) were bound directly to React `href` attributes in several components (e.g., `Integrations.tsx`, `LtiManagement.tsx`).
**Learning:** React escapes HTML content, but does NOT sanitize `href` attribute values against `javascript:` or `data:` URIs, leading to potential Cross-Site Scripting (XSS) if clicked.
**Prevention:** Always wrap external or user-provided URL strings with a dedicated sanitization utility (like the project's `@/utils/sanitize` `sanitizeUrl` function) before assigning them to anchor tags.
