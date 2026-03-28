import { describe, expect, it } from 'vitest'

import { getCountdown } from '../calendarUtils'

describe('getCountdown', () => {
  it('returns "Hari ini" when event is on the same day', () => {
    const today = new Date('2024-03-20T10:00:00')
    const eventDate = new Date('2024-03-20T15:00:00')
    expect(getCountdown(eventDate, today)).toBe('Hari ini')
  })

  it('returns "Besok" when event is the next day', () => {
    const today = new Date('2024-03-20T10:00:00')
    const eventDate = new Date('2024-03-21T10:00:00')
    expect(getCountdown(eventDate, today)).toBe('Besok')
  })

  it('returns "H-X" when event is 2-7 days away', () => {
    const today = new Date('2024-03-20T10:00:00')

    // 2 days
    expect(getCountdown(new Date('2024-03-22T10:00:00'), today)).toBe('H-2')
    // 3 days
    expect(getCountdown(new Date('2024-03-23T10:00:00'), today)).toBe('H-3')
    // 7 days
    expect(getCountdown(new Date('2024-03-27T10:00:00'), today)).toBe('H-7')
  })

  it('returns null when event is more than 7 days away', () => {
    const today = new Date('2024-03-20T10:00:00')
    const eventDate = new Date('2024-03-28T10:00:00')
    expect(getCountdown(eventDate, today)).toBeNull()
  })

  it('returns null when event is in the past', () => {
    const today = new Date('2024-03-20T10:00:00')
    const eventDate = new Date('2024-03-19T10:00:00')
    expect(getCountdown(eventDate, today)).toBeNull()
  })

  it('handles timezone/time differences correctly (edge case: next day but less than 24 hours)', () => {
    const today = new Date('2024-03-20T15:00:00')
    const eventDate = new Date('2024-03-21T09:00:00')
    // This represents a difference of 18 hours, but they are on different dates so it's 'Besok'
    expect(getCountdown(eventDate, today)).toBe('Besok')
  })

  it('handles timezone/time differences correctly (edge case: exactly same time)', () => {
    const today = new Date('2024-03-20T10:00:00')
    const eventDate = new Date('2024-03-20T10:00:00')
    expect(getCountdown(eventDate, today)).toBe('Hari ini')
  })
})
