# Palette Journal

## 2026-03-24 - Icon-only buttons are pervasive and completely unlabeled
**Learning:** Audit found 51 icon-only buttons across the codebase with zero `aria-label` attributes. 13 had `title` (tooltip) but still no `aria-label`, meaning screen readers cannot announce them. The pattern is systemic — every developer creates `<button><Icon /></button>` without labels. The existing reusable UI components (`Input.tsx`, `Select.tsx`, `FormField.tsx`) are well-built for form accessibility, but buttons have no equivalent wrapper enforcing labels.
**Action:** Consider creating a shared `IconButton` component that requires an `aria-label` prop at the type level, making it impossible to create unlabeled icon buttons. Prioritize Speed Grader and Calendar navigation buttons first since teachers use them most frequently.
