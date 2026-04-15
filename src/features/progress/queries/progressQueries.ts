import { useQuery } from '@tanstack/react-query'

import { progressService } from '../api/progressService'

export const progressKeys = {
  all: (studentId: string) => ['progress', studentId] as const,
  detail: (studentId: string, id: string) => ['progress', studentId, id] as const,
  list: (studentId: string, filters?: Record<string, unknown>) =>
    ['progress', 'list', studentId, filters] as const,
}

/**
 * Query hook untuk daftar Kemajuan.
 */
function useProgressList(studentId: string) {
  return useQuery({
    queryKey: progressKeys.all(studentId),
    queryFn: () => progressService.getStudentProgress(studentId),
    enabled: !!studentId,
  })
}
