# Bolt's Performance Journal

This journal documents critical learnings specific to the EduSync LMS codebase that will help avoid mistakes or make better optimization decisions.

## Format
## YYYY-MM-DD - [Title]
**Learning:** [Insight]
**Action:** [How to apply next time]

## 2026-03-16 - useCallback Optimization
**Learning:** Adding useCallback to event handlers in React components prevents unnecessary re-renders. This is especially impactful in data-heavy pages like gradebooks.
**Action:** When optimizing React components, wrap event handlers with useCallback and ensure dependencies are correctly specified.
## 2025-05-18 - Avoid O(N*M) in render loops
**Learning:** Found nested loops inside `map` render functions in `Quiz.tsx`, where `quizAttempts.find` and `quizAttempts.filter` were called repeatedly resulting in O(N*M) time complexity.
**Action:** When working with nested relationships like a quiz with multiple attempts, use `useMemo` to precompute relationship groupings into a dictionary hash map first (O(M)), allowing O(1) lookups during the render map step, which improves rendering performance and solves the O(N*M) issue.
