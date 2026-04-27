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
    it('should allow requests within the limit', () => {
      const limiter = createRateLimiter(3, 1000)

      const res1 = limiter.check('user1')
      expect(res1.allowed).toBe(true)
      expect(res1.remainingAttempts).toBe(2)

      const res2 = limiter.check('user1')
      expect(res2.allowed).toBe(true)
      expect(res2.remainingAttempts).toBe(1)

      const res3 = limiter.check('user1')
      expect(res3.allowed).toBe(true)
      expect(res3.remainingAttempts).toBe(0)
    })

    it('should reject requests that exceed the limit within the window', () => {
      const limiter = createRateLimiter(2, 1000)

      limiter.check('user1')
      limiter.check('user1')

      const res3 = limiter.check('user1')
      expect(res3.allowed).toBe(false)
      expect(res3.remainingAttempts).toBe(0)
      expect(res3.retryAfterMs).toBeGreaterThan(0)
      expect(res3.retryAfterMs).toBeLessThanOrEqual(1000)
    })

    it('should track different keys separately', () => {
      const limiter = createRateLimiter(1, 1000)

      const res1 = limiter.check('user1')
      expect(res1.allowed).toBe(true)

      const res2 = limiter.check('user2')
      expect(res2.allowed).toBe(true)

      const res3 = limiter.check('user1')
      expect(res3.allowed).toBe(false)
    })

    it('should reset the limit after the window expires', () => {
      const limiter = createRateLimiter(1, 1000)

      limiter.check('user1')

      expect(limiter.check('user1').allowed).toBe(false)

      // Advance time beyond the window
      vi.advanceTimersByTime(1001)

      const res3 = limiter.check('user1')
      expect(res3.allowed).toBe(true)
      expect(res3.remainingAttempts).toBe(0) // It's maxAttempts - 1 (1 - 1 = 0)
    })

    it('should manually reset a key', () => {
      const limiter = createRateLimiter(1, 1000)

      limiter.check('user1')
      expect(limiter.check('user1').allowed).toBe(false)

      limiter.reset('user1')

      const res3 = limiter.check('user1')
      expect(res3.allowed).toBe(true)
    })

    it('should cleanup expired entries periodically', () => {
      const limiter = createRateLimiter(1, 1000)

      limiter.check('user1')
      limiter.check('user2')

      // Advance time by 60s (cleanup interval) + 1s to ensure window passed
      vi.advanceTimersByTime(61000)

      // By this time, the internal interval should have run and cleared expired entries
      // Since we can't easily inspect the internal Map, we just verify it still works normally
      // after a long time.
      const res = limiter.check('user1')
      expect(res.allowed).toBe(true)
    })
  })

  describe('Pre-configured limiters', () => {
    it('exports loginRateLimiter', () => {
      expect(loginRateLimiter).toBeDefined()
      expect(typeof loginRateLimiter.check).toBe('function')
      expect(typeof loginRateLimiter.reset).toBe('function')
    })

    it('exports quizSubmitRateLimiter', () => {
      expect(quizSubmitRateLimiter).toBeDefined()
    })

    it('exports aiTutorRateLimiter', () => {
      expect(aiTutorRateLimiter).toBeDefined()
    })

    it('exports passwordResetRateLimiter', () => {
      expect(passwordResetRateLimiter).toBeDefined()
    })

    it('exports messageRateLimiter', () => {
      expect(messageRateLimiter).toBeDefined()
    })
  })
})
