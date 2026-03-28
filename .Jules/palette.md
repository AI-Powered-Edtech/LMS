## 2024-05-24 - Icon-only buttons lacking ARIA labels
**Learning:** Some older or frequently modified components like CourseBuilder use `title` for tooltip text but omit `aria-label` on icon-only buttons (e.g. "Kembali" back button in `BuilderTopBar.tsx`). `title` is not reliably announced by all screen readers in all contexts, making these buttons inaccessible.
**Action:** When implementing or reviewing icon-only buttons, always explicitly add an `aria-label` even if a `title` attribute is present. The `aria-label` provides the required accessible name for assistive technologies.
