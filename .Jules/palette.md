## 2026-03-22 - Form validation accessibility linking error messages to form fields

**Learning:** When displaying error messages for form fields, simply adding an error paragraph visually is not enough. Screen readers need `aria-invalid="true"` and `aria-describedby` linking to the error message ID to correctly announce the invalid state and read the corresponding error message contextually.
**Action:** Always link form error messages to their respective input/select elements using `aria-invalid` and `aria-describedby` attributes.
