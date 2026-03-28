import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cachedQuery,
  CacheKeys,
  clearCache,
  getCached,
  invalidateCourseCache,
  invalidateUserCache,
  setCache,
} from '../cache'

// jsdom provides localStorage — we use the real implementation in tests

beforeEach(() => {
  localStorage.clear()
})

describe('setCache + getCached', () => {
  it('stores and retrieves a value', () => {
    setCache('test-key', { name: 'EduSync' }, 10)
    const result = getCached<{ name: string }>('test-key')
    expect(result).toEqual({ name: 'EduSync' })
  })

  it('returns null for non-existent key', () => {
    expect(getCached('missing-key')).toBeNull()
  })

  it('returns null when TTL has expired', () => {
    // Manually write an expired entry
    const expired = {
      data: 'stale',
      timestamp: Date.now() - 20 * 60 * 1000, // 20 minutes ago
      ttlMinutes: 15,
    }
    localStorage.setItem('edusync_cache_expired-key', JSON.stringify(expired))
    expect(getCached('expired-key')).toBeNull()
  })

  it('removes expired entry from localStorage', () => {
    const expired = {
      data: 'stale',
      timestamp: Date.now() - 20 * 60 * 1000,
      ttlMinutes: 15,
    }
    localStorage.setItem('edusync_cache_expired-key', JSON.stringify(expired))
    getCached('expired-key')
    expect(localStorage.getItem('edusync_cache_expired-key')).toBeNull()
  })

  it('returns null for corrupted JSON in localStorage', () => {
    localStorage.setItem('edusync_cache_bad-key', 'NOT_JSON{{{')
    expect(getCached('bad-key')).toBeNull()
  })

  it('stores complex objects', () => {
    const data = { list: [1, 2, 3], nested: { x: true } }
    setCache('complex', data, 5)
    expect(getCached('complex')).toEqual(data)
  })
})

describe('clearCache', () => {
  it('clears all edusync_cache_ entries', () => {
    setCache('key1', 'a', 10)
    setCache('key2', 'b', 10)
    localStorage.setItem('other_key', 'should-stay')
    clearCache()
    expect(getCached('key1')).toBeNull()
    expect(getCached('key2')).toBeNull()
    expect(localStorage.getItem('other_key')).toBe('should-stay')
  })

  it('clears only entries matching prefix', () => {
    setCache('xp_user1', 100, 10)
    setCache('badges_user1', ['badge1'], 10)
    clearCache('xp_')
    expect(getCached('xp_user1')).toBeNull()
    expect(getCached('badges_user1')).not.toBeNull()
  })
})

describe('cachedQuery', () => {
  it('calls queryFn and caches the result', async () => {
    const queryFn = vi.fn().mockResolvedValue([1, 2, 3])
    const result = await cachedQuery('fresh-key', queryFn, 10)
    expect(result).toEqual([1, 2, 3])
    expect(queryFn).toHaveBeenCalledOnce()
  })

  it('returns cached value without calling queryFn on second call', async () => {
    const queryFn = vi.fn().mockResolvedValue('initial')
    await cachedQuery('cached-key', queryFn, 10)
    const second = await cachedQuery('cached-key', queryFn, 10)
    expect(second).toBe('initial')
    expect(queryFn).toHaveBeenCalledOnce()
  })

  it('re-throws errors from queryFn', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('DB error'))
    await expect(cachedQuery('error-key', queryFn)).rejects.toThrow('DB error')
  })

  it('handles localStorage.removeItem failure in error path gracefully', async () => {
    // Set an expired cache entry so cachedQuery calls queryFn
    const expiredEntry = { data: 'stale', timestamp: Date.now() - 20 * 60 * 1000, ttlMinutes: 10 }
    localStorage.setItem('edusync_cache_broken-key', JSON.stringify(expiredEntry))

    const queryFn = vi.fn().mockRejectedValue(new Error('fetch fail'))

    // Mock removeItem to throw (simulating a broken localStorage)
    const realRemoveItem = Storage.prototype.removeItem
    Storage.prototype.removeItem = function () {
      throw new DOMException('SecurityError')
    }

    // Should still re-throw the queryFn error despite removeItem failing
    await expect(cachedQuery('broken-key', queryFn)).rejects.toThrow('fetch fail')

    Storage.prototype.removeItem = realRemoveItem
  })

  it('removes corrupted cache entry on queryFn error', async () => {
    // Set an expired cache entry so cachedQuery will call queryFn
    const expiredEntry = { data: 'partial', timestamp: Date.now() - 20 * 60 * 1000, ttlMinutes: 10 }
    localStorage.setItem('edusync_cache_error-key2', JSON.stringify(expiredEntry))
    const queryFn = vi.fn().mockRejectedValue(new Error('fail'))
    await expect(cachedQuery('error-key2', queryFn)).rejects.toThrow()
    // Verify the cache entry was removed
    expect(localStorage.getItem('edusync_cache_error-key2')).toBeNull()
  })
})

describe('setCache - localStorage full scenario', () => {
  it('clears old entries and retries when localStorage is full', () => {
    // Pre-fill cache with an entry using real localStorage
    setCache('existing', 'data', 10)
    expect(getCached('existing')).toBe('data')

    // Track calls through the real setItem then throw on next setItem
    let callCount = 0
    const realSetItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key: string, value: string) {
      callCount++
      if (callCount === 1) {
        // First setItem inside setCache — throw to trigger the catch block
        throw new DOMException('QuotaExceededError')
      }
      // Retry call — use real implementation
      return realSetItem.call(this, key, value)
    }

    setCache('new-key', 'new-data', 10)

    // Restore
    Storage.prototype.setItem = realSetItem

    // After retry the new value should be cached
    expect(getCached<string>('new-key')).toBe('new-data')
  })

  it('silently fails when localStorage is completely full', () => {
    // Mock setItem to always throw
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    // Should not throw
    expect(() => setCache('key', 'value', 10)).not.toThrow()
    spy.mockRestore()
  })
})

describe('CacheKeys', () => {
  it('generates consistent xpProfile key', () => {
    expect(CacheKeys.xpProfile('user1')).toBe('xp_user1')
  })

  it('generates consistent badges key', () => {
    expect(CacheKeys.badges('user2')).toBe('badges_user2')
  })

  it('generates consistent leaderboard key', () => {
    expect(CacheKeys.leaderboard('course1', 'weekly')).toBe('lb_course1_weekly')
  })

  it('generates consistent progress key', () => {
    expect(CacheKeys.progress('user1', 'course1')).toBe('progress_user1_course1')
  })
})

describe('invalidateUserCache', () => {
  it('clears XP, badges, and progress entries for a user', () => {
    setCache('xp_user1', 100, 10)
    setCache('badges_user1', [], 10)
    setCache('progress_user1', {}, 10)
    invalidateUserCache('user1')
    expect(getCached('xp_user1')).toBeNull()
    expect(getCached('badges_user1')).toBeNull()
    expect(getCached('progress_user1')).toBeNull()
  })
})

describe('invalidateCourseCache', () => {
  it('clears analytics, leaderboard, and class entries for a course', () => {
    setCache('analytics_course1', {}, 10)
    setCache('lb_course1', {}, 10)
    setCache('class_course1', {}, 10)
    invalidateCourseCache('course1')
    expect(getCached('analytics_course1')).toBeNull()
    expect(getCached('lb_course1')).toBeNull()
    expect(getCached('class_course1')).toBeNull()
  })
})
