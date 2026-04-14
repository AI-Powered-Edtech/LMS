import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { perfMark, perfMeasure, perfMeasureFrom, PERF } from '../perf'
import { logger } from '../logger'

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('perf constants', () => {
  it('exports PERF constants', () => {
    expect(PERF).toBeDefined()
    expect(PERF.LOGIN_START).toBe('login_start')
  })
})

describe('perfMark', () => {
  let originalPerformance: typeof global.performance | undefined

  beforeEach(() => {
    originalPerformance = global.performance
  })

  afterEach(() => {
    vi.restoreAllMocks()
    if (originalPerformance !== undefined) {
      global.performance = originalPerformance
    } else {
      // @ts-ignore
      delete global.performance
    }
  })

  it('calls performance.mark when available', () => {
    const markMock = vi.fn()
    global.performance = { mark: markMock } as any

    perfMark('test_mark')
    expect(markMock).toHaveBeenCalledWith('test_mark')
  })

  it('does nothing gracefully if performance is undefined', () => {
    // @ts-ignore
    delete global.performance

    expect(() => perfMark('test_mark')).not.toThrow()
  })

  it('does nothing gracefully if performance.mark is missing', () => {
    global.performance = {} as any

    expect(() => perfMark('test_mark')).not.toThrow()
  })
})

describe('perfMeasure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('DEV', true as any)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('calls performance.measure, returns duration, and logs info in DEV', () => {
    const measureMock = vi.fn().mockReturnValue({ duration: 150 })
    global.performance = { measure: measureMock } as any

    const result = perfMeasure('test_measure', 'start', 'end')

    expect(measureMock).toHaveBeenCalledWith('test_measure', 'start', 'end')
    expect(result).toBe(150)
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('⏱ test_measure: 150ms'))
  })

  it('returns null on measurement error', () => {
    const measureMock = vi.fn().mockImplementation(() => {
      throw new Error('Measurement failed')
    })
    global.performance = { measure: measureMock } as any

    const result = perfMeasure('test_measure', 'start', 'end')

    expect(result).toBeNull()
    expect(logger.info).not.toHaveBeenCalled()
  })

  it('does not log if not DEV', () => {
    vi.stubEnv('DEV', false as any)
    const measureMock = vi.fn().mockReturnValue({ duration: 150 })
    global.performance = { measure: measureMock } as any

    const result = perfMeasure('test_measure', 'start', 'end')

    expect(result).toBe(150)
    expect(logger.info).not.toHaveBeenCalled()
  })
})

describe('perfMeasureFrom', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('marks endMark, measures, and defaults endMark to "tti"', () => {
    const markMock = vi.fn()
    const measureMock = vi.fn().mockReturnValue({ duration: 200 })
    global.performance = { mark: markMock, measure: measureMock } as any

    const result = perfMeasureFrom('test_measure_from', 'start')

    expect(markMock).toHaveBeenCalledWith('tti')
    expect(measureMock).toHaveBeenCalledWith('test_measure_from', 'start', 'tti')
    expect(result).toBe(200)
  })

  it('uses custom endMark appropriately', () => {
    const markMock = vi.fn()
    const measureMock = vi.fn().mockReturnValue({ duration: 250 })
    global.performance = { mark: markMock, measure: measureMock } as any

    const result = perfMeasureFrom('test_measure_from_custom', 'start', 'custom_end')

    expect(markMock).toHaveBeenCalledWith('custom_end')
    expect(measureMock).toHaveBeenCalledWith('test_measure_from_custom', 'start', 'custom_end')
    expect(result).toBe(250)
  })
})
