## 2024-05-18 - Prevent Open Redirect and DOM XSS in Global Search
**Vulnerability:** window.location.assign was called with unsanitized dynamic search result URLs in GlobalSearchModal.tsx.
**Learning:** Even though search results are internally populated via API, manipulating the database records or local storage could inject unsafe javascript: or data: URIs, leading to XSS or unvalidated redirects.
**Prevention:** Always use the sanitizeUrl utility from @/utils/sanitize for any dynamic URL passed to window.location assignments or hrefs.
