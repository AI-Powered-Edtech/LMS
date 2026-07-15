## 2025-07-15 - Optimize subset counting to prevent O(N) array allocations
**Learning:** `Array.prototype.filter().length` creates O(N) intermediate array allocations which is inefficient when only the count is needed, especially during frequent re-renders or on large datasets.
**Action:** Consolidate multiple `filter().length` calculations on the same array into a single `for` loop with simple counter variables to minimize CPU overhead and memory use.
