## 2026-08-25 - Optimize chained array methods

**Learning:** Chaining `.map().filter().reduce()` in React hooks (like `useMemo`) for data processing creates multiple intermediate arrays and requires multiple passes over the data. In a gradebook context where we iterate over many students and assignments, this can cause unnecessary memory pressure and garbage collection overhead.
**Action:** Consolidate chained array methods into a single `for...of` loop or single `reduce` pass to minimize allocations and improve execution speed, especially in critical paths like computing aggregated statistics.
