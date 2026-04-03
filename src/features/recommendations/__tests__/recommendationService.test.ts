import { beforeEach, describe, expect, it, vi } from 'vitest'

import { recommendationService } from '../api/recommendationService'

const mockRpc = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('recommendationService.getRecommendations', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_student_recommendations RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await recommendationService.getRecommendations('user-1')
    expect(mockRpc).toHaveBeenCalledWith('get_student_recommendations', {
      p_user_id: 'user-1',
      p_limit: 5,
    })
  })

  it('uses default limit of 5', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await recommendationService.getRecommendations('user-1')
    expect(mockRpc).toHaveBeenCalledWith(
      'get_student_recommendations',
      expect.objectContaining({
        p_limit: 5,
      })
    )
  })

  it('accepts custom limit', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await recommendationService.getRecommendations('user-1', 10)
    expect(mockRpc).toHaveBeenCalledWith(
      'get_student_recommendations',
      expect.objectContaining({
        p_limit: 10,
      })
    )
  })

  it('returns recommendations array', async () => {
    const recs = [{ id: 'r1', lesson_id: 'l1', score: 0.9 }]
    mockRpc.mockResolvedValue({ data: recs, error: null })
    const result = await recommendationService.getRecommendations('user-1')
    expect(result).toEqual(recs)
  })

  it('returns empty array when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const result = await recommendationService.getRecommendations('user-1')
    expect(result).toEqual([])
  })

  it('returns empty array on RPC error (graceful degradation)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC not found' } })
    const result = await recommendationService.getRecommendations('user-1')
    expect(result).toEqual([])
  })
})

describe('recommendationService.recordAction', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls record_recommendation_action RPC with accepted', async () => {
    mockRpc.mockResolvedValue({ error: null })
    await recommendationService.recordAction('rec-1', 'accepted')
    expect(mockRpc).toHaveBeenCalledWith('record_recommendation_action', {
      p_recommendation_id: 'rec-1',
      p_action: 'accepted',
    })
  })

  it('calls record_recommendation_action RPC with dismissed', async () => {
    mockRpc.mockResolvedValue({ error: null })
    await recommendationService.recordAction('rec-1', 'dismissed')
    expect(mockRpc).toHaveBeenCalledWith(
      'record_recommendation_action',
      expect.objectContaining({
        p_action: 'dismissed',
      })
    )
  })

  it('does not throw on RPC error (graceful degradation)', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'Action failed' } })
    // recordAction uses graceful degradation — resolves silently instead of throwing
    await expect(recommendationService.recordAction('rec-1', 'accepted')).resolves.toBeUndefined()
  })
})
