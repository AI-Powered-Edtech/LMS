import * as v from 'valibot'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('validate utilities', () => {
  const schema = v.object({
    name: v.string(),
  })

  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.clearAllMocks()
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validate', () => {
    it('returns data unchanged and does not log when valid', async () => {
      vi.stubEnv('DEV', 'true' as any)
      const { validate } = await import('./validate')

      const validData = { name: 'test' }
      const result = validate(schema, validData, 'TestLabel')

      expect(result).toBe(validData)
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('returns data unchanged and logs warning in dev when invalid', async () => {
      vi.stubEnv('DEV', 'true' as any)
      const { validate } = await import('./validate')

      const invalidData = { name: 123 }
      const result = validate(schema, invalidData, 'TestLabel')

      expect(result).toBe(invalidData)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[validate] TestLabel: validation failed',
        expect.any(Object)
      )
    })

    it('returns data unchanged and does not log warning in prod when invalid', async () => {
      vi.stubEnv('DEV', '' as any) // false
      const { validate } = await import('./validate')

      const invalidData = { name: 123 }
      const result = validate(schema, invalidData, 'TestLabel')

      expect(result).toBe(invalidData)
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('uses "unknown" as default label if not provided', async () => {
      vi.stubEnv('DEV', 'true' as any)
      const { validate } = await import('./validate')

      const invalidData = { name: 123 }
      validate(schema, invalidData)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[validate] unknown: validation failed',
        expect.any(Object)
      )
    })
  })

  describe('validateArray', () => {
    it('returns data unchanged and does not log when all items are valid', async () => {
      vi.stubEnv('DEV', 'true' as any)
      const { validateArray } = await import('./validate')

      const validData = [{ name: 'test1' }, { name: 'test2' }]
      const result = validateArray(schema, validData, 'TestArray')

      expect(result).toBe(validData)
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('returns data unchanged and logs warnings in dev for invalid items', async () => {
      vi.stubEnv('DEV', 'true' as any)
      const { validateArray } = await import('./validate')

      const mixedData = [{ name: 'valid' }, { name: 123 }, { age: 30 }]
      const result = validateArray(schema, mixedData, 'TestArray')

      expect(result).toBe(mixedData)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2)
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        1,
        '[validate] TestArray[1]: validation failed',
        expect.any(Object)
      )
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        2,
        '[validate] TestArray[2]: validation failed',
        expect.any(Object)
      )
    })

    it('returns data unchanged and does not log warnings in prod for invalid items', async () => {
      vi.stubEnv('DEV', '' as any) // false
      const { validateArray } = await import('./validate')

      const mixedData = [{ name: 'valid' }, { name: 123 }, { age: 30 }]
      const result = validateArray(schema, mixedData, 'TestArray')

      expect(result).toBe(mixedData)
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('uses "item" as default label if not provided', async () => {
      vi.stubEnv('DEV', 'true' as any)
      const { validateArray } = await import('./validate')

      const invalidData = [{ name: 123 }]
      validateArray(schema, invalidData)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[validate] item[0]: validation failed',
        expect.any(Object)
      )
    })
  })
})
