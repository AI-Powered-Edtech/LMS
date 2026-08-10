## 2024-05-18 - Optimize Array Search within Loop
**Learning:** Using `.find()` inside a `.map()` creates an O(N^2) operation, which can be slow for larger arrays.
**Action:** Convert the source array into a Map/Record first `new Map(items.map(i => [i.id, i]))`, then use O(1) `.get()` lookups inside the loop to achieve O(N) performance.
