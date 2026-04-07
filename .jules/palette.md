## 2024-03-01 - Missing ARIA Labels on Builder Interface Actions
**Learning:** Complex interactive panels like the Course Builder heavily rely on icon-only drag-and-drop or action menus (like add/delete items). Often, tooltips (`title` attribute) are provided, but these fail screen readers as `aria-label`s are frequently forgotten on these interactive micro-components, leading to an inaccessible builder interface.
**Action:** When working on builder or drag-and-drop interfaces with dense iconography, explicitly check for and add `aria-label` attributes alongside `title` attributes for all icon-only action buttons.

## 2026-04-07 - Missing ARIA Labels Across Disparate Components
**Learning:** Developers often remember `title` tooltips but frequently omit `aria-label` on isolated icon-only buttons (like delete, refresh, read) in lists and sidebars.
**Action:** Proactively grep for `title=` on `<button` tags and verify the presence of `aria-label`, especially on small action buttons without textual content.
