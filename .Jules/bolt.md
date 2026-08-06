## 2025-03-01 - Extract Invariant String Conversions from Loops
**Learning:** React client-side filtering often evaluates search string `.toLowerCase()` inside `.filter()` iterations, causing O(N) redundant string allocations and CPU overhead during renders. Additionally, using `.split("")` for string iterations allocates unnecessary arrays.
**Action:** Always extract invariant string conversions outside of filter loops, evaluating them once before iterating, and use `for` loops instead of `.split("")` for simple character iterations.
