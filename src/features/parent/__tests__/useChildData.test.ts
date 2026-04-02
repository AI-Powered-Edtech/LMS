import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({ tenantId: 'tenant-1' })),
}))

vi.mock('../api/parentApi', () => ({
  getMyChildren: vi.fn(),
  getChildGrades: vi.fn(),
  getChildAttendance: vi.fn(),
  getChildPendingAssignments: vi.fn(),
  getChildAchievements: vi.fn(),
  calculateTrafficLight: vi.fn(),
}))

import {
  calculateTrafficLight,
  getChildAchievements,
  getChildAttendance,
  getChildGrades,
  getChildPendingAssignments,
  getMyChildren,
} from '../api/parentApi'
import { useChildDashboard, useChildren, useParentDashboard } from '../hooks/useChildData'

const mockGetMyChildren = vi.mocked(getMyChildren)
const mockGetChildGrades = vi.mocked(getChildGrades)
const mockGetChildAttendance = vi.mocked(getChildAttendance)
const mockGetChildPendingAssignments = vi.mocked(getChildPendingAssignments)
const mockGetChildAchievements = vi.mocked(getChildAchievements)
const mockCalculateTrafficLight = vi.mocked(calculateTrafficLight)

// ── Test Utilities ──────────────────────────────────────────────────────────

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper() {
  const queryClient = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

const MOCK_CHILDREN = [
  {
    student_id: 's1',
    student_name: 'Andi Pratama',
    student_avatar: null,
    class_name: 'Kelas 7A',
    relationship: 'ayah' as const,
  },
  {
    student_id: 's2',
    student_name: 'Budi Santoso',
    student_avatar: null,
    class_name: 'Kelas 8B',
    relationship: 'ibu' as const,
  },
]

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useChildData hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMyChildren.mockResolvedValue(MOCK_CHILDREN)
    mockGetChildGrades.mockResolvedValue([
      { subject: 'Matematika', latest_score: 85, previous_score: 70, trend: 'up' },
    ])
    mockGetChildAttendance.mockResolvedValue([{ date: '2026-03-30', status: 'hadir' }])
    mockGetChildPendingAssignments.mockResolvedValue([])
    mockGetChildAchievements.mockResolvedValue(['Meraih badge "Rajin"'])
    mockCalculateTrafficLight.mockReturnValue({ status: 'green', reason: 'Semua baik' })
  })

  // ── useChildren ───────────────────────────────────────────────

  describe('useChildren', () => {
    it('mengembalikan daftar anak dari API', async () => {
      const { result } = renderHook(() => useChildren(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(result.current.data![0].student_name).toBe('Andi Pratama')
      expect(mockGetMyChildren).toHaveBeenCalledTimes(1)
    })

    it('memiliki loading state awal', () => {
      const { result } = renderHook(() => useChildren(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('menangani error dari API', async () => {
      mockGetMyChildren.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChildren(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toBeDefined()
    })
  })

  // ── useChildDashboard ─────────────────────────────────────────

  describe('useChildDashboard', () => {
    it('mengambil semua data dashboard untuk satu anak', async () => {
      const { result } = renderHook(() => useChildDashboard('s1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.grades).toHaveLength(1)
      expect(result.current.grades[0].subject).toBe('Matematika')
      expect(result.current.achievements).toHaveLength(1)
      expect(mockGetChildGrades).toHaveBeenCalledWith('s1')
    })

    it('tidak fetch jika studentId null', () => {
      const { result: _result } = renderHook(() => useChildDashboard(null), {
        wrapper: createWrapper(),
      })

      // Queries disabled, isLoading tetap true karena enabled=false
      expect(mockGetChildGrades).not.toHaveBeenCalled()
      expect(mockGetChildAttendance).not.toHaveBeenCalled()
    })

    it('menghitung traffic light dari data yang di-fetch', async () => {
      const { result } = renderHook(() => useChildDashboard('s1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.trafficLight).toEqual({ status: 'green', reason: 'Semua baik' })
      expect(mockCalculateTrafficLight).toHaveBeenCalled()
    })

    it('menangani error state', async () => {
      mockGetChildGrades.mockRejectedValue(new Error('DB error'))

      const { result } = renderHook(() => useChildDashboard('s1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.error).toBeDefined())
    })
  })

  // ── useParentDashboard ────────────────────────────────────────

  describe('useParentDashboard', () => {
    it('menggabungkan children list dan dashboard data', async () => {
      const { result } = renderHook(() => useParentDashboard('s1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.children).toHaveLength(2)
      expect(result.current.selectedChild?.student_id).toBe('s1')
    })

    it('auto-select anak pertama jika selectedStudentId null', async () => {
      const { result } = renderHook(() => useParentDashboard(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.childrenLoading).toBe(false))

      // selectedChild falls back to first child
      expect(result.current.selectedChild?.student_id).toBe('s1')
    })

    it('mengembalikan dashboardData null saat loading', () => {
      const { result } = renderHook(() => useParentDashboard('s1'), {
        wrapper: createWrapper(),
      })

      // Pada render pertama, masih loading
      expect(result.current.dashboardData).toBeNull()
    })

    it('menyediakan refetchAll function', async () => {
      const { result } = renderHook(() => useParentDashboard('s1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(typeof result.current.refetchAll).toBe('function')
    })

    it('menangani error dari children query', async () => {
      mockGetMyChildren.mockRejectedValue(new Error('Children fetch failed'))

      const { result } = renderHook(() => useParentDashboard(null), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.error).toBeDefined())
    })
  })
})
