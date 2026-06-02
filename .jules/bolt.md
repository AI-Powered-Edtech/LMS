## 2024-05-18 - Optimize deep lookups to prevent unnecessary re-renders
**Learning:** Using `.flatMap().find()` to look up items in global context causes intermediate array allocations and triggers O(N) work on every render, especially when the context frequently updates.
**Action:** Replaced `.flatMap().find()` with a memoized `useMemo` block using an explicit nested `for...of` loop and early returns. This eliminates array allocations and caches the lookup result until dependencies change.
