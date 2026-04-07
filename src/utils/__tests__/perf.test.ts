import { afterEach, beforeEach, describe, expect, it, type MockInstance,vi } from 'vitest'

import { perfMark, perfMeasure, perfMeasureFrom } from '../perf'

describe('perf', () => {
  let originalPerformance: typeof performance
  let consoleLogSpy: MockInstance<typeof console.log>

  beforeEach(() => {
    // Save the original global object
    originalPerformance = global.performance

    // Mock performance object
    Object.defineProperty(global, 'performance', {
      value: {
        mark: vi.fn(),
        measure: vi.fn().mockReturnValue({ duration: 42 }),
      },
      writable: true,
      configurable: true,
    })

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore the original global object
    Object.defineProperty(global, 'performance', {
      value: originalPerformance,
      writable: true,
      configurable: true,
    })

    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('perfMark', () => {
    it('should call performance.mark if available', () => {
      perfMark('test_mark')
      expect(global.performance.mark).toHaveBeenCalledWith('test_mark')
    })

    it('should not throw if performance is undefined', () => {
      // Temporarily remove performance
      Object.defineProperty(global, 'performance', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      expect(() => perfMark('test_mark')).not.toThrow()
    })
  })

  describe('perfMeasure', () => {
    it('should call performance.measure and return duration', () => {
      const result = perfMeasure('test_measure', 'start_mark', 'end_mark')
      expect(global.performance.measure).toHaveBeenCalledWith('test_measure', 'start_mark', 'end_mark')
      expect(result).toBe(42)
    })

    it('should log to console in DEV mode', () => {
      vi.stubEnv('DEV', 'true')
      vi.stubEnv('PROD', '')

      perfMeasure('test_measure', 'start_mark', 'end_mark')
      expect(consoleLogSpy).toHaveBeenCalledWith('⏱ test_measure: 42ms')
    })

    it('should not log to console in PROD mode', () => {
      vi.stubEnv('DEV', '')
      vi.stubEnv('PROD', 'true')

      perfMeasure('test_measure', 'start_mark', 'end_mark')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should return null if performance.measure throws', () => {
      global.performance.measure = vi.fn().mockImplementation(() => {
        throw new Error('Performance measure failed')
      })

      const result = perfMeasure('test_measure', 'start_mark', 'end_mark')
      expect(result).toBeNull()
    })
  })

  describe('perfMeasureFrom', () => {
    it('should call perfMark and perfMeasure with default endMark', () => {
      const result = perfMeasureFrom('test_measure', 'start_mark')
      expect(global.performance.mark).toHaveBeenCalledWith('tti')
      expect(global.performance.measure).toHaveBeenCalledWith('test_measure', 'start_mark', 'tti')
      expect(result).toBe(42)
    })

    it('should call perfMark and perfMeasure with provided endMark', () => {
      const result = perfMeasureFrom('test_measure', 'start_mark', 'custom_end_mark')
      expect(global.performance.mark).toHaveBeenCalledWith('custom_end_mark')
      expect(global.performance.measure).toHaveBeenCalledWith('test_measure', 'start_mark', 'custom_end_mark')
      expect(result).toBe(42)
    })
  })
})
