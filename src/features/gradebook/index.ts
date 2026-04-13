/**
 * Gradebook Feature Module
 *
 * Consolidated exports for the Gradebook feature.
 */

// Components
export { GradebookExportActions } from './components/GradebookExportActions'
export { GradebookMainTable } from './components/GradebookMainTable'
export { GradebookTable } from './components/GradebookTable'
export { GradebookStats } from './components/GradebookStats'
export { GradebookSkeleton } from './components/GradebookSkeleton'
export { StudentGradeView } from './components/StudentGradeView'

// Hooks
export { useExportReport } from './hooks/useExportReport'
export { useGradebook } from './hooks/useGradebookQueries'
export { useGradebookQuery, useUpdateGrade } from './hooks/useGradebookQueries'
export { useGradebookState, useGradebookDispatch } from './hooks/useGradebookState'

// Queries
export {
  useGradebookEntries,
  useGradebookSettings,
  useUpdateGradebookEntry,
  useSyncGradebook,
  useUpsertGradebookSettings,
} from './queries/useGradebook'

// Types
export type {
  GradebookEntry,
  GradebookSettings,
  GradebookStudent,
  GradebookAssignment,
} from './types'
