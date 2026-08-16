## 2026-08-16 - Memoize derived array filtering in React components
**Learning:** React re-renders can easily become a bottleneck when rendering lists of data if the filtering array operations (e.g. `Array.prototype.filter`) are done inline without memoization, running on every render instead of only when data/filters change.
**Action:** Always wrap array transformations that derive state from props/fetch data with `useMemo` to ensure they only run when their dependencies change.
