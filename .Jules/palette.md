## 2025-03-03 - Accessible Icon-Only Action Buttons
**Learning:** Icon-only action buttons (like delete or edit actions) that rely on `opacity-0 group-hover:opacity-100` for visual cleanliness become completely invisible and unusable for keyboard navigators, even if they have `aria-label`s.
**Action:** Always combine `opacity-0 group-hover:opacity-100` with `focus-visible:opacity-100`, `focus-visible:outline-none`, and `focus-visible:ring-2` to ensure the button becomes visible and has a clear focus indicator when a user tabs to it.
