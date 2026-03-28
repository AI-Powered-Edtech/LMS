// API/Services
export { assignmentService } from './api/assignmentService'
export { groupAssignmentService } from './api/groupAssignmentService'

// Hooks
export { useAssignments } from './hooks/useAssignments'
export {
  useCreateGroups,
  useGradeGroupSubmission,
  useStudentGroup,
  useSubmitGroupAssignment,
  useTeacherGroups,
} from './hooks/useGroupAssignments'

// Types
export type { Assignment, AssignmentSubmission } from './api/assignmentService'
export type {
  CreateGroupInput,
  GroupMember,
  GroupSubmission,
  StudentGroupData,
  TeacherGroupEntry,
} from './api/groupAssignmentService'
export type { AssignmentUiState, Attachment, Comment, StudentSubmission } from './types'
