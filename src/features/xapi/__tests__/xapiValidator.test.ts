/**
 * Unit tests for XAPI Statement Validator
 */

import { describe, expect, it } from 'vitest'

import { validateXAPIStatement } from '../utils/xapiValidator'

describe('XAPI Statement Validator', () => {
  const validStatement = {
    actor: {
      objectType: 'Agent' as const,
      mbox: 'mailto:student@edusync.dev',
      name: 'Test Student',
    },
    verb: {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { en: 'completed' },
    },
    object: {
      objectType: 'Activity' as const,
      id: 'http://edusync.dev/lessons/lesson-123',
      definition: {
        name: { en: 'Lesson 123' },
        description: { en: 'Test lesson' },
      },
    },
    result: {
      score: {
        scaled: 0.85,
        raw: 85,
        min: 0,
        max: 100,
      },
      success: true,
      completion: true,
    },
    timestamp: '2024-01-01T10:00:00Z',
  }

  describe('validateXAPIStatement', () => {
    it('should validate a correct statement', () => {
      const result = validateXAPIStatement(validStatement)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing actor', () => {
      const statement = { ...validStatement, actor: null as any }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Actor'))).toBe(true)
    })

    it('should detect invalid actor mbox', () => {
      const statement = {
        ...validStatement,
        actor: { ...validStatement.actor, mbox: 'invalid-email' },
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('mailto:'))).toBe(true)
    })

    it('should detect missing verb', () => {
      const statement = { ...validStatement, verb: null as any }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Verb'))).toBe(true)
    })

    it('should detect invalid verb ID', () => {
      const statement = {
        ...validStatement,
        verb: { ...validStatement.verb, id: 'not-a-url' },
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('IRI'))).toBe(true)
    })

    it('should detect missing object', () => {
      const statement = { ...validStatement, object: null as any }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Object'))).toBe(true)
    })

    it('should detect invalid object ID', () => {
      const statement = {
        ...validStatement,
        object: { ...validStatement.object, id: 'not-a-url' },
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('IRI'))).toBe(true)
    })

    it('should detect invalid score range', () => {
      const statement = {
        ...validStatement,
        result: {
          ...validStatement.result,
          score: { ...validStatement.result!.score, scaled: 1.5 },
        },
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('scaled'))).toBe(true)
    })

    it('should detect invalid timestamp', () => {
      const statement = {
        ...validStatement,
        timestamp: 'not-a-date',
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Timestamp'))).toBe(true)
    })

    it('should detect invalid duration format', () => {
      const statement = {
        ...validStatement,
        result: {
          ...validStatement.result,
          duration: 'invalid-duration',
        },
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('Duration'))).toBe(true)
    })

    it('should allow statement without optional result', () => {
      const statement = {
        ...validStatement,
        result: undefined,
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(true)
    })

    it('should validate context fields if present', () => {
      const statement = {
        ...validStatement,
        context: {
          platform: 123 as any,
        },
      }
      const result = validateXAPIStatement(statement)

      expect(result.isValid).toBe(false)
      expect(result.errors.some((e) => e.includes('platform'))).toBe(true)
    })
  })
})
