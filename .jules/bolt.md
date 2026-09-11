## 2026-09-11 - Memoizing Derived Arrays
**Learning:** Filtering and slicing arrays on every render (e.g., pendingAssignments) is an O(N) operation that causes unnecessary allocations.
**Action:** Always wrap derived state arrays in useMemo to prevent reallocation on every render.
