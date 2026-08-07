## 2024-08-07 - Optimize SortingBlock state restoration
**Learning:** React `useEffect` hooks often restore ordered component state from backend arrays using `.map().find()`, silently creating O(N^2) bottlenecks when arrays get large (like complex sorting activities).
**Action:** Always map backend state to a Map object for O(1) lookups before restoring state arrays in `useEffect`, converting O(N^2) operations into O(N).
