## 2026-08-21 - Memoize filtered computed arrays to prevent re-filtering
**Learning:** In React, expensive array manipulations (like `.filter()`) returning new references on every render can cause unnecessary child re-renders or sluggishness, especially when unrelated state (like `expandedRow` UI state) changes.
**Action:** Always wrap derived, filtered arrays in `useMemo` and their helper functions in `useCallback` when dealing with potentially unbounded lists like `filteredStudents`.
