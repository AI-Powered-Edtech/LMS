import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PERF, perfMark, perfMeasure, perfMeasureFrom } from '../perf'

describe('perf util', () => {
  beforeEach(() => {

    // Mock performance object
    const mockPerformance = {
      mark: vi.fn(),
      measure: vi.fn().mockReturnValue({ duration: 42.5 }),
    } as unknown as Performance

    vi.stubGlobal('performance', mockPerformance)
    vi.stubEnv('DEV', 'true')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('PERF object', () => {
    it('contains expected constants', () => {
      expect(PERF.LOGIN_START).toBe('login_start')
      expect(PERF.COURSE_NAV_START).toBe('course_nav_start')
      expect(PERF.QUIZ_SUBMIT).toBe('quiz_submit')
    })
  })

  describe('perfMark', () => {
    it('calls performance.mark with the given name', () => {
      perfMark('test_mark')
      expect(performance.mark).toHaveBeenCalledWith('test_mark')
    })

    it('does not throw if performance is undefined', () => {
      vi.stubGlobal('performance', undefined)
      expect(() => perfMark('test_mark')).not.toThrow()
    })

    it('does not throw if performance.mark is undefined', () => {
      vi.stubGlobal('performance', {})
      expect(() => perfMark('test_mark')).not.toThrow()
    })
  })

  describe('perfMeasure', () => {
    it('calls performance.measure and returns duration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const duration = perfMeasure('test_measure', 'start', 'end')

      expect(performance.measure).toHaveBeenCalledWith('test_measure', 'start', 'end')
      expect(duration).toBe(42.5)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('⏱ test_measure: 43ms'))
      consoleSpy.mockRestore()
    })

    it('does not log in production environment', () => {
      vi.stubEnv('DEV', '')
      vi.stubEnv('PROD', 'true')
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      perfMeasure('test_measure', 'start', 'end')

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('returns null if performance.measure throws', () => {
      vi.mocked(performance.measure).mockImplementationOnce(() => {
        throw new Error('Test error')
      })

      const duration = perfMeasure('test_measure', 'start', 'end')
      expect(duration).toBeNull()
    })
  })

  describe('perfMeasureFrom', () => {
    it('calls perfMark and then perfMeasure with default endMark', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const duration = perfMeasureFrom('test_measure_from', 'start')

      expect(performance.mark).toHaveBeenCalledWith('tti')
      expect(performance.measure).toHaveBeenCalledWith('test_measure_from', 'start', 'tti')
      expect(duration).toBe(42.5)

      consoleSpy.mockRestore()
    })

    it('calls perfMark and then perfMeasure with custom endMark', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const duration = perfMeasureFrom('test_measure_from', 'start', 'custom_end')

      expect(performance.mark).toHaveBeenCalledWith('custom_end')
      expect(performance.measure).toHaveBeenCalledWith('test_measure_from', 'start', 'custom_end')
      expect(duration).toBe(42.5)

      consoleSpy.mockRestore()
    })
  })
})
