import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { perfMark, perfMeasure, perfMeasureFrom } from '../perf'
import { logger } from '@/utils/logger'

describe('perf', () => {
  const originalPerformance = global.performance

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('DEV', true as any)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    global.performance = originalPerformance
  })

  describe('perfMark', () => {
    it('calls performance.mark if it exists', () => {
      const markMock = vi.fn()
      vi.stubGlobal('performance', { mark: markMock })

      perfMark('test_mark')
      expect(markMock).toHaveBeenCalledWith('test_mark')
    })

    it('does not throw if performance does not exist', () => {
      vi.stubGlobal('performance', undefined)

      expect(() => perfMark('test_mark')).not.toThrow()
    })

    it('does not throw if performance.mark does not exist', () => {
      vi.stubGlobal('performance', {})

      expect(() => perfMark('test_mark')).not.toThrow()
    })
  })

  describe('perfMeasure', () => {
    it('calls performance.measure and returns duration', () => {
      const measureMock = vi.fn().mockReturnValue({ duration: 123.45 })
      vi.stubGlobal('performance', { measure: measureMock })
      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})

      const result = perfMeasure('test_measure', 'start', 'end')

      expect(measureMock).toHaveBeenCalledWith('test_measure', 'start', 'end')
      expect(result).toBe(123.45)
      expect(infoSpy).toHaveBeenCalledWith('⏱ test_measure: 123ms')
    })

    it('does not log in non-DEV environment', () => {
      vi.stubEnv('DEV', false as any)
      const measureMock = vi.fn().mockReturnValue({ duration: 123.45 })
      vi.stubGlobal('performance', { measure: measureMock })
      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})

      const result = perfMeasure('test_measure', 'start', 'end')

      expect(measureMock).toHaveBeenCalledWith('test_measure', 'start', 'end')
      expect(result).toBe(123.45)
      expect(infoSpy).not.toHaveBeenCalled()
    })

    it('returns null if performance.measure throws', () => {
      vi.stubGlobal('performance', {
        measure: () => {
          throw new Error('measure failed')
        },
      })
      const infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})

      const result = perfMeasure('test_measure', 'start', 'end')

      expect(result).toBeNull()
      expect(infoSpy).not.toHaveBeenCalled()
    })
  })

  describe('perfMeasureFrom', () => {
    it('calls perfMark and then perfMeasure with default endMark', () => {
      const markMock = vi.fn()
      const measureMock = vi.fn().mockReturnValue({ duration: 42 })
      vi.stubGlobal('performance', { mark: markMock, measure: measureMock })

      const result = perfMeasureFrom('test_measure_from', 'start')

      expect(markMock).toHaveBeenCalledWith('tti')
      expect(measureMock).toHaveBeenCalledWith('test_measure_from', 'start', 'tti')
      expect(result).toBe(42)
    })

    it('calls perfMark and then perfMeasure with provided endMark', () => {
      const markMock = vi.fn()
      const measureMock = vi.fn().mockReturnValue({ duration: 42 })
      vi.stubGlobal('performance', { mark: markMock, measure: measureMock })

      const result = perfMeasureFrom('test_measure_from', 'start', 'custom_end')

      expect(markMock).toHaveBeenCalledWith('custom_end')
      expect(measureMock).toHaveBeenCalledWith('test_measure_from', 'start', 'custom_end')
      expect(result).toBe(42)
    })
  })
})
