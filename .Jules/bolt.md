## 2024-05-24 - O(N*M) Rendering Loops
**Learning:** In React render loops over arrays (like blocks.map), using .find() on another related array (like quizzes or assignments) creates O(N*M) complexity. This can cause significant rendering bottlenecks on large lessons.
**Action:** Always pre-calculate a Map with O(1) lookups using useMemo before iterating, especially when matching by ID.
