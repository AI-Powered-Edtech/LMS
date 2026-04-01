import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { captureError } from '@/utils/sentry'

import {
  GradebookAssignment,
  GradebookData,
  gradebookService,
  GradeEntry,
  GradeStatus,
} from '../api/legacyGradebookService'

export type Assignment = GradebookAssignment

const gradebookKeys = createQueryKeys('gradebook')

function useGradebookQuery() {
  const { user, tenantId } = useAuth()

  return useQuery<GradebookData>({
    queryKey: gradebookKeys.all(tenantId!),
    queryFn: () => gradebookService.fetchGradebook(tenantId!),
    enabled: !!user && !!tenantId,
  })
}

function useUpdateGrade() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const addToast = useToast((s) => s.addToast)

  return useMutation({
    mutationFn: async ({
      studentId,
      assignmentId,
      score,
      status: _status = 'graded',
      feedback,
    }: {
      studentId: string
      assignmentId: string
      score: number | null
      status?: GradeStatus
      feedback?: string
    }) => {
      if (score !== null && tenantId) {
        await gradebookService.submitGrade(assignmentId, studentId, score, feedback, tenantId)
      }
    },
    onMutate: async ({ studentId, assignmentId, score, status = 'graded', feedback }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: gradebookKeys.all(tenantId!) })
      // Snapshot current data for rollback
      const previous = queryClient.getQueryData<GradebookData>(gradebookKeys.all(tenantId!))

      // Optimistically update the cache immediately
      queryClient.setQueryData<GradebookData>(gradebookKeys.all(tenantId!), (old) => {
        if (!old) return old
        const newGrades = { ...old.grades }
        if (!newGrades[studentId]) newGrades[studentId] = {}
        newGrades[studentId] = {
          ...newGrades[studentId],
          [assignmentId]: { score, status: status ?? 'graded', feedback },
        }
        return { ...old, grades: newGrades }
      })

      return { previous }
    },
    onError: (err, _vars, context) => {
      captureError(err, { context: 'useUpdateGrade' })
      // Roll back to the snapshot on error
      if (context?.previous !== undefined) {
        queryClient.setQueryData(gradebookKeys.all(tenantId!), context.previous)
      }
      // Notify teacher that the save failed and the change was reverted
      addToast({ type: 'error', message: 'Gagal menyimpan. Perubahan dikembalikan.' })
    },
    onSettled: () => {
      // Always sync with server after mutation completes (success or error)
      queryClient.invalidateQueries({ queryKey: gradebookKeys.all(tenantId!) })
    },
  })
}

/**
 * Drop-in replacement for the old GradebookContext useGradebook() hook.
 */
export function useGradebook() {
  const { tenantId } = useAuth()
  const queryClient = useQueryClient()
  const { data, isLoading } = useGradebookQuery()
  const updateGradeMutation = useUpdateGrade()

  const students = data?.students ?? []
  const assignments = data?.assignments ?? []
  const grades = data?.grades ?? {}

  const updateGrade = (
    studentId: string,
    assignmentId: string,
    score: number | null,
    status: GradeStatus = 'graded',
    feedback?: string
  ) => {
    updateGradeMutation.mutate({ studentId, assignmentId, score, status, feedback })
  }

  const getStudentGrade = (studentId: string, assignmentId: string): GradeEntry | null => {
    return grades[studentId]?.[assignmentId] ?? null
  }

  const addAssignment = (assignment: Assignment) => {
    queryClient.setQueryData<GradebookData>(gradebookKeys.all(tenantId!), (old) => {
      if (!old) return { assignments: [assignment], students: [], grades: {} }
      return { ...old, assignments: [...old.assignments, assignment] }
    })
  }

  const refreshGradebook = async () => {
    await queryClient.invalidateQueries({ queryKey: gradebookKeys.all(tenantId!) })
  }

  return {
    students,
    assignments,
    grades,
    loading: isLoading,
    updateGrade,
    getStudentGrade,
    addAssignment,
    refreshGradebook,
  }
}
