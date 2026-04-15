import { beforeEach, describe, expect, it, vi } from 'vitest'

import { announcementService } from '../api/announcementService'

const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

/**
 * Build a fully chainable query mock.
 * Every method returns `this` so any chain order works,
 * and `then` makes the object awaitable with the given result.
 */
function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select',
    'eq',
    'order',
    'is',
    'or',
    'ilike',
    'range',
    'limit',
    'in',
    'single',
    'maybeSingle',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(resolve, reject)
  return chain
}

describe('announcementService.fetchAnnouncements', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries announcements table', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await announcementService.fetchAnnouncements('tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('announcements')
  })

  it('applies tenant_id filter', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await announcementService.fetchAnnouncements('tenant-1')
    expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
  })

  it('returns announcements on success', async () => {
    const items = [{ id: 'a1', title: 'Test', tenant_id: 'tenant-1' }]
    const chain = makeChain({ data: items, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await announcementService.fetchAnnouncements('tenant-1')
    expect(result).toEqual(items)
  })

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'Access denied' } })
    mockFrom.mockReturnValue(chain)
    await expect(announcementService.fetchAnnouncements('tenant-1')).rejects.toMatchObject({
      message: 'Access denied',
    })
  })

  it('uses course_id filter when provided', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await announcementService.fetchAnnouncements('tenant-1', { courseId: 'course-1' })
    expect(chain.or).toHaveBeenCalledWith(`course_id.eq.course-1,course_id.is.null`)
  })
})
