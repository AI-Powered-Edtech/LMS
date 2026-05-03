1. **Optimize `filteredCourses` in `src/pages/Courses.tsx`**
   - Identify that `debouncedSearch.toLowerCase()` is redundantly evaluated on every iteration inside `.filter()`.
   - Wrap `filteredCourses` calculation in `useMemo`.
   - Extract `debouncedSearch.toLowerCase()` outside of `.filter()` to a local variable `query`.
2. **Optimize `filteredQuizzes` in `src/pages/AdminQuizOverview.tsx`**
   - Identify that `debouncedSearch.toLowerCase()` is redundantly evaluated on every iteration inside `.filter()`.
   - Extract `debouncedSearch.toLowerCase()` outside of `.filter()` to a local variable `query`.
3. **Verify**
   - Run `pnpm lint` and `pnpm test`.
4. **Pre-commit**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
5. **Submit**
   - Submit PR with title "⚡ Bolt: Hoist static string conversion outside filter loops" and proper description format.
