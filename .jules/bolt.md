## 2026-08-23 - Prevent O(N^2) complexity in array merges
**Learning:** Performing an `O(N)` `.find()` lookup inside a `.map()` loop creates `O(N^2)` complexity. This can cause severe performance bottlenecks when merging lists of data.
**Action:** Always build a `Map` (or `Set`) outside the loop first to enable `O(1)` lookups, reducing the overall time complexity from `O(N^2)` to `O(N)`.
