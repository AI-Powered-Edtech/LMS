/**
 * Gradebook Query Keys
 *
 * Centralized query keys for Gradebook feature.
 * Used for React Query cache management and invalidation.
 */

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const gradebookKeys = {
  // All gradebook queries
  all: ['gradebook'] as const,

  // Entries (grades)
  entries: (courseId: string) => ['gradebook', 'entries', courseId] as const,

  // Settings
  settings: (courseId: string) => ['gradebook', 'settings', courseId] as const,

  // Columns
  columns: (courseId: string) => ['gradebook', 'columns', courseId] as const,

  // Student-specific grades
  studentGrades: (courseId: string, studentId: string) =>
    ['gradebook', 'student', courseId, studentId] as const,

  // Analytics
  analytics: (courseId: string) => ['gradebook', 'analytics', courseId] as const,
} as const

export default gradebookKeys
