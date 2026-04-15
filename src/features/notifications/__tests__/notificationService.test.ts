import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchNotifications, markAllAsRead, markAsRead } from '../api/notificationService'

const mockFrom = vi.fn()

vi.mock('@/src/services/api/client', () => ({
  api: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

/**
 * Build a fully chainable API query mock.
 * Every method returns `this` so any chain order works,
 * and `then` makes the object awaitable with the given result.
 */
function makeChain(resolveWith: { data?: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select',
    'eq',
    'order',
    'limit',
    'update',
    'insert',
    'delete',
    'in',
    'single',
    'maybeSingle',
    'is',
    'ilike',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(resolve, reject)
  return chain
}

describe('fetchNotifications', () => {
  beforeEach(() => vi.clearAllMocks())

  it('queries notifications table', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await fetchNotifications('user-1', 'tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('notifications')
  })

  it('returns notifications array', async () => {
    const notifications = [{ id: 'n1', user_id: 'user-1', is_read: false }]
    const chain = makeChain({ data: notifications, error: null })
    mockFrom.mockReturnValue(chain)
    const result = await fetchNotifications('user-1', 'tenant-1')
    expect(result).toEqual(notifications)
  })

  it('limits to 50 notifications', async () => {
    const chain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await fetchNotifications('user-1', 'tenant-1')
    expect(chain.limit).toHaveBeenCalledWith(50)
  })

  it('throws on error', async () => {
    const chain = makeChain({ data: null, error: { message: 'Access denied' } })
    mockFrom.mockReturnValue(chain)
    await expect(fetchNotifications('user-1', 'tenant-1')).rejects.toMatchObject({
      message: 'Access denied',
    })
  })
})

describe('markAsRead', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates notifications table', async () => {
    const chain = makeChain({ error: null })
    mockFrom.mockReturnValue(chain)
    await markAsRead('n1', 'tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('notifications')
  })

  it('sets is_read to true', async () => {
    const chain = makeChain({ error: null })
    mockFrom.mockReturnValue(chain)
    await markAsRead('n1', 'tenant-1')
    expect(chain.update).toHaveBeenCalledWith({ is_read: true })
  })

  it('throws on error', async () => {
    const chain = makeChain({ error: { message: 'Update failed' } })
    mockFrom.mockReturnValue(chain)
    await expect(markAsRead('n1', 'tenant-1')).rejects.toMatchObject({ message: 'Update failed' })
  })
})

describe('markAllAsRead', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates all unread notifications for user', async () => {
    const chain = makeChain({ error: null })
    mockFrom.mockReturnValue(chain)
    await markAllAsRead('user-1', 'tenant-1')
    expect(mockFrom).toHaveBeenCalledWith('notifications')
    expect(chain.update).toHaveBeenCalledWith({ is_read: true })
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.eq).toHaveBeenCalledWith('tenant_id', 'tenant-1')
    expect(chain.eq).toHaveBeenCalledWith('is_read', false)
  })
})
