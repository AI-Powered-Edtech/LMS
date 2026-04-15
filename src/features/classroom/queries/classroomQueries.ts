import { useQuery } from '@tanstack/react-query'

import { classroomService } from '../api/classroomService'
type UserRole = 'teacher' | 'student' | 'admin'

export const classroomKeys = {
  all: (tenantId: string) => ['classroom', tenantId] as const,
  detail: (tenantId: string, id: string) => ['classroom', tenantId, id] as const,
  list: (tenantId: string, filters?: Record<string, unknown>) =>
    ['classroom', 'list', tenantId, filters] as const,
}

/**
 * Query hook untuk daftar Kelas.
 */
function useClassroomList(userId: string, role: string, tenantId: string) {
  return useQuery({
    queryKey: classroomKeys.all(tenantId),
    queryFn: () => classroomService.fetchClassrooms(userId, role as UserRole, tenantId),
    enabled: !!userId && !!role && !!tenantId,
  })
}
