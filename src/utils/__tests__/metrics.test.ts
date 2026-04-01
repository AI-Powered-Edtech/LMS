import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trackMetric, measureAsync } from '../metrics'
import { supabase } from '@/src/services/supabase/client'

vi.mock('@/src/services/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
    })),
  },
}))

describe('metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  describe('trackMetric', () => {
    it('tidak mengirim metric di mode DEV', async () => {
      vi.stubEnv('DEV', 'true')

      await trackMetric('page.load_time_ms', 100)

      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('mengirim metric di mode produksi', async () => {
      vi.stubEnv('PROD', 'true')
      vi.stubEnv('DEV', '')
      const insertMock = vi.fn().mockResolvedValue({})
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

      await trackMetric('page.load_time_ms', 100, { path: '/home' })

      expect(supabase.from).toHaveBeenCalledWith('app_metrics')
      expect(insertMock).toHaveBeenCalledWith({
        metric_name: 'page.load_time_ms',
        metric_value: 100,
        metadata: { path: '/home' },
      })
    })

    it('menangani metadata yang tidak diberikan dengan empty object', async () => {
      vi.stubEnv('PROD', 'true')
      vi.stubEnv('DEV', '')
      const insertMock = vi.fn().mockResolvedValue({})
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

      await trackMetric('error.rate', 1)

      expect(supabase.from).toHaveBeenCalledWith('app_metrics')
      expect(insertMock).toHaveBeenCalledWith({
        metric_name: 'error.rate',
        metric_value: 1,
        metadata: {},
      })
    })

    it('menangkap dan mengabaikan error dari supabase secara diam-diam', async () => {
      vi.stubEnv('PROD', 'true')
      vi.stubEnv('DEV', '')
      const insertMock = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

      // Should not throw
      await expect(trackMetric('quiz.completion_rate', 100)).resolves.toBeUndefined()

      expect(supabase.from).toHaveBeenCalledWith('app_metrics')
      expect(insertMock).toHaveBeenCalled()
    })
  })

  describe('measureAsync', () => {
    it('mengukur waktu eksekusi fungsi async dan memanggil trackMetric', async () => {
      vi.stubEnv('PROD', 'true')
      vi.stubEnv('DEV', '')
      const insertMock = vi.fn().mockResolvedValue({})
      vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any)

      // Spy on performance.now
      let time = 0
      vi.spyOn(performance, 'now').mockImplementation(() => {
        const current = time
        time += 150 // Advance time by 150ms on second call
        return current
      })

      const dummyFn = vi.fn().mockResolvedValue('success')

      const result = await measureAsync('api.response_time_ms', dummyFn, { endpoint: '/test' })

      expect(result).toBe('success')
      expect(dummyFn).toHaveBeenCalled()

      expect(supabase.from).toHaveBeenCalledWith('app_metrics')
      expect(insertMock).toHaveBeenCalledWith({
        metric_name: 'api.response_time_ms',
        metric_value: 150,
        metadata: { endpoint: '/test' },
      })

      vi.restoreAllMocks()
    })
  })
})
