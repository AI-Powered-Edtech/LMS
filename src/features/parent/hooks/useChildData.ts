// ==========================================================================
// useChildData — React Query hooks untuk Parent Dashboard
// Wave 4 — Task 29.3
// ==========================================================================

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE } from '@/utils/queryConstants'

import {
  calculateTrafficLight,
  getChildAchievements,
  getChildAttendance,
  getChildGrades,
  getChildPendingAssignments,
  getMyChildren,
} from '../api/parentApi'
import type { ChildDashboardData } from '../types'

// ── Query Keys ─────────────────────────────────────────────────

const base = createQueryKeys('parent')

export const parentKeys = {
  ...base,
  children: (tenantId: string) => [...base.all(tenantId), 'children'] as const,
  grades: (tenantId: string, studentId: string) =>
    [...base.all(tenantId), 'grades', studentId] as const,
  attendance: (tenantId: string, studentId: string, weekStart: string) =>
    [...base.all(tenantId), 'attendance', studentId, weekStart] as const,
  pendingAssignments: (tenantId: string, studentId: string) =>
    [...base.all(tenantId), 'pending', studentId] as const,
  achievements: (tenantId: string, studentId: string) =>
    [...base.all(tenantId), 'achievements', studentId] as const,
}

// ── Week Start Helper ──────────────────────────────────────────

/** Mengembalikan tanggal Senin minggu ini dalam format YYYY-MM-DD */
function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay() // 0=Minggu, 1=Senin, ...6=Sabtu
  // Geser ke Senin: jika Minggu (0), geser ke -6; jika Sabtu (6), geser ke -5
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

// ── Hooks ──────────────────────────────────────────────────────

/**
 * Daftar semua anak yang terhubung dengan orang tua yang sedang login.
 */
export function useChildren() {
  const { tenantId } = useAuth()

  return useQuery({
    queryKey: parentKeys.children(tenantId ?? ''),
    queryFn: () => getMyChildren(),
    enabled: !!tenantId,
    staleTime: STALE.MODERATE,
    refetchInterval: false,
  })
}

/**
 * Semua data dashboard untuk satu anak berdasarkan studentId.
 * Menggunakan Promise.all untuk fetch paralel agar efisien.
 */
export function useChildDashboard(studentId: string | null) {
  const { tenantId } = useAuth()
  const weekStart = useMemo(() => getWeekStart(), [])

  const gradesQuery = useQuery({
    queryKey: parentKeys.grades(tenantId ?? '', studentId ?? ''),
    queryFn: () => getChildGrades(studentId!),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.MODERATE,
    refetchInterval: false,
  })

  const attendanceQuery = useQuery({
    queryKey: parentKeys.attendance(tenantId ?? '', studentId ?? '', weekStart),
    queryFn: () => getChildAttendance(studentId!, weekStart),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.MODERATE,
    refetchInterval: false,
  })

  const pendingQuery = useQuery({
    queryKey: parentKeys.pendingAssignments(tenantId ?? '', studentId ?? ''),
    queryFn: () => getChildPendingAssignments(studentId!, tenantId!),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.MODERATE,
    refetchInterval: false,
  })

  const achievementsQuery = useQuery({
    queryKey: parentKeys.achievements(tenantId ?? '', studentId ?? ''),
    queryFn: () => getChildAchievements(studentId!),
    enabled: !!tenantId && !!studentId,
    staleTime: STALE.MODERATE,
    refetchInterval: false,
  })

  const isLoading =
    gradesQuery.isLoading ||
    attendanceQuery.isLoading ||
    pendingQuery.isLoading ||
    achievementsQuery.isLoading

  const error =
    gradesQuery.error || attendanceQuery.error || pendingQuery.error || achievementsQuery.error

  // Hitung traffic light setiap kali data berubah
  const trafficLight = useMemo(() => {
    if (isLoading) return null
    return calculateTrafficLight({
      pendingAssignments: pendingQuery.data ?? [],
      attendance: attendanceQuery.data ?? [],
      grades: gradesQuery.data ?? [],
    })
  }, [isLoading, pendingQuery.data, attendanceQuery.data, gradesQuery.data])

  return {
    grades: gradesQuery.data ?? [],
    attendance: attendanceQuery.data ?? [],
    pendingAssignments: pendingQuery.data ?? [],
    achievements: achievementsQuery.data ?? [],
    trafficLight,
    isLoading,
    error,
    refetchAll: () => {
      gradesQuery.refetch()
      attendanceQuery.refetch()
      pendingQuery.refetch()
      achievementsQuery.refetch()
    },
  }
}

/**
 * Combined hook yang menggabungkan children list + dashboard data untuk satu anak.
 * studentId bersifat opsional; default ke anak pertama.
 */
export function useParentDashboard(selectedStudentId: string | null) {
  const childrenQuery = useChildren()
  const childDashboard = useChildDashboard(selectedStudentId)

  // Cari info anak yang dipilih dari list
  const selectedChild =
    childrenQuery.data?.find((c) => c.student_id === selectedStudentId) ??
    childrenQuery.data?.[0] ??
    null

  const dashboardData: ChildDashboardData | null = useMemo(() => {
    if (!selectedChild || childDashboard.isLoading) return null
    if (!childDashboard.trafficLight) return null

    return {
      child: selectedChild,
      traffic_light: childDashboard.trafficLight.status,
      traffic_light_reason: childDashboard.trafficLight.reason,
      grades: childDashboard.grades,
      attendance_this_week: childDashboard.attendance,
      pending_assignments: childDashboard.pendingAssignments,
      recent_achievements: childDashboard.achievements,
    }
  }, [selectedChild, childDashboard])

  return {
    children: childrenQuery.data ?? [],
    childrenLoading: childrenQuery.isLoading,
    selectedChild,
    dashboardData,
    isLoading: childrenQuery.isLoading || childDashboard.isLoading,
    error: childrenQuery.error ?? childDashboard.error,
    refetchAll: childDashboard.refetchAll,
  }
}
