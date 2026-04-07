import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '@/services/supabase/client'

import { measureAsync, trackMetric } from '../metrics'

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('metrics', () => {
  const originalEnv = import.meta.env
  const mockInsert = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(supabase.from).mockReturnValue({ insert: mockInsert } as any)
  })

  afterEach(() => {
    vi.stubEnv('DEV', originalEnv.DEV as any)
    vi.stubEnv('PROD', originalEnv.PROD as any)
  })

  describe('trackMetric', () => {
    it('should return early and do nothing if in DEV mode', async () => {
      vi.stubEnv('DEV', true)
      vi.stubEnv('PROD', false)

      await trackMetric('page.load_time_ms', 100)

      expect(supabase.from).not.toHaveBeenCalled()
      expect(mockInsert).not.toHaveBeenCalled()
    })

    it('should insert into supabase app_metrics in PROD mode', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)

      await trackMetric('page.load_time_ms', 100)

      expect(supabase.from).toHaveBeenCalledWith('app_metrics')
      expect(mockInsert).toHaveBeenCalledWith({
        metric_name: 'page.load_time_ms',
        metric_value: 100,
        metadata: {},
      })
    })

    it('should insert into supabase app_metrics with metadata in PROD mode', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)

      await trackMetric('error.rate', 1, { errorCode: '404' })

      expect(supabase.from).toHaveBeenCalledWith('app_metrics')
      expect(mockInsert).toHaveBeenCalledWith({
        metric_name: 'error.rate',
        metric_value: 1,
        metadata: { errorCode: '404' },
      })
    })

    it('should silently catch and ignore errors from supabase in PROD mode', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)

      mockInsert.mockRejectedValue(new Error('Supabase error'))

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Should not throw
      await expect(trackMetric('page.load_time_ms', 100)).resolves.toBeUndefined()

      // Should not console.warn in PROD mode
      expect(consoleWarnSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })
  })

  describe('measureAsync', () => {
    it('should return the result of the async function', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)

      const result = await measureAsync('api.response_time_ms', async () => {
        return 'success'
      })

      expect(result).toBe('success')
    })

    it('should measure and track the duration of the async function', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)

      const originalPerformanceNow = performance.now

      let nowValue = 1000
      vi.spyOn(performance, 'now').mockImplementation(() => {
        const val = nowValue
        nowValue += 50 // increment by 50ms each call
        return val
      })

      await measureAsync('api.response_time_ms', async () => {
        return 'success'
      })

      expect(supabase.from).toHaveBeenCalledWith('app_metrics')
      expect(mockInsert).toHaveBeenCalledWith({
        metric_name: 'api.response_time_ms',
        metric_value: 50,
        metadata: {},
      })

      vi.spyOn(performance, 'now').mockImplementation(originalPerformanceNow)
    })
  })
})
