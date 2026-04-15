import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logDevError, logDevWarn } from '../logDevError'

describe('logDevError', () => {
  const fixedIso = '2023-01-01T00:00:00.000Z'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(fixedIso))
    vi.stubEnv('DEV', true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('logDevError', () => {
    it('harus call logger.error dalam mode DEV dengan context prefix', () => {
      const devSpy = vi.spyOn(console, 'error')
      logDevError('MyComponent', 'error message')

      expect(devSpy).toHaveBeenCalledTimes(1)
      expect(devSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${fixedIso}] [ERROR] [MyComponent]`),
        'error message'
      )
    })

    it('harus handle multiple arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      logDevError('Context', 'arg1', 'arg2', 42)

      expect(devSpy).toHaveBeenCalledTimes(1)
      expect(devSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${fixedIso}] [ERROR] [Context]`),
        'arg1',
        'arg2',
        42
      )
    })

    it('harus handle error objects sebagai arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      const error = new Error('Test error')
      logDevError('ErrorContext', error)

      expect(devSpy).toHaveBeenCalledTimes(1)
      const call = devSpy.mock.calls[0]
      expect(call[0]).toEqual(expect.stringContaining(`[${fixedIso}] [ERROR] [ErrorContext]`))
      expect(call[1]).toBe('Test error')
      expect(call[2]).toEqual(expect.any(String))
      expect(call[3]).toBe(error)
    })

    it('harus prefix dengan context dalam square brackets', () => {
      const devSpy = vi.spyOn(console, 'error')
      logDevError('MyComponent', 'message')

      const firstArg = devSpy.mock.calls[0]?.[0]
      expect(firstArg).toEqual(expect.stringContaining('[ERROR] [MyComponent]'))
    })

    it('harus handle empty context string', () => {
      const devSpy = vi.spyOn(console, 'error')
      logDevError('', 'message')

      expect(devSpy).toHaveBeenCalledTimes(1)
      expect(devSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${fixedIso}] [ERROR] []`),
        'message'
      )
    })

    it('harus handle numeric arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      logDevError('NumberContext', 123, 456.78)

      expect(devSpy).toHaveBeenCalledTimes(1)
      expect(devSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${fixedIso}] [ERROR] [NumberContext]`),
        123,
        456.78
      )
    })

    it('harus handle object arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      const testObj = { key: 'value' }
      logDevError('ObjectContext', testObj)

      expect(devSpy).toHaveBeenCalledTimes(1)
      expect(devSpy).toHaveBeenCalledWith(
        expect.stringContaining(`[${fixedIso}] [ERROR] [ObjectContext]`),
        testObj
      )
    })
  })

  describe('logDevWarn', () => {
    it('harus call logger.warn dalam mode DEV dengan context prefix', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      logDevWarn('MyComponent', 'warning message')

      expect(warnSpy).toHaveBeenCalledTimes(1)
      const call = warnSpy.mock.calls[0]
      expect(call).toHaveLength(1)
      expect(call[0]).toEqual(expect.stringContaining(`[${fixedIso}] [WARN] [MyComponent]`))
      expect(call[0]).toEqual(expect.stringContaining('warning message'))
    })

    it('harus handle multiple arguments', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      logDevWarn('WarnContext', 'arg1', 'arg2', true)

      expect(warnSpy).toHaveBeenCalledTimes(1)
      const call = warnSpy.mock.calls[0]
      expect(call).toHaveLength(1)
      expect(call[0]).toEqual(expect.stringContaining(`[${fixedIso}] [WARN] [WarnContext]`))
      expect(call[0]).toEqual(expect.stringContaining('arg1'))
      expect(call[0]).toEqual(expect.stringContaining('arg2'))
      expect(call[0]).toEqual(expect.stringContaining('true'))
    })

    it('harus prefix dengan context dalam square brackets', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      logDevWarn('MyWarning', 'message')

      const firstArg = warnSpy.mock.calls[0]?.[0]
      expect(firstArg).toEqual(expect.stringContaining('[WARN] [MyWarning]'))
    })

    it('harus handle warning dengan object data', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      const data = { warning: 'data' }
      logDevWarn('DataWarning', data)

      expect(warnSpy).toHaveBeenCalledTimes(1)
      const call = warnSpy.mock.calls[0]
      expect(call).toHaveLength(1)
      expect(call[0]).toEqual(expect.stringContaining(`[${fixedIso}] [WARN] [DataWarning]`))
      expect(call[0]).toEqual(expect.stringContaining('"warning": "data"'))
    })

    it('harus handle multiple arguments dengan different types', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      const obj = { key: 'val' }
      logDevWarn('MixedContext', 'string', 42, obj, true)

      expect(warnSpy).toHaveBeenCalledTimes(1)
      const call = warnSpy.mock.calls[0]
      expect(call).toHaveLength(1)
      expect(call[0]).toEqual(expect.stringContaining(`[${fixedIso}] [WARN] [MixedContext]`))
      expect(call[0]).toEqual(expect.stringContaining('"string"'))
      expect(call[0]).toEqual(expect.stringContaining('42'))
      expect(call[0]).toEqual(expect.stringContaining('"key": "val"'))
      expect(call[0]).toEqual(expect.stringContaining('true'))
    })
  })
})
