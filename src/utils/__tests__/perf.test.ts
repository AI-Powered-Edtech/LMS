import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { logger } from '../logger'
import { PERF, perfMark, perfMeasure, perfMeasureFrom } from '../perf'

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
  },
}))

describe('perf', () => {
  const originalPerformance = global.performance

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DEV', true as any)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    global.performance = originalPerformance
  })

  describe('perfMark', () => {
    it('should call performance.mark if performance is available', () => {
      const mockMark = vi.fn()
      global.performance = { mark: mockMark } as any

      perfMark('test_mark')

      expect(mockMark).toHaveBeenCalledWith('test_mark')
    })

    it('should not throw if performance is undefined', () => {
      global.performance = undefined as any
      expect(() => perfMark('test_mark')).not.toThrow()
    })

    it('should not throw if performance.mark is undefined', () => {
      global.performance = {} as any
      expect(() => perfMark('test_mark')).not.toThrow()
    })
  })

  describe('perfMeasure', () => {
    it('should call performance.measure and log in DEV', () => {
      const mockMeasure = vi.fn().mockReturnValue({ duration: 123.456 })
      global.performance = { measure: mockMeasure } as any

      const result = perfMeasure('test_measure', 'start', 'end')

      expect(mockMeasure).toHaveBeenCalledWith('test_measure', 'start', 'end')
      expect(result).toBe(123.456)
      expect(logger.info).toHaveBeenCalledWith('⏱ test_measure: 123ms')
    })

    it('should not log if not in DEV', () => {
      vi.stubEnv('DEV', false as any)
      const mockMeasure = vi.fn().mockReturnValue({ duration: 123.456 })
      global.performance = { measure: mockMeasure } as any

      const result = perfMeasure('test_measure', 'start', 'end')

      expect(result).toBe(123.456)
      expect(logger.info).not.toHaveBeenCalled()
    })

    it('should return null if performance.measure throws', () => {
      global.performance = {
        measure: vi.fn().mockImplementation(() => {
          throw new Error('Test Error')
        }),
      } as any

      const result = perfMeasure('test_measure', 'start', 'end')

      expect(result).toBeNull()
      expect(logger.info).not.toHaveBeenCalled()
    })
  })

  describe('perfMeasureFrom', () => {
    it('should mark end, then measure from start to end', () => {
      const mockMark = vi.fn()
      const mockMeasure = vi.fn().mockReturnValue({ duration: 42 })
      global.performance = { mark: mockMark, measure: mockMeasure } as any

      const result = perfMeasureFrom('my_measure', 'my_start', 'my_end')

      expect(mockMark).toHaveBeenCalledWith('my_end')
      expect(mockMeasure).toHaveBeenCalledWith('my_measure', 'my_start', 'my_end')
      expect(result).toBe(42)
    })

    it('should default endMark to "tti"', () => {
      const mockMark = vi.fn()
      const mockMeasure = vi.fn().mockReturnValue({ duration: 42 })
      global.performance = { mark: mockMark, measure: mockMeasure } as any

      const result = perfMeasureFrom('my_measure', 'my_start')

      expect(mockMark).toHaveBeenCalledWith('tti')
      expect(mockMeasure).toHaveBeenCalledWith('my_measure', 'my_start', 'tti')
      expect(result).toBe(42)
    })
  })

  describe('PERF object', () => {
    it('should have expected keys and values', () => {
      expect(PERF).toEqual({
        LOGIN_START: 'login_start',
        LOGIN_AUTH_COMPLETE: 'login_auth_complete',
        LOGIN_DASHBOARD_RENDERED: 'login_dashboard_rendered',

        COURSE_NAV_START: 'course_nav_start',
        COURSE_DATA_LOADED: 'course_data_loaded',
        COURSE_RENDERED: 'course_rendered',

        QUIZ_START: 'quiz_start',
        QUIZ_DATA_LOADED: 'quiz_data_loaded',
        QUIZ_SUBMIT: 'quiz_submit',
        QUIZ_GRADED: 'quiz_graded',
      })
    })
  })
})
