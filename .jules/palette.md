## 2024-03-19 - Dropdown Buttons Missing A11y Attributes
**Learning:** Found that custom dropdown triggers (like the profile avatar button) are relying on implicit accessibility, missing explicit `aria-expanded` and `aria-haspopup` attributes, which makes it harder for screen readers to understand the interaction model.
**Action:** When working on custom dropdowns or popovers in this app, explicitly set `aria-haspopup="true"` and `aria-expanded={isOpenState}`.
