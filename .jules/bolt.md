## 2026-09-13 - Optimize ReactMarkdown renders
**Learning:** Passing inline arrays and objects to expensive components like `ReactMarkdown` causes unnecessary re-renders in every parent render, even if the content doesn't change.
**Action:** Always extract static plugin arrays and component maps outside the component body or use `useMemo`, and wrap expensive static content blocks in `React.memo`.
