# Bolt's Performance Journal

This journal documents critical learnings specific to the EduSync LMS codebase that will help avoid mistakes or make better optimization decisions.

## Format
## YYYY-MM-DD - [Title]
**Learning:** [Insight]
**Action:** [How to apply next time]

## 2026-03-16 - useCallback Optimization
**Learning:** Adding useCallback to event handlers in React components prevents unnecessary re-renders. This is especially impactful in data-heavy pages like gradebooks.
**Action:** When optimizing React components, wrap event handlers with useCallback and ensure dependencies are correctly specified.

## 2024-05-18 - [Optimizing Derived Data in React]
**Learning:** `Gradebook.tsx` was recalculating student averages, student totals, class averages, lowest/highest grades on EVERY render due to lack of `useMemo` hooks. Combining array iterations (e.g. mapping across all students and their respective scores) and memoizing the output reduces O(N) operations and helps improve rendering performance noticeably in applications presenting tabular data.
**Action:** When working on pages rendering tables of calculated data (e.g. grades, scores, statistics), always ensure that derived statistics are calculated and memoized in a single pass before being fed to child elements or `.map` functions in the render cycle.
