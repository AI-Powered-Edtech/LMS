// API/Services
export { assignmentService } from './api/assignmentService'

// Hooks
export { useAssignments } from './hooks/useAssignments'

// Types
export type { Assignment, AssignmentSubmission } from './api/assignmentService'
export type { AssignmentUiState, Attachment, Comment, StudentSubmission } from './types'

// Legacy gradebook re-exports (moved to @/src/features/gradebook/)
// Consumers should import directly from gradebook module instead.
export type {
  GradebookAssignment,
  GradebookData,
  GradeData,
  GradeEntry,
  GradeStatus,
  GradebookStudent as LegacyGradebookStudent,
} from '@/src/features/gradebook/api/legacyGradebookService'
export { gradebookService } from '@/src/features/gradebook/api/legacyGradebookService'
export { useGradebook } from '@/src/features/gradebook/hooks/useGradebookQueries'
