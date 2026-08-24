## 2024-05-24 - Memoize frequently rendered UI components
**Learning:** Found that some highly reused UI components like Avatar are missing `React.memo`, leading to unnecessary re-renders across the app. Avatar is often rendered in lists, making it a good candidate for memoization.
**Action:** When working on UI components that are purely presentational and used frequently, explicitly wrap them in `React.memo` to prevent re-renders when their static props don't change.
