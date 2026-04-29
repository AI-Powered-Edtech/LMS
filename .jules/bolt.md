## 2024-05-18 - React Query List Rendering Re-renders
**Learning:** Arrays derived from React Query using `data?.pages.flatMap(...)` or similar inside a component will cause re-renders down the tree because a new array reference is created on every render.
**Action:** When deriving arrays from React Query data inside a React component, ALWAYS wrap it in `useMemo`, like `const data = useMemo(() => queryData?.pages.flatMap(...) ?? [], [queryData?.pages])`.
