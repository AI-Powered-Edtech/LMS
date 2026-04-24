import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  aiTutorRateLimiter,
  createRateLimiter,
  loginRateLimiter,
  messageRateLimiter,
  passwordResetRateLimiter,
  quizSubmitRateLimiter,
} from '../rateLimiter'

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createRateLimiter', () => {
    it('should allow requests up to the max attempts', () => {
      const limiter = createRateLimiter(3, 1000)
      const key = 'user1'

      const result1 = limiter.check(key)
      expect(result1.allowed).toBe(true)
      expect(result1.remainingAttempts).toBe(2)

      const result2 = limiter.check(key)
      expect(result2.allowed).toBe(true)
      expect(result2.remainingAttempts).toBe(1)

      const result3 = limiter.check(key)
      expect(result3.allowed).toBe(true)
      expect(result3.remainingAttempts).toBe(0)
    })

    it('should block requests once max attempts are reached', () => {
      const limiter = createRateLimiter(2, 1000)
      const key = 'user1'

      limiter.check(key)
      limiter.check(key)

      const blockedResult = limiter.check(key)
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.remainingAttempts).toBe(0)
      expect(blockedResult.retryAfterMs).toBeGreaterThan(0)
      expect(blockedResult.retryAfterMs).toBeLessThanOrEqual(1000)
    })

    it('should reset limits after the window duration has passed', () => {
      const limiter = createRateLimiter(2, 1000)
      const key = 'user1'

      limiter.check(key)
      limiter.check(key)

      expect(limiter.check(key).allowed).toBe(false)

      // Advance time beyond the window duration
      vi.advanceTimersByTime(1001)

      const newResult = limiter.check(key)
      expect(newResult.allowed).toBe(true)
      expect(newResult.remainingAttempts).toBe(1)
    })

    it('should track limits independently for different keys', () => {
      const limiter = createRateLimiter(1, 1000)
      const key1 = 'user1'
      const key2 = 'user2'

      expect(limiter.check(key1).allowed).toBe(true)
      expect(limiter.check(key1).allowed).toBe(false) // key1 is blocked

      expect(limiter.check(key2).allowed).toBe(true) // key2 is still allowed
    })

    it('should manually reset limits when reset is called', () => {
      const limiter = createRateLimiter(1, 1000)
      const key = 'user1'

      limiter.check(key)
      expect(limiter.check(key).allowed).toBe(false)

      limiter.reset(key)

      expect(limiter.check(key).allowed).toBe(true)
    })

    it('should clean up expired keys automatically', () => {
      // Create a limiter and ensure cleanup happens
      const limiter = createRateLimiter(1, 1000)
      const key = 'testKey'

      limiter.check(key)

      // Advance by 60 seconds (the hardcoded cleanup interval) + 1 ms
      vi.advanceTimersByTime(60_001)

      // Check after cleanup
      const result = limiter.check(key)
      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(0)
    })
  })

  describe('Pre-configured instances', () => {
    it('should correctly configure loginRateLimiter', () => {
      expect(loginRateLimiter).toBeDefined()
    })

    it('should correctly configure quizSubmitRateLimiter', () => {
      expect(quizSubmitRateLimiter).toBeDefined()
    })

    it('should correctly configure aiTutorRateLimiter', () => {
      expect(aiTutorRateLimiter).toBeDefined()
    })

    it('should correctly configure passwordResetRateLimiter', () => {
      expect(passwordResetRateLimiter).toBeDefined()
    })

    it('should correctly configure messageRateLimiter', () => {
      expect(messageRateLimiter).toBeDefined()
    })
  })
})
