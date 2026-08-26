## 2026-08-26 - Memoizing Expensive Filter Operations
**Learning:** Found O(N) array filtering calculations being performed on every render within `AttemptDetailModal.tsx`. Since rendering can happen frequently (e.g. typing in grading inputs triggers state updates), this caused redundant iterations over potentially large lists of answers.
**Action:** Always wrap `.filter()` operations used for derived state (like counts) in `useMemo` hooks, specifying the base array as the dependency, to ensure the calculation only happens when the array actually changes.
