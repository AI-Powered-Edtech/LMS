## 2024-06-24 - Add ARIA Label and Focus Indicators to Close Buttons
**Learning:** Modal close buttons in the project frequently lack `aria-label` attributes and focus visibility indicators. This renders icon-only close buttons inaccessible to screen reader users and invisible for keyboard users during navigation.
**Action:** Always verify that interactive buttons consisting solely of icons (like `<X />`) have an `aria-label` (such as `aria-label="Tutup"`) and include keyboard accessibility utility classes like `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`.
