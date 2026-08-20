## 2026-08-20 - Memoizing Array Filtering in React Renders
**Learning:** Performing O(N) array operations, such as filtering a list of feature flags on every render, can cause performance degradation, especially when dealing with frequent updates like typing in input fields.
**Action:** Always wrap expensive or O(N) derived calculations in `useMemo` to ensure they are only re-evaluated when their dependencies change, rather than on every render cycle.
