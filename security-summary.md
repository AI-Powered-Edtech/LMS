# Security Summary

* Fixed XSS vulnerability in admin external links. Wrapped unsanitized external URLs (`j.file_url`, `p.issuer`) with `sanitizeUrl` from `@/utils/sanitize` to prevent `javascript:` URIs from executing.
