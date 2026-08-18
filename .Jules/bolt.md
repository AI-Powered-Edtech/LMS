## 2026-08-18 - Interactive Scoring Optimization
**Learning:** Found an O(N^2) array lookup pattern in interactive block scoring functions (like `scoreSorting`) where we iterate over one array and search in another using `.find`.
**Action:** Replace these O(N^2) `.find()` lookups with an O(N) hash map lookup using `Map` to improve scoring efficiency when dealing with potentially large datasets in interactive blocks.
