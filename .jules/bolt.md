# Bolt's Performance Journal

This journal documents critical learnings specific to the EduSync LMS codebase that will help avoid mistakes or make better optimization decisions.

## Format
## YYYY-MM-DD - [Title]
**Learning:** [Insight]
**Action:** [How to apply next time]

## 2026-03-16 - useCallback Optimization
**Learning:** Adding useCallback to event handlers in React components prevents unnecessary re-renders. This is especially impactful in data-heavy pages like gradebooks.
**Action:** When optimizing React components, wrap event handlers with useCallback and ensure dependencies are correctly specified.

## 2026-03-16 - useMemo invalidation trap
**Learning:** In React, if a derived state used as a `useMemo` dependency (like an array filter) is created on every render, it defeats the purpose of the `useMemo` because its reference changes every time.
**Action:** Memoize intermediate derivations that return new references (like `.filter` or `.map`) if they are used as dependencies in other `useMemo` or `useEffect` hooks.
