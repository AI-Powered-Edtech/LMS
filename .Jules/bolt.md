## 2026-08-15 - Optimize SortingBlock Restore
**Learning:** Restoring order arrays against original lists using nested array lookups (.map + .find) creates an O(N^2) bottleneck, which is particularly slow for longer arrays in interactive blocks.
**Action:** Use a pre-computed hash map lookup to bring the time complexity down to O(N).
