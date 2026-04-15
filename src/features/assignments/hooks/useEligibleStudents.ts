import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'

import { EligibleStudent, groupAssignmentService } from '../api/groupAssignmentService'
import { groupAssignmentKeys } from './useGroupAssignments'

export function useEligibleStudents(assignmentId: string, enabled = false) {
  const { tenantId } = useAuth()

  return useQuery<EligibleStudent[]>({
    queryKey: [...groupAssignmentKeys.teacherGroups(assignmentId), 'eligible'],
    queryFn: () => groupAssignmentService.getEligibleStudents(assignmentId, tenantId!),
    enabled: !!assignmentId && !!tenantId && enabled,
    staleTime: 30_000,
  })
}
