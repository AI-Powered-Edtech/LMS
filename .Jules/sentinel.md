## 2024-05-24 - Unsanitized external URLs in href attributes
**Vulnerability:** Found an XSS vulnerability in src/pages/Integrations.tsx where an external API-provided URL (file_url) was directly interpolated into an anchor tag's href attribute without sanitization.
**Learning:** React's JSX escaping only protects against XSS in text content, not in attributes like href where javascript: URIs can be injected.
**Prevention:** Always wrap external or API-provided URLs used in href attributes with the project's built-in sanitizeUrl utility from @/utils/sanitize.
