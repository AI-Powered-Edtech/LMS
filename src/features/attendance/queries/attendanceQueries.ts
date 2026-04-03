import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { GC, STALE } from '@/utils/queryConstants'
import { captureError } from '@/utils/sentry'

import { attendanceService } from '../api/attendanceService'
import type { UpsertAttendanceParams } from '../types'

const attendanceKeys = createQueryKeys('attendance')

// ── Teacher classes ────────────────────────────────────────────
export function useTeacherClasses() {
  const { user, tenantId } = useAuth()
  return useQuery({
    queryKey: [...attendanceKeys.all(tenantId!), 'teacher-classes', user?.id],
    queryFn: () => attendanceService.fetchTeacherClasses(tenantId!, user!.id),
    enabled: !!tenantId && !!user,
    staleTime: STALE.MODERATE,
    gcTime: GC.NORMAL,
  })
}

// ── Class students ─────────────────────────────────────────────
export function useClassStudents(classId: string | null) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: [...attendanceKeys.all(tenantId!), 'class-students', classId],
    // FIXED: Pass tenantId for tenant scoping in enrollment query
    queryFn: () => attendanceService.fetchClassStudents(classId!, tenantId!),
    enabled: !!tenantId && !!classId,
    staleTime: STALE.MODERATE,
    gcTime: GC.NORMAL,
  })
}

// ── Attendance records for a class ─────────────────────────────
export function useAttendanceRecords(classId: string | null) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: attendanceKeys.list(tenantId!, { classId }),
    queryFn: () => attendanceService.fetchAttendanceRecords(tenantId!, classId!),
    enabled: !!tenantId && !!classId,
    staleTime: STALE.DYNAMIC,
  })
}

// ── Today's record for a class ─────────────────────────────────
export function useTodayAttendance(classId: string | null) {
  const { tenantId } = useAuth()
  return useQuery({
    queryKey: [...attendanceKeys.all(tenantId!), 'today', classId],
    queryFn: () => attendanceService.fetchTodayRecord(tenantId!, classId!),
    enabled: !!tenantId && !!classId,
    staleTime: STALE.DYNAMIC,
  })
}

// ── Save attendance mutation ───────────────────────────────────
export function useSaveAttendance() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: (params: UpsertAttendanceParams) => attendanceService.upsertAttendance(params),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all(tenantId) })
      }
    },
    onError: (err) => captureError(err, { context: 'useSaveAttendance' }),
  })
}

// ── Delete attendance mutation ─────────────────────────────────
export function useDeleteAttendance() {
  const queryClient = useQueryClient()
  const { tenantId } = useAuth()

  return useMutation({
    mutationFn: (id: string) => attendanceService.deleteAttendance(id, tenantId!),
    onSuccess: () => {
      if (tenantId) {
        queryClient.invalidateQueries({ queryKey: attendanceKeys.all(tenantId) })
      }
    },
    onError: (err) => captureError(err, { context: 'useDeleteAttendance' }),
  })
}
