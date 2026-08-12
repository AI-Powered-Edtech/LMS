## 2024-08-12 - Prevent multiple O(N) filtering loops on render
**Learning:** Found multiple distinct O(N) `.filter()` operations on the same data set (`attempts`) being computed on every render, instead of using a single iteration pass or memoization.
**Action:** Use a single `useMemo` iteration loop to compute multiple aggregates to reduce O(N) overhead, and ensure derived filtering state is memoized with `useMemo`.
