import { beforeEach, describe, expect, it, vi } from 'vitest'

import { struggleService } from '../api/struggleService'

const mockRpc = vi.fn()

vi.mock('@/services/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('struggleService.getStruggleConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_struggle_config RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    await struggleService.getStruggleConfig('tenant-1')
    expect(mockRpc).toHaveBeenCalledWith('get_struggle_config')
  })

  it('returns config data', async () => {
    const config = { threshold_medium: 3, threshold_high: 5, notification_enabled: true }
    mockRpc.mockResolvedValue({ data: config, error: null })
    const result = await struggleService.getStruggleConfig('tenant-1')
    expect(result).toEqual(config)
  })

  it('returns null when no config', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const result = await struggleService.getStruggleConfig('tenant-1')
    expect(result).toBeNull()
  })

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })
    await expect(struggleService.getStruggleConfig('tenant-1')).rejects.toMatchObject({
      message: 'RPC failed',
    })
  })
})

describe('struggleService.getStruggleAlerts', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls get_struggle_alerts RPC with defaults', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await struggleService.getStruggleAlerts('tenant-1')
    expect(mockRpc).toHaveBeenCalledWith('get_struggle_alerts', {
      p_unread_only: false,
      p_course_id: null,
      p_limit: 50,
    })
  })

  it('passes unreadOnly option', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await struggleService.getStruggleAlerts('tenant-1', { unreadOnly: true })
    expect(mockRpc).toHaveBeenCalledWith(
      'get_struggle_alerts',
      expect.objectContaining({
        p_unread_only: true,
      })
    )
  })

  it('passes courseId option', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await struggleService.getStruggleAlerts('tenant-1', { courseId: 'course-1' })
    expect(mockRpc).toHaveBeenCalledWith(
      'get_struggle_alerts',
      expect.objectContaining({
        p_course_id: 'course-1',
      })
    )
  })

  it('returns struggle alerts array', async () => {
    const alerts = [{ id: 'a1', student_id: 'u1', severity: 'high' }]
    mockRpc.mockResolvedValue({ data: alerts, error: null })
    const result = await struggleService.getStruggleAlerts('tenant-1')
    expect(result).toEqual(alerts)
  })

  it('returns empty array when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const result = await struggleService.getStruggleAlerts('tenant-1')
    expect(result).toEqual([])
  })

  it('throws on error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } })
    await expect(struggleService.getStruggleAlerts('tenant-1')).rejects.toMatchObject({
      message: 'Permission denied',
    })
  })
})

describe('struggleService.updateStruggleConfig', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls update_struggle_config RPC with updates', async () => {
    mockRpc.mockResolvedValue({ error: null })
    await struggleService.updateStruggleConfig('tenant-1', {
      threshold_medium: 3,
      threshold_high: 7,
    })
    expect(mockRpc).toHaveBeenCalledWith(
      'update_struggle_config',
      expect.objectContaining({
        p_threshold_medium: 3,
        p_threshold_high: 7,
      })
    )
  })

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'Update failed' } })
    await expect(
      struggleService.updateStruggleConfig('tenant-1', { threshold_medium: 3 })
    ).rejects.toMatchObject({ message: 'Update failed' })
  })
})
