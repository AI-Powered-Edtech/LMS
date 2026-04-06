/**
 * Unit tests for XAPI Queue
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { XAPIQueue, getXAPIQueue, destroyXAPIQueue } from '../services/xapiQueue'

import type { XAPIStatement } from '../types'

// Mock Supabase
vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}))

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('XAPI Queue', () => {
  let queue: XAPIQueue

  const mockStatement: XAPIStatement = {
    actor: {
      objectType: 'Agent',
      mbox: 'mailto:student@edusync.dev',
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { en: 'completed' },
    },
    object: {
      objectType: 'Activity',
      id: 'http://edusync.dev/lessons/lesson-1',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockLocalStorage.getItem.mockReturnValue(null)
    queue = new XAPIQueue()
  })

  afterEach(() => {
    queue.destroy()
    destroyXAPIQueue()
  })

  describe('enqueue', () => {
    it('should add statement to queue', () => {
      queue.enqueue(mockStatement)

      expect(queue.size).toBe(1)
      expect(queue.statements[0]).toMatchObject(mockStatement)
    })

    it('should save to localStorage', () => {
      queue.enqueue(mockStatement)

      expect(mockLocalStorage.setItem).toHaveBeenCalled()
    })

    it('should respect max queue size', () => {
      for (let i = 0; i < 101; i++) {
        queue.enqueue({
          ...mockStatement,
          object: { ...mockStatement.object, id: `http://example.com/${i}` },
        })
      }

      expect(queue.size).toBeLessThanOrEqual(100)
    })
  })

  describe('sync', () => {
    it('should not sync when offline', async () => {
      ;(navigator as any).onLine = false
      queue.enqueue(mockStatement)

      await queue.sync()

      expect(queue.size).toBe(1) // Still in queue
    })

    it('should sync when online', async () => {
      const { supabase } = await import('@/services/supabase/client')
      const mockInsert = supabase.from('').insert as any
      mockInsert.mockResolvedValueOnce({ error: null })

      queue.enqueue(mockStatement)

      await queue.sync()

      expect(mockInsert).toHaveBeenCalled()
    })

    it('should keep failed statements in queue', async () => {
      const { supabase } = await import('@/services/supabase/client')
      const mockInsert = supabase.from('').insert as any
      mockInsert.mockResolvedValueOnce({ error: new Error('Network error') })

      queue.enqueue(mockStatement)

      await queue.sync()

      expect(queue.size).toBe(1) // Still in queue for retry
    })

    it('should drop statements after 3 failed attempts', async () => {
      const { supabase } = await import('@/services/supabase/client')
      const mockInsert = supabase.from('').insert as any
      mockInsert.mockResolvedValue({ error: new Error('Network error') })

      queue.enqueue(mockStatement)

      // Sync 4 times (initial + 3 retries)
      for (let i = 0; i < 4; i++) {
        await queue.sync()
      }

      expect(queue.size).toBe(0) // Dropped
    })
  })

  describe('auto-sync', () => {
    it('should auto-sync every 30 seconds', async () => {
      const { supabase } = await import('@/services/supabase/client')
      const mockInsert = supabase.from('').insert as any
      mockInsert.mockResolvedValue({ error: null })

      queue.enqueue(mockStatement)

      // Fast-forward 30 seconds
      await vi.advanceTimersByTimeAsync(30000)

      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('online event listener', () => {
    it('should sync when coming back online', async () => {
      const { supabase } = await import('@/services/supabase/client')
      const mockInsert = supabase.from('').insert as any
      mockInsert.mockResolvedValue({ error: null })

      queue.enqueue(mockStatement)

      // Trigger online event
      window.dispatchEvent(new Event('online'))

      await vi.advanceTimersByTimeAsync(1000)

      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should clear all statements', () => {
      queue.enqueue(mockStatement)
      queue.enqueue({ ...mockStatement, object: { ...mockStatement.object, id: 'http://example.com/2' } })

      queue.clear()

      expect(queue.size).toBe(0)
    })
  })

  describe('singleton', () => {
    it('should return same instance', () => {
      const instance1 = getXAPIQueue()
      const instance2 = getXAPIQueue()

      expect(instance1).toBe(instance2)
    })
  })
})
