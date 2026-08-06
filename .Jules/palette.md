## 2024-05-18 - Tooltip Accessibility
**Learning:** Adding `tabIndex={0}` to static `div` elements for tooltip hover breaks screen reader logic and causes `jsx-a11y/no-noninteractive-tabindex` errors. Using semantic buttons (`role="button"` or `<button>`) for non-interactive elements creates deceptive semantics for screen readers.
**Action:** When making static elements focusable purely for tooltips, retain their original semantics, use `tabIndex={0}`, and explicitly disable the `jsx-a11y/no-noninteractive-tabindex` linting rule to acknowledge the intentional, safe use case.
