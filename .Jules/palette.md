## 2024-07-31 - Accessible Gamification Elements
**Learning:** Visual gamification elements like streak icons and XP counters often lack semantic meaning and keyboard focus, making them invisible or confusing to screen reader users and inaccessible via keyboard navigation.
**Action:** Always wrap visual metrics in a `Tooltip`, add a descriptive `aria-label` in Bahasa Indonesia, and include `tabIndex={0}` with standard `focus-visible` ring classes to ensure they are discoverable and understandable for all users.
