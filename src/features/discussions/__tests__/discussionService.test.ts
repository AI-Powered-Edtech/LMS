import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── DB Mock ─────────────────────────────────────────────────────────────────
const { mockFrom, mockRpc } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockRpc = vi.fn()
  return { mockFrom, mockRpc }
})

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { discussionService } from '../api/discussionService'

// ── Helpers ────────────────────────────────────────────────────────────────

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit', 'maybeSingle', 'is', 'range']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (v: unknown) => unknown, reject: (v: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── fetchDiscussions ───────────────────────────────────────────────────────

describe('discussionService.fetchDiscussions', () => {
  it('queries discussions table', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    await discussionService.fetchDiscussions({ lessonId: 'lesson-1' })
    expect(mockFrom).toHaveBeenCalledWith('discussions')
  })

  it('applies announcementId filter', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await discussionService.fetchDiscussions({ announcementId: 'ann-1' })
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('announcement_id', 'ann-1')
  })

  it('applies lessonId filter', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await discussionService.fetchDiscussions({ lessonId: 'lesson-1' })
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('lesson_id', 'lesson-1')
  })

  it('returns empty array for no discussions', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await discussionService.fetchDiscussions({ courseId: 'course-1' })
    expect(result).toEqual([])
  })
})

// ── setBestAnswer ──────────────────────────────────────────────────────────

describe('discussionService.setBestAnswer', () => {
  it('calls RPC after pre-verifying tenant ownership', async () => {
    // Pre-verify query returns the post
    mockFrom.mockReturnValue(makeChain({ data: { id: 'post-1' }, error: null }))
    mockRpc.mockResolvedValue({ data: null, error: null })

    await discussionService.setBestAnswer('post-1', 'comment-1', 'tenant-1')

    expect(mockFrom).toHaveBeenCalledWith('discussions')
    expect(mockRpc).toHaveBeenCalledWith('set_best_answer', {
      p_discussion_id: 'post-1',
      p_answer_id: 'comment-1',
    })
  })

  it('throws when post not found in tenant (pre-verify fails)', async () => {
    // Pre-verify query returns null (post doesn't belong to this tenant)
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    await expect(
      discussionService.setBestAnswer('post-1', 'comment-1', 'wrong-tenant')
    ).rejects.toThrow('Post tidak ditemukan atau tidak ada akses ke tenant ini.')

    // RPC should NOT be called when pre-verify fails
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('throws when pre-verify query returns DB error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))

    await expect(
      discussionService.setBestAnswer('post-1', 'comment-1', 'tenant-1')
    ).rejects.toEqual({ message: 'DB error' })

    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('degrades gracefully when set_best_answer RPC not deployed (PGRST202)', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: 'post-1' }, error: null }))
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Not found' } })

    // Should NOT throw — graceful degradation
    await expect(
      discussionService.setBestAnswer('post-1', 'comment-1', 'tenant-1')
    ).resolves.toBeUndefined()
  })

  it('throws when RPC returns a non-PGRST202 error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: 'post-1' }, error: null }))
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'Permission denied' },
    })

    await expect(
      discussionService.setBestAnswer('post-1', 'comment-1', 'tenant-1')
    ).rejects.toEqual({ code: '42501', message: 'Permission denied' })
  })
})

// ── voteDiscussion ─────────────────────────────────────────────────────────

describe('discussionService.voteDiscussion', () => {
  it('returns success when RPC succeeds', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null })

    const result = await discussionService.voteDiscussion('discussion-1')

    expect(result).toEqual({ success: true })
    expect(mockRpc).toHaveBeenCalledWith('vote_discussion_secure', {
      p_discussion_id: 'discussion-1',
    })
  })

  it('returns { success: false, reason: "rpc_not_found" } when RPC not deployed', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Not found' } })

    const result = await discussionService.voteDiscussion('discussion-1')

    expect(result).toEqual({ success: false, reason: 'rpc_not_found' })
  })

  it('throws when RPC returns unexpected error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42P01', message: 'Table missing' } })

    await expect(discussionService.voteDiscussion('discussion-1')).rejects.toEqual({
      code: '42P01',
      message: 'Table missing',
    })
  })
})
