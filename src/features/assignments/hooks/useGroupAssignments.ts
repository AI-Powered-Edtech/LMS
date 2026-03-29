import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/src/contexts/AuthContext'

import {
  CreateGroupInput,
  CreateGroupTaskInput,
  groupAssignmentService,
  GroupMessage,
  GroupTask,
  StudentGroupData,
  TeacherGroupEntry,
} from '../api/groupAssignmentService'

// ============================================================
// Query keys
// ============================================================

export const groupAssignmentKeys = {
  studentGroup: (assignmentId: string, userId: string) =>
    ['group-assignment', 'student', assignmentId, userId] as const,
  teacherGroups: (assignmentId: string) => ['group-assignment', 'teacher', assignmentId] as const,
  groupTasks: (groupId: string) => ['group-assignment', 'tasks', groupId] as const,
  groupMessages: (groupId: string) => ['group-assignment', 'messages', groupId] as const,
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
    mutationFn: (groups) => groupAssignmentService.createGroups(assignmentId, groups),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groupAssignmentKeys.teacherGroups(assignmentId),
      })
    },
  })
}

// ============================================================
// Tasks & Chat hooks
// ============================================================

export function useGroupTasks(groupId: string | undefined) {
  const { tenantId } = useAuth()

  return useQuery<GroupTask[]>({
    queryKey: groupAssignmentKeys.groupTasks(groupId!),
    queryFn: () => groupAssignmentService.getGroupTasks(groupId!, tenantId!),
    enabled: !!groupId && !!tenantId,
  })
}

export function useCreateGroupTask(groupId: string) {
  const { user, tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<GroupTask, Error, CreateGroupTaskInput>({
    mutationFn: (data) =>
      groupAssignmentService.createGroupTask(groupId, data, user?.id ?? '', tenantId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groupAssignmentKeys.groupTasks(groupId),
      })
    },
  })
}

export function useUpdateGroupTaskStatus(groupId: string) {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<void, Error, { taskId: string; status: 'todo' | 'in_progress' | 'done' }>({
    mutationFn: ({ taskId, status }) =>
      groupAssignmentService.updateGroupTaskStatus(taskId, status, tenantId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groupAssignmentKeys.groupTasks(groupId),
      })
    },
  })
}

export function useGroupMessages(groupId: string | undefined) {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<GroupMessage[]>({
    queryKey: groupAssignmentKeys.groupMessages(groupId!),
    queryFn: () => groupAssignmentService.getGroupMessages(groupId!, tenantId!),
    enabled: !!groupId && !!tenantId,
  })

  useEffect(() => {
    if (!groupId) return

    const subscription = groupAssignmentService.subscribeToGroupMessages(groupId, (newMessage) => {
      queryClient.setQueryData<GroupMessage[]>(
        groupAssignmentKeys.groupMessages(groupId),
        (old) => {
          if (!old) return [newMessage]
          // Invalidate to fetch relationships (profiles) properly
          void queryClient.invalidateQueries({
            queryKey: groupAssignmentKeys.groupMessages(groupId),
          })
          return old
        }
      )
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [groupId, queryClient])

  return query
}

export function useSendGroupMessage(groupId: string) {
  const { user, tenantId } = useAuth()

  return useMutation<GroupMessage, Error, string>({
    mutationFn: (content) =>
      groupAssignmentService.sendGroupMessage(groupId, content, user?.id ?? '', tenantId!),
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

  return useMutation<string, Error, { groupId: string; content?: string; fileUrl?: string }>({
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

  return useMutation<void, Error, { submissionId: string; grade: number; feedback?: string }>({
    mutationFn: (params) => groupAssignmentService.gradeGroupSubmission(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: groupAssignmentKeys.teacherGroups(assignmentId),
      })
    },
  })
}
