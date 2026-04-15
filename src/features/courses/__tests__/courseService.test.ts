import { beforeEach, describe, expect, it, vi } from 'vitest'

import { courseService } from '../api/courseService'

// Mock db
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

vi.mock('@/services/db', () => ({
  db: {
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
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ courses: [], count: 0 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    )
  })

  it('memanggil endpoint /api/v1/courses', async () => {
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    const [url] = vi.mocked(fetch).mock.calls[0] as [string]
    expect(url).toContain('/api/v1/courses')
  })

  it('returns empty courses and count 0 on empty result', async () => {
    const result = await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 })
    expect(result.courses).toEqual([])
    expect(result.count).toBe(0)
  })

  it('returns courses when data is present', async () => {
    const courses = [{ id: 'c1', title: 'Math', tenant_id: 'tenant-1' }]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ courses, count: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    )
    const result = await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10 })
    expect(result.courses).toEqual(courses)
    expect(result.count).toBe(1)
  })

  it('applies search filter when provided', async () => {
    await courseService.fetchCourses({ tenantId: 'tenant-1', page: 1, limit: 10, search: 'math' })
    const [url] = vi.mocked(fetch).mock.calls[0] as [string]
    expect(url).toContain('search=math')
  })
})
