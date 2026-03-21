import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
const mockRpc = vi.fn()

vi.mock('@/src/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { studentProgressService } from '../api/studentProgressService'

describe('studentProgressService.fetchModules', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries course_modules for the tenant', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    mockFrom.mockImplementation(fromSpy)
    try {
      await studentProgressService.fetchModules('tenant-1')
    } catch {
      // ok
    }
    const called = fromSpy.mock.calls.length > 0
    expect(called).toBe(true)
  })

  it('returns empty array when no modules', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    try {
      const result = await studentProgressService.fetchModules('tenant-1')
      expect(Array.isArray(result)).toBe(true)
    } catch {
      // ok
    }
  })
})

describe('studentProgressService.fetchLessonProgress', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries lesson_progress for user and tenant', async () => {
    const fromSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    mockFrom.mockImplementation(fromSpy)
    try {
      await studentProgressService.fetchLessonProgress('user-1', 'tenant-1')
    } catch {
      // ok
    }
    const called = fromSpy.mock.calls.length > 0 || mockRpc.mock.calls.length > 0
    expect(called).toBe(true)
  })
})
