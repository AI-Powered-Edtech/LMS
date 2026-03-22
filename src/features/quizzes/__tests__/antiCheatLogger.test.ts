import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAntiCheatLogger } from '../utils/antiCheatLogger'

describe('antiCheatLogger', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('starts with zero events', () => {
    const logger = createAntiCheatLogger('attempt-1')
    expect(logger.getEventCount()).toBe(0)
    expect(logger.getEvents()).toEqual([])
  })

  it('logs events and increments count', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH')
    logger.log('WINDOW_BLUR')
    expect(logger.getEventCount()).toBe(2)
  })

  it('tracks events by type', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH')
    logger.log('TAB_SWITCH')
    logger.log('WINDOW_BLUR')
    expect(logger.getEventCountByType('TAB_SWITCH')).toBe(2)
    expect(logger.getEventCountByType('WINDOW_BLUR')).toBe(1)
    expect(logger.getEventCountByType('COPY_PASTE')).toBe(0)
  })

  it('stores metadata with events', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH', { duration_ms: 5000 })
    const events = logger.getEvents()
    expect(events[0].metadata).toEqual({ duration_ms: 5000 })
  })

  it('returns frozen array from getEvents', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH')
    const events = logger.getEvents()
    expect(Object.isFrozen(events)).toBe(true)
  })

  // ─── Summary ────────────────────────────────────

  it('summary shows "none" severity for 0 events', () => {
    const logger = createAntiCheatLogger('attempt-1')
    const summary = logger.getSummary()
    expect(summary.attemptId).toBe('attempt-1')
    expect(summary.totalEvents).toBe(0)
    expect(summary.severityLevel).toBe('none')
    expect(summary.firstEventAt).toBeNull()
    expect(summary.lastEventAt).toBeNull()
  })

  it('summary shows "low" severity for 1 tab switch', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH')
    expect(logger.getSummary().severityLevel).toBe('low')
  })

  it('summary shows "medium" severity for 3+ tab-switch-like events', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH')
    logger.log('TAB_SWITCH')
    logger.log('WINDOW_BLUR')
    expect(logger.getSummary().severityLevel).toBe('medium')
  })

  it('summary shows "high" severity for 5+ tab-switch-like events', () => {
    const logger = createAntiCheatLogger('attempt-1')
    for (let i = 0; i < 5; i++) logger.log('TAB_SWITCH')
    expect(logger.getSummary().severityLevel).toBe('high')
  })

  it('summary tracks first and last event timestamps', () => {
    const logger = createAntiCheatLogger('attempt-1')
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'))
    logger.log('TAB_SWITCH')
    vi.setSystemTime(new Date('2026-01-01T10:05:00Z'))
    logger.log('WINDOW_BLUR')

    const summary = logger.getSummary()
    expect(summary.firstEventAt).toBe('2026-01-01T10:00:00.000Z')
    expect(summary.lastEventAt).toBe('2026-01-01T10:05:00.000Z')
  })

  // ─── Flush & Reset ──────────────────────────────

  it('flush returns all events and clears buffer', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH')
    logger.log('WINDOW_BLUR')

    const flushed = logger.flush()
    expect(flushed).toHaveLength(2)
    expect(logger.getEventCount()).toBe(0)
  })

  it('reset clears all events', () => {
    const logger = createAntiCheatLogger('attempt-1')
    logger.log('TAB_SWITCH')
    logger.reset()
    expect(logger.getEventCount()).toBe(0)
  })

  // ─── Auto-flush ─────────────────────────────────

  it('auto-flushes when buffer is full', () => {
    const onBufferFull = vi.fn()
    const logger = createAntiCheatLogger('attempt-1', {
      maxBufferSize: 3,
      onBufferFull,
    })

    logger.log('TAB_SWITCH')
    logger.log('WINDOW_BLUR')
    expect(onBufferFull).not.toHaveBeenCalled()

    logger.log('COPY_PASTE') // 3rd event triggers flush
    expect(onBufferFull).toHaveBeenCalledOnce()
    expect(onBufferFull.mock.calls[0][0]).toHaveLength(3)
    expect(logger.getEventCount()).toBe(0) // buffer cleared
  })
})
