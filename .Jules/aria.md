## 2024-05-18 - Added new tab hints to icon-only buttons in DocumentManager

**Action:** Added `aria-label` attributes to the icon-only download link and delete button in `DocumentManager.tsx`. Combined the new tab hint with the existing action label for the download link.
**Insight:** Some elements like icon-only links opening in new tabs need `aria-label` attributes combining both the descriptive text and the new tab hint rather than relying solely on `title` attributes, to satisfy WCAG requirements correctly.
**Application:** Remember to handle `target="_blank"` properly on links missing visible text by appending the hint `(buka di tab baru)` to the `aria-label`.
