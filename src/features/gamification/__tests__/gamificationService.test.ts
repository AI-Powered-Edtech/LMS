import { api } from "@/src/lib/api"
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { gamificationService } from '../api/gamificationService'

// API mock builder
function _makeQueryMock(resolveValue: { data: unknown; error: unknown }) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolveValue),
    then: undefined as unknown,
  }
  // Allow direct resolution from the chain
  Object.defineProperty(mock, 'then', {
    get: () => Promise.resolve(resolveValue).then.bind(Promise.resolve(resolveValue)),
  })
  return mock
}

const mockFrom = vi.fn()
vi.mock('@/src/services/api/client', () => ({
  api: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

describe('gamificationService.getUserStreak', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns null when no streak exists', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    const result = await gamificationService.getUserStreak('user-1', 'tenant-1')
    expect(result).toBeNull()
  })

  it('returns streak data when it exists', async () => {
    const streak = { user_id: 'user-1', current_streak: 5, longest_streak: 10 }
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: streak, error: null }),
    })
    const result = await gamificationService.getUserStreak('user-1', 'tenant-1')
    expect(result).toEqual(streak)
  })

  it('returns null for missing table error (42P01)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: '42P01', message: 'table not found' } }),
    })
    const result = await gamificationService.getUserStreak('user-1', 'tenant-1')
    expect(result).toBeNull()
  })

  it('throws for unexpected errors', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: '500', message: 'DB error' } }),
    })
    await expect(gamificationService.getUserStreak('user-1', 'tenant-1')).rejects.toEqual({
      code: '500',
      message: 'DB error',
    })
  })
})

describe('gamificationService.getUserBadges', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns empty array when no badges', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    const result = await gamificationService.getUserBadges('user-1', 'tenant-1')
    expect(result).toEqual([])
  })

  it('returns badges array', async () => {
    const badges = [{ badge_id: 'b1', earned_at: '2026-01-01' }]
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: badges, error: null }),
    })
    const result = await gamificationService.getUserBadges('user-1', 'tenant-1')
    expect(result).toEqual(badges)
  })

  it('returns empty array for 42P01 error (missing table)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: { code: '42P01', message: 'table not found' } }),
    })
    const result = await gamificationService.getUserBadges('user-1', 'tenant-1')
    expect(result).toEqual([])
  })
})
