## 2024-05-24 - Accessibility Fix: Icon-Only Buttons
**Vulnerability:** Icon-only buttons (like delete buttons with just a Trash icon) lacked screen-reader accessible names, violating WCAG 2.1 AA.
**Learning:** React components that use icons without text must explicitly provide an `aria-label` to be perceivable by screen readers.
**Action:** Always ensure that `<button>` elements containing only an `<Icon />` have an appropriate localized `aria-label` (e.g., `aria-label="Hapus pertanyaan"`).
