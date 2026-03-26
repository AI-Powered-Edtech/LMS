<<<<<<< Updated upstream
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
=======
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest'
>>>>>>> Stashed changes

import {
  aiTutorRateLimiter,
  createRateLimiter,
  loginRateLimiter,
  passwordResetRateLimiter,
  quizSubmitRateLimiter,
} from '../rateLimiter'

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within the limit', () => {
    const limiter = createRateLimiter(3, 60_000)

    const r1 = limiter.check('user-1')
    expect(r1.allowed).toBe(true)
    expect(r1.remainingAttempts).toBe(2)

    const r2 = limiter.check('user-1')
    expect(r2.allowed).toBe(true)
    expect(r2.remainingAttempts).toBe(1)

    const r3 = limiter.check('user-1')
    expect(r3.allowed).toBe(true)
    expect(r3.remainingAttempts).toBe(0)
  })

  it('blocks requests that exceed the limit', () => {
    const limiter = createRateLimiter(2, 60_000)

    limiter.check('user-1')
    limiter.check('user-1')

    const r3 = limiter.check('user-1')
    expect(r3.allowed).toBe(false)
    expect(r3.remainingAttempts).toBe(0)
    expect(r3.retryAfterMs).toBeGreaterThan(0)
    expect(r3.retryAfterMs).toBeLessThanOrEqual(60_000)
  })

  it('allows requests again after the window expires', () => {
    const limiter = createRateLimiter(2, 10_000)

    limiter.check('user-1')
    limiter.check('user-1')

    // Should be blocked
    expect(limiter.check('user-1').allowed).toBe(false)

    // Advance past the window
    vi.advanceTimersByTime(10_001)

    // Should be allowed again
    const result = limiter.check('user-1')
    expect(result.allowed).toBe(true)
    expect(result.remainingAttempts).toBe(1)
  })

  it('correctly reports retryAfterMs', () => {
    const limiter = createRateLimiter(1, 30_000)

    limiter.check('user-1')

    // Advance 10s into the window
    vi.advanceTimersByTime(10_000)

    const result = limiter.check('user-1')
    expect(result.allowed).toBe(false)
    // Should have ~20s left
    expect(result.retryAfterMs).toBeLessThanOrEqual(20_000)
    expect(result.retryAfterMs).toBeGreaterThan(19_000)
  })

  it('reset() clears the counter for a key', () => {
    const limiter = createRateLimiter(1, 60_000)

    limiter.check('user-1')
    expect(limiter.check('user-1').allowed).toBe(false)

    limiter.reset('user-1')

    const result = limiter.check('user-1')
    expect(result.allowed).toBe(true)
    expect(result.remainingAttempts).toBe(0) // 1 max - 1 used = 0
  })

  it('tracks multiple keys independently', () => {
    const limiter = createRateLimiter(1, 60_000)

    limiter.check('user-a')
    limiter.check('user-b')

    // user-a is exhausted
    expect(limiter.check('user-a').allowed).toBe(false)
    // user-b is exhausted
    expect(limiter.check('user-b').allowed).toBe(false)

    // Reset only user-a
    limiter.reset('user-a')

    expect(limiter.check('user-a').allowed).toBe(true)
    expect(limiter.check('user-b').allowed).toBe(false)
  })

  it('resets window after expiration and counts fresh', () => {
    const limiter = createRateLimiter(3, 5_000)

    // Exhaust all attempts
    limiter.check('k')
    limiter.check('k')
    limiter.check('k')
    expect(limiter.check('k').allowed).toBe(false)

    // Advance past window
    vi.advanceTimersByTime(5_001)

    // First call in the new window should give full remaining
    const r = limiter.check('k')
    expect(r.allowed).toBe(true)
    expect(r.remainingAttempts).toBe(2)
  })

  it('cleanup interval removes expired entries after 60s', () => {
    const limiter = createRateLimiter(2, 5_000)

    // Add some entries
    limiter.check('expired-key')
    limiter.check('fresh-key')

    // Advance past the window for expired-key
    vi.advanceTimersByTime(5_001)

    // Add fresh entry for fresh-key (resets its window)
    limiter.check('fresh-key')

    // Advance to trigger cleanup interval (60s)
    vi.advanceTimersByTime(60_000)

    // expired-key should have been cleaned up, so it starts fresh
    const r = limiter.check('expired-key')
    expect(r.allowed).toBe(true)
    expect(r.remainingAttempts).toBe(1)
  })
})

describe('pre-configured rate limiter instances', () => {
  it('loginRateLimiter exists and is functional', () => {
    expect(loginRateLimiter).toBeDefined()
    expect(typeof loginRateLimiter.check).toBe('function')
    expect(typeof loginRateLimiter.reset).toBe('function')
  })

  it('quizSubmitRateLimiter exists and is functional', () => {
    expect(quizSubmitRateLimiter).toBeDefined()
    expect(typeof quizSubmitRateLimiter.check).toBe('function')
    expect(typeof quizSubmitRateLimiter.reset).toBe('function')
  })

  it('aiTutorRateLimiter exists and is functional', () => {
    expect(aiTutorRateLimiter).toBeDefined()
    expect(typeof aiTutorRateLimiter.check).toBe('function')
    expect(typeof aiTutorRateLimiter.reset).toBe('function')
  })

  it('passwordResetRateLimiter exists and is functional', () => {
    expect(passwordResetRateLimiter).toBeDefined()
    expect(typeof passwordResetRateLimiter.check).toBe('function')
    expect(typeof passwordResetRateLimiter.reset).toBe('function')
  })
})
