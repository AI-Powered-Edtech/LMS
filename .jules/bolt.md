## 2026-09-17 - Consolidate Multiple Array Traversals
**Learning:** In highly-rendered components like `StruggleAlertBanner`, using chained higher-order functions like `.filter()` and multiple `.reduce()` calls on the same array adds unnecessary O(N) overhead.
**Action:** Replaced chained higher-order array functions with a single standard `for` loop to minimize CPU overhead in performance-sensitive areas.
