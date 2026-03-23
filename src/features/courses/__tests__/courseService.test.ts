import { beforeEach, describe, expect, it, vi } from 'vitest'

import { courseService } from '../api/courseService'

// Mock supabase
const {
  mockRange,
  mockLimit,
  mockIlike,
  mockIn,
  mockOrder,
  mockEq,
  mockSingle,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockFrom,
} = vi.hoisted(() => ({
  mockRange: vi.fn().mockReturnThis(),
  mockLimit: vi.fn().mockReturnThis(),
  mockIlike: vi.fn().mockReturnThis(),
  mockIn: vi.fn().mockReturnThis(),
  mockOrder: vi.fn().mockReturnThis(),
  mockEq: vi.fn().mockReturnThis(),
  mockSingle: vi.fn(),
  mockSelect: vi.fn().mockReturnThis(),
  mockInsert: vi.fn().mockReturnThis(),
  mockUpdate: vi.fn().mockReturnThis(),
  mockDelete: vi.fn().mockReturnThis(),
  mockFrom: vi.fn(),
}))

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      mockFrom(table)
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        eq: mockEq,
        ilike: mockIlike,
        order: mockOrder,
        range: mockRange,
        limit: mockLimit,
        in: mockIn,
        single: mockSingle,
      }
    },
  },
}))

describe('courseService.fetchCourses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: eq returns itself, range returns data
    mockEq.mockReturnThis()
    mockLimit.mockReturnThis()
    mockOrder.mockReturnThis()
    mockRange.mockResolvedValue({ data: [], count: 0, error: null })
    mockSelect.mockReturnThis()
  })

  it('queries the courses table', async () => {
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 })
    expect(mockFrom).toHaveBeenCalledWith('courses')
  })

  it('applies tenant_id filter', async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null })
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 })
    expect(mockEq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
  })

  it('returns empty courses and count 0 on empty result', async () => {
    mockRange.mockResolvedValue({ data: [], count: 0, error: null })
    const result = await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 })
    expect(result.courses).toEqual([])
    expect(result.count).toBe(0)
  })

  it('returns courses when data is present', async () => {
    const courses = [{ id: 'c1', title: 'Math', tenant_id: 'tenant-1' }]
    mockRange.mockResolvedValue({ data: courses, count: 1, error: null })
    const result = await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 })
    expect(result.courses).toEqual(courses)
    expect(result.count).toBe(1)
  })

  it('applies search filter when provided', async () => {
    mockIlike.mockReturnThis()
    mockRange.mockResolvedValue({ data: [], count: 0, error: null })
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10, search: 'math' })
    expect(mockIlike).toHaveBeenCalledWith('title', '%math%')
  })
})
