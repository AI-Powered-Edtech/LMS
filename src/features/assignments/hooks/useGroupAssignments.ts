import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/src/contexts/AuthContext'

import {
  CreateGroupInput,
  groupAssignmentService,
  StudentGroupData,
  TeacherGroupEntry,
} from '../api/groupAssignmentService'

// ============================================================
// Query keys
// ============================================================

export const groupAssignmentKeys = {
  studentGroup: (assignmentId: string, userId: string) =>
    ['group-assignment', 'student', assignmentId, userId] as const,
  teacherGroups: (assignmentId: string) =>
    ['group-assignment', 'teacher', assignmentId] as const,
}

// ============================================================
// Student hook
// ============================================================

/**
 * Returns the group the current student belongs to for a given assignment,
 * along with members and their latest submission.
 */
export function useStudentGroup(assignmentId: string) {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  return useQuery<StudentGroupData | null>({
    queryKey: groupAssignmentKeys.studentGroup(assignmentId, userId),
    queryFn: () => groupAssignmentService.getStudentGroup(userId, assignmentId),
    enabled: !!assignmentId && !!userId,
    staleTime: 30_000,
  })
}

// ============================================================
// Teacher hooks
// ============================================================

/**
 * Returns all groups for an assignment including member details
 * and submission status — for the teacher overview.
 */
export function useTeacherGroups(assignmentId: string) {
  return useQuery<TeacherGroupEntry[]>({
    queryKey: groupAssignmentKeys.teacherGroups(assignmentId),
    queryFn: () => groupAssignmentService.getTeacherGroups(assignmentId),
    enabled: !!assignmentId,
    staleTime: 30_000,
  })
}

/**
 * Mutation to create groups for an assignment.
 * Invalidates the teacher groups query on success.
 */
export function useCreateGroups(assignmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, CreateGroupInput[]>({
    mutationFn: (groups) =>
      groupAssignmentService.createGroups(assignmentId, groups),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groupAssignmentKeys.teacherGroups(assignmentId),
      })
    },
  })
}

/**
 * Mutation for a student to submit the group assignment.
 * Invalidates the student group query on success.
 */
export function useSubmitGroupAssignment(assignmentId: string) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? ''

  return useMutation<
    string,
    Error,
    { groupId: string; content?: string; fileUrl?: string }
  >({
    mutationFn: (params) =>
      groupAssignmentService.submitGroupAssignment({
        ...params,
        assignmentId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groupAssignmentKeys.studentGroup(assignmentId, userId),
      })
    },
  })
}

/**
 * Mutation for a teacher to grade a group submission.
 * Invalidates the teacher groups query on success.
 */
export function useGradeGroupSubmission(assignmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<
    void,
    Error,
    { submissionId: string; grade: number; feedback?: string }
  >({
    mutationFn: (params) => groupAssignmentService.gradeGroupSubmission(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groupAssignmentKeys.teacherGroups(assignmentId),
      })
    },
  })
}
