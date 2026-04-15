import { beforeEach, describe, expect, it, vi } from 'vitest'

import { leaderboardService } from '../api/leaderboardService'

const mockFrom = vi.fn()

vi.mock('@/src/services/api/client', () => ({
  api: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function makeLeaderboardChain(resolveWith: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  }
  // The final method in the chain resolves the promise
  // The chain is: .from().select().eq('tenant_id').order().limit()
  // Then conditionally .eq('class_id') is added before await
  // Since API query builder is chainable, limit returns a thenable
  chain.limit.mockImplementation(() => {
    // Return a thenable that also has .eq() for the class_id filter
    const thenable = {
      eq: vi.fn().mockResolvedValue(resolveWith),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(resolveWith).then(resolve, reject),
    }
    return thenable
  })
  return chain
}

describe('leaderboardService.getLeaderboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries leaderboards table', async () => {
    mockFrom.mockReturnValue(makeLeaderboardChain({ data: [], error: null }))
    await leaderboardService.getLeaderboard('class-1', 'tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('leaderboards')
  })

  it('returns empty array when no entries', async () => {
    mockFrom.mockReturnValue(makeLeaderboardChain({ data: [], error: null }))
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1')
    expect(result).toEqual([])
  })

  it('maps points to score field', async () => {
    const entries = [{ user_id: 'u1', points: 100, rank: 1 }]
    mockFrom.mockReturnValue(makeLeaderboardChain({ data: entries, error: null }))
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1')
    expect(result[0].score).toBe(100)
  })

  it('returns empty array for 42P01 (missing table)', async () => {
    mockFrom.mockReturnValue(
      makeLeaderboardChain({
        data: null,
        error: { code: '42P01', message: 'table not found' },
      })
    )
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1')
    expect(result).toEqual([])
  })

  it('returns empty array for 400 error', async () => {
    mockFrom.mockReturnValue(
      makeLeaderboardChain({
        data: null,
        error: { code: '400', message: 'bad request' },
      })
    )
    const result = await leaderboardService.getLeaderboard('class-1', 'tenant-1')
    expect(result).toEqual([])
  })

  it('throws for unexpected errors', async () => {
    mockFrom.mockReturnValue(
      makeLeaderboardChain({
        data: null,
        error: { code: '500', message: 'Internal error' },
      })
    )
    await expect(leaderboardService.getLeaderboard('class-1', 'tenant-1')).rejects.toMatchObject({
      code: '500',
    })
  })

  it('limits to top 20', async () => {
    const chain = makeLeaderboardChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await leaderboardService.getLeaderboard('class-1', 'tenant-1')
    expect(chain.limit).toHaveBeenCalledWith(20)
  })
})
