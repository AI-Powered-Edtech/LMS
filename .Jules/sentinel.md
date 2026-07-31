## 2024-05-18 - Missing URL Sanitization in Link Elements
**Vulnerability:** Found multiple instances of \`href\` attributes in anchor tags (`<a>`) using raw un-sanitized values directly from APIs (e.g., `j.file_url`, `p.issuer`, `step.href`).
**Learning:** React does not automatically prevent `javascript:` URIs when passed to `href`. If these URLs are user-controlled or influenced, it creates an XSS vector when the user clicks the link.
**Prevention:** Always use `sanitizeUrl` (or similar utility) for all `href` values derived from dynamic data, ensuring `javascript:`, `vbscript:`, and `data:` URIs are neutralized.
