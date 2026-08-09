## 2024-08-09 - Add Tooltips to Icon-only Buttons
**Learning:** Icon-only buttons in complex toolbars (like BuilderTopBar) often lack visible text, making them confusing for users who aren't familiar with the icons. Adding Tooltips improves both usability and accessibility.
**Action:** Always wrap icon-only buttons with a Tooltip component to provide context, and ensure they have an `aria-label` for screen readers.
