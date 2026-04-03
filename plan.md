1. **Optimize `aggregateTenantOverview` in `src/features/analytics/api/analyticsAggregation.ts`**
   - Replace 6 separate `reduce` and `filter` passes over the `stats` array with a single `for` loop to compute all aggregated values (`totalEnrolled`, `activeStudents`, `coursesRunning`, `avgProgress`, `avgQuizScore`, and `lastRefreshedAt`).
   - This prevents redundant O(N) iterations, turning O(6N) into O(N).
2. **Run tests to verify correctness**
   - Execute tests using `pnpm run test run` to ensure no functionality is broken by the refactor.
   - Execute linter using `pnpm lint` to ensure code quality.
3. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
4. **Submit Pull Request**
   - Submit the PR following the required 'Bolt' performance format.
