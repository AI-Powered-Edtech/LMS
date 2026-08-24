## 2026-08-24 - Prevent DOM XSS in Global Search Modal
**Vulnerability:** window.location.assign() was called with a user-provided URL directly from the search results, leading to a potential DOM-based XSS vulnerability if an attacker could inject javascript: or data: URIs.
**Learning:** Even URLs provided by internal services should be sanitized on the client side before being used in sinks like window.location.assign() or window.location.href, to follow the principle of defense in depth.
**Prevention:** Always wrap dynamic or user-provided URLs in the sanitizeUrl utility function before passing them to sinks like window.location.assign().
