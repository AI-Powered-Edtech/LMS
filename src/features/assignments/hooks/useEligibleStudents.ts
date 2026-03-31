import { useQuery } from '@tanstack/react-query'

import { EligibleStudent, groupAssignmentService } from '../api/groupAssignmentService'
import { groupAssignmentKeys } from './useGroupAssignments'

export function useEligibleStudents(assignmentId: string, enabled = false) {
  return useQuery<EligibleStudent[]>({
    queryKey: [...groupAssignmentKeys.teacherGroups(assignmentId), 'eligible'],
    queryFn: () => groupAssignmentService.getEligibleStudents(assignmentId),
    enabled: !!assignmentId && enabled,
    staleTime: 30_000,
  })
}
