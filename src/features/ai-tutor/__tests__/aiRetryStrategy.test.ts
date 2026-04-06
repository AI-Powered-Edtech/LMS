/**
 * Unit tests for AI Retry Strategy utilities
 */

import { describe, expect, it, vi } from 'vitest'

import {
  calculateBackoffDelay,
  canExecuteRequest,
  createCircuitBreaker,
  createServiceHealthTracker,
  isRetryableError,
  recordFailure,
  recordSuccess,
  trackFailure,
  trackSuccess,
  withCircuitBreaker,
  withRetry,
} from '../utils/aiRetryStrategy'

describe('AI Retry Strategy', () => {
  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff with jitter', () => {
      const delay = calculateBackoffDelay(0, {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableStatusCodes: [],
      })

      // Should be around 1000ms ± 25% jitter
      expect(delay).toBeGreaterThanOrEqual(750)
      expect(delay).toBeLessThanOrEqual(1250)
    })

    it('should increase delay with each attempt', () => {
      const delay1 = calculateBackoffDelay(0, {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableStatusCodes: [],
      })

      const delay2 = calculateBackoffDelay(1, {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableStatusCodes: [],
      })

      expect(delay2).toBeGreaterThan(delay1)
    })

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2,
        retryableStatusCodes: [],
      })

      expect(delay).toBeLessThanOrEqual(10000)
    })
  })

  describe('isRetryableError', () => {
    it('should return true for rate limit errors', () => {
      expect(isRetryableError(new Error('Rate limit exceeded'))).toBe(true)
      expect(isRetryableError(new Error('Too many requests'))).toBe(true)
    })

    it('should return true for server errors', () => {
      expect(isRetryableError(new Error('Internal server error'))).toBe(true)
      expect(isRetryableError(new Error('Service unavailable'))).toBe(true)
    })

    it('should return true for network errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true)
      expect(isRetryableError(new Error('Fetch failed'))).toBe(true)
    })

    it('should return false for authentication errors', () => {
      expect(isRetryableError(new Error('Unauthorized'))).toBe(false)
      expect(isRetryableError(new Error('Invalid token'))).toBe(false)
    })

    it('should handle error objects with status property', () => {
      expect(isRetryableError({ status: 429 })).toBe(true)
      expect(isRetryableError({ status: 500 })).toBe(true)
      expect(isRetryableError({ status: 401 })).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isRetryableError(null)).toBe(false)
      expect(isRetryableError(undefined)).toBe(false)
    })
  })

  describe('Circuit Breaker', () => {
    it('should start in closed state', () => {
      const circuit = createCircuitBreaker(5, 30000)
      expect(circuit.state).toBe('closed')
      expect(circuit.failureCount).toBe(0)
    })

    it('should allow requests when closed', () => {
      const circuit = createCircuitBreaker(5, 30000)
      expect(canExecuteRequest(circuit)).toBe(true)
    })

    it('should open after threshold failures', () => {
      const circuit = createCircuitBreaker(3, 30000)

      for (let i = 0; i < 3; i++) {
        recordFailure(circuit)
      }

      expect(circuit.state).toBe('open')
      expect(circuit.failureCount).toBe(3)
    })

    it('should block requests when open', () => {
      const circuit = createCircuitBreaker(3, 30000)

      for (let i = 0; i < 3; i++) {
        recordFailure(circuit)
      }

      expect(canExecuteRequest(circuit)).toBe(false)
    })

    it('should reset on success', () => {
      const circuit = createCircuitBreaker(5, 30000)

      recordFailure(circuit)
      recordFailure(circuit)
      expect(circuit.failureCount).toBe(2)

      recordSuccess(circuit)
      expect(circuit.failureCount).toBe(0)
      expect(circuit.state).toBe('closed')
    })

    it('should transition to half-open after recovery timeout', async () => {
      const circuit = createCircuitBreaker(3, 100) // 100ms timeout

      for (let i = 0; i < 3; i++) {
        recordFailure(circuit)
      }

      expect(circuit.state).toBe('open')

      // Wait for timeout
      await new Promise((resolve) => setTimeout(resolve, 150))

      expect(canExecuteRequest(circuit)).toBe(true)
      expect(circuit.state).toBe('half-open')
    })
  })

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await withRetry(fn, { maxRetries: 3 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      const result = await withRetry(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 50,
      })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw after max retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(
        withRetry(fn, {
          maxRetries: 2,
          initialDelayMs: 10,
          maxDelayMs: 50,
        })
      ).rejects.toThrow('Network error')

      expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should not retry on non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Unauthorized'))

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 50,
        })
      ).rejects.toThrow('Unauthorized')

      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should call onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()

      await withRetry(fn, { maxRetries: 3, initialDelayMs: 10, maxDelayMs: 50 }, onRetry)

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number))
    })
  })

  describe('withCircuitBreaker', () => {
    it('should execute function when circuit is closed', async () => {
      const circuit = createCircuitBreaker(5, 30000)
      const fn = vi.fn().mockResolvedValue('success')

      const result = await withCircuitBreaker(circuit, fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should throw when circuit is open', async () => {
      const circuit = createCircuitBreaker(3, 30000)

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        recordFailure(circuit)
      }

      const fn = vi.fn()

      await expect(withCircuitBreaker(circuit, fn)).rejects.toThrow(
        'Layanan AI sedang tidak tersedia'
      )
      expect(fn).not.toHaveBeenCalled()
    })

    it('should record success on successful execution', async () => {
      const circuit = createCircuitBreaker(5, 30000)

      // Add some failures
      recordFailure(circuit)
      recordFailure(circuit)

      const fn = vi.fn().mockResolvedValue('success')

      await withCircuitBreaker(circuit, fn)

      expect(circuit.failureCount).toBe(0)
      expect(circuit.state).toBe('closed')
    })

    it('should record failure on thrown error', async () => {
      const circuit = createCircuitBreaker(5, 30000)
      const fn = vi.fn().mockRejectedValue(new Error('Service error'))

      await expect(withCircuitBreaker(circuit, fn)).rejects.toThrow('Service error')

      expect(circuit.failureCount).toBe(1)
    })
  })

  describe('Service Health Tracker', () => {
    it('should start healthy', () => {
      const health = createServiceHealthTracker('ai-tutor')

      expect(health.service).toBe('ai-tutor')
      expect(health.healthy).toBe(true)
      expect(health.failureCount).toBe(0)
      expect(health.circuitState).toBe('closed')
    })

    it('should track failures', () => {
      const health = createServiceHealthTracker('ai-tutor')

      trackFailure(health)
      trackFailure(health)

      expect(health.failureCount).toBe(2)
      expect(health.healthy).toBe(true)
      expect(health.circuitState).toBe('closed')
    })

    it('should transition to half-open after 3 failures', () => {
      const health = createServiceHealthTracker('ai-tutor')

      for (let i = 0; i < 3; i++) {
        trackFailure(health)
      }

      expect(health.failureCount).toBe(3)
      expect(health.healthy).toBe(false)
      expect(health.circuitState).toBe('half-open')
    })

    it('should transition to open after 5 failures', () => {
      const health = createServiceHealthTracker('ai-tutor')

      for (let i = 0; i < 5; i++) {
        trackFailure(health)
      }

      expect(health.failureCount).toBe(5)
      expect(health.healthy).toBe(false)
      expect(health.circuitState).toBe('open')
    })

    it('should reset on success', () => {
      const health = createServiceHealthTracker('ai-tutor')

      for (let i = 0; i < 3; i++) {
        trackFailure(health)
      }

      trackSuccess(health)

      expect(health.failureCount).toBe(0)
      expect(health.healthy).toBe(true)
      expect(health.circuitState).toBe('closed')
      expect(health.lastSuccess).not.toBeNull()
    })
  })
})
