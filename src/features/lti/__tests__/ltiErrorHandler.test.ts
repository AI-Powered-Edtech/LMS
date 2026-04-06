/**
 * Unit tests for LTI Error Handler
 */

import { describe, expect, it } from 'vitest'

import { classifyLTLError, createLTLError, shouldLogLTLError } from '../utils/ltiErrorHandler'

describe('LTI Error Handler', () => {
  describe('classifyLTLError', () => {
    it('should classify token expired errors', () => {
      const error = new Error('Token expired at 2024-01-01')
      const result = classifyLTLError(error)

      expect(result.code).toBe('TOKEN_EXPIRED')
      expect(result.retryable).toBe(true)
      expect(result.message).toContain('kadaluarsa')
    })

    it('should classify invalid token errors', () => {
      const error = new Error('Invalid token format')
      const result = classifyLTLError(error)

      expect(result.code).toBe('TOKEN_INVALID')
      expect(result.retryable).toBe(false)
    })

    it('should classify missing claims errors', () => {
      const error = new Error('Missing required claims: email, name')
      const result = classifyLTLError(error)

      expect(result.code).toBe('MISSING_CLAIMS')
      expect(result.retryable).toBe(false)
    })

    it('should classify signature errors', () => {
      const error = new Error('JWKS verification failed')
      const result = classifyLTLError(error)

      expect(result.code).toBe('INVALID_SIGNATURE')
      expect(result.retryable).toBe(false)
    })

    it('should classify platform not found errors', () => {
      const error = new Error('Platform not found: unknown issuer')
      const result = classifyLTLError(error)

      expect(result.code).toBe('PLATFORM_NOT_FOUND')
      expect(result.retryable).toBe(false)
    })

    it('should classify network errors', () => {
      const error = new Error('Failed to fetch')
      const result = classifyLTLError(error)

      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.retryable).toBe(true)
    })

    it('should handle null error', () => {
      const result = classifyLTLError(null)

      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.retryable).toBe(false)
    })

    it('should handle unknown errors', () => {
      const error = new Error('Something weird happened')
      const result = classifyLTLError(error)

      expect(result.code).toBe('UNKNOWN_ERROR')
      expect(result.retryable).toBe(true)
    })
  })

  describe('shouldLogLTLError', () => {
    it('should always log non-retryable errors', () => {
      const error = createLTLError('TOKEN_INVALID')
      expect(shouldLogLTLError(error)).toBe(true)
    })

    it('should log specific retryable errors', () => {
      const error = createLTLError('INVALID_SIGNATURE')
      expect(shouldLogLTLError(error)).toBe(true)
    })

    it('should not log generic retryable errors', () => {
      const error = createLTLError('MALFORMED_LAUNCH')
      expect(shouldLogLTLError(error)).toBe(false)
    })
  })

  describe('createLTLError', () => {
    it('should create error with correct code and message', () => {
      const error = createLTLError('TOKEN_EXPIRED')

      expect(error.code).toBe('TOKEN_EXPIRED')
      expect(error.message).toContain('kadaluarsa')
      expect(error.retryable).toBe(true)
    })

    it('should include details if provided', () => {
      const details = { platform: 'Canvas', timestamp: '2024-01-01' }
      const error = createLTLError('PLATFORM_NOT_FOUND', details)

      expect(error.details).toEqual(details)
    })

    it('should set retryable correctly for non-retryable codes', () => {
      const error = createLTLError('INVALID_SIGNATURE')
      expect(error.retryable).toBe(false)
    })
  })
})
