import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { relativeTime } from '../struggleHelpers'

describe('relativeTime', () => {
  beforeEach(() => {
    // Set a fixed system time so tests are deterministic
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Baru saja" for times less than 1 minute ago', () => {
    // 29 seconds ago (Math.round(29000 / 60000) = 0, so mins < 1)
    const time = new Date(Date.now() - 29 * 1000).toISOString()
    expect(relativeTime(time)).toBe('Baru saja')

    // Exactly now
    const now = new Date(Date.now()).toISOString()
    expect(relativeTime(now)).toBe('Baru saja')
  })

  it('returns "[x] menit lalu" for times between 1 and 59 minutes ago', () => {
    // 1 minute ago
    const oneMin = new Date(Date.now() - 60 * 1000).toISOString()
    expect(relativeTime(oneMin)).toBe('1 menit lalu')

    // 5 minutes ago
    const fiveMins = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(relativeTime(fiveMins)).toBe('5 menit lalu')

    // 59 minutes ago
    const fiftyNineMins = new Date(Date.now() - 59 * 60 * 1000).toISOString()
    expect(relativeTime(fiftyNineMins)).toBe('59 menit lalu')
  })

  it('returns "[x] jam lalu" for times between 1 and 23 hours ago', () => {
    // 1 hour ago
    const oneHour = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    expect(relativeTime(oneHour)).toBe('1 jam lalu')

    // 12 hours ago
    const twelveHours = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(twelveHours)).toBe('12 jam lalu')

    // 23 hours ago
    const twentyThreeHours = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(twentyThreeHours)).toBe('23 jam lalu')
  })

  it('returns "[x] hari lalu" for times 24 hours or more ago', () => {
    // 1 day ago (24 hours)
    const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(oneDay)).toBe('1 hari lalu')

    // 5 days ago
    const fiveDays = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(fiveDays)).toBe('5 hari lalu')

    // 30 days ago
    const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    expect(relativeTime(thirtyDays)).toBe('30 hari lalu')
  })
})
