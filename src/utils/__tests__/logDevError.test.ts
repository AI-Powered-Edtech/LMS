import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logDevError, logDevWarn } from '../logDevError'

describe('logDevError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logDevError', () => {
    it('harus call logger.error dalam mode DEV dengan context prefix', () => {
      const devSpy = vi.spyOn(console, 'error')
      // Pastikan import.meta.env.DEV adalah true untuk test ini
      if (import.meta.env.DEV) {
        logDevError('MyComponent', 'error message')
        expect(devSpy).toHaveBeenCalledWith('[MyComponent]', 'error message')
      }
    })

    it('harus handle multiple arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      if (import.meta.env.DEV) {
        logDevError('Context', 'arg1', 'arg2', 42)
        expect(devSpy).toHaveBeenCalledWith('[Context]', 'arg1', 'arg2', 42)
      }
    })

    it('harus handle error objects sebagai arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      const error = new Error('Test error')
      if (import.meta.env.DEV) {
        logDevError('ErrorContext', error)
        expect(devSpy).toHaveBeenCalledWith('[ErrorContext]', error)
      }
    })

    it('harus prefix dengan context dalam square brackets', () => {
      const devSpy = vi.spyOn(console, 'error')
      if (import.meta.env.DEV) {
        logDevError('MyComponent', 'message')
        const calls = devSpy.mock.calls
        expect(calls[0][0]).toBe('[MyComponent]')
      }
    })

    it('harus handle empty context string', () => {
      const devSpy = vi.spyOn(console, 'error')
      if (import.meta.env.DEV) {
        logDevError('', 'message')
        expect(devSpy).toHaveBeenCalledWith('[]', 'message')
      }
    })

    it('harus handle numeric arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      if (import.meta.env.DEV) {
        logDevError('NumberContext', 123, 456.78)
        expect(devSpy).toHaveBeenCalledWith('[NumberContext]', 123, 456.78)
      }
    })

    it('harus handle object arguments', () => {
      const devSpy = vi.spyOn(console, 'error')
      const testObj = { key: 'value' }
      if (import.meta.env.DEV) {
        logDevError('ObjectContext', testObj)
        expect(devSpy).toHaveBeenCalledWith('[ObjectContext]', testObj)
      }
    })
  })

  describe('logDevWarn', () => {
    it('harus call logger.warn dalam mode DEV dengan context prefix', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      if (import.meta.env.DEV) {
        logDevWarn('MyComponent', 'warning message')
        expect(warnSpy).toHaveBeenCalledWith('[MyComponent]', 'warning message')
      }
    })

    it('harus handle multiple arguments', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      if (import.meta.env.DEV) {
        logDevWarn('WarnContext', 'arg1', 'arg2', true)
        expect(warnSpy).toHaveBeenCalledWith('[WarnContext]', 'arg1', 'arg2', true)
      }
    })

    it('harus prefix dengan context dalam square brackets', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      if (import.meta.env.DEV) {
        logDevWarn('MyWarning', 'message')
        const calls = warnSpy.mock.calls
        expect(calls[0][0]).toBe('[MyWarning]')
      }
    })

    it('harus handle warning dengan object data', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      const data = { warning: 'data' }
      if (import.meta.env.DEV) {
        logDevWarn('DataWarning', data)
        expect(warnSpy).toHaveBeenCalledWith('[DataWarning]', data)
      }
    })

    it('harus handle multiple arguments dengan different types', () => {
      const warnSpy = vi.spyOn(console, 'warn')
      const obj = { key: 'val' }
      if (import.meta.env.DEV) {
        logDevWarn('MixedContext', 'string', 42, obj, true)
        expect(warnSpy).toHaveBeenCalledWith('[MixedContext]', 'string', 42, obj, true)
      }
    })
  })
})
