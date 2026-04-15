import { useQuery } from '@tanstack/react-query'

import { assignmentService } from '../api/assignmentService'

export const assignmentKeys = {
  all: (tenantId: string) => ['assignments', tenantId] as const,
  detail: (tenantId: string, id: string) => ['assignments', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['assignments', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Tugas.
 */
function useAssignmentList(tenantId: string) {
  return useQuery({
    queryKey: assignmentKeys.all(tenantId),
    queryFn: () => assignmentService.getAssignments(tenantId),
    enabled: !!tenantId,
  })
}
