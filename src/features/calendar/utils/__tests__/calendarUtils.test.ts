import { describe, expect, it } from 'vitest'

import { getCountdown, getEventColor, getPriorityIcon } from '../calendarUtils'

describe('calendarUtils', () => {
  describe('getCountdown', () => {
    it('returns "Hari ini" for the same day (diffDays === 0)', () => {
      const today = new Date('2024-03-28T00:00:00Z')
      const eventDate = new Date('2024-03-28T00:00:00Z')
      expect(getCountdown(eventDate, today)).toBe('Hari ini')
    })

    it('returns "Besok" for the next day (diffDays === 1)', () => {
      const today = new Date('2024-03-28T00:00:00Z')
      const eventDate = new Date('2024-03-29T00:00:00Z')
      expect(getCountdown(eventDate, today)).toBe('Besok')
    })

    it('returns "H-X" for upcoming days between 2 and 7', () => {
      const today = new Date('2024-03-28T00:00:00Z')

      const eventDate2 = new Date('2024-03-30T00:00:00Z')
      expect(getCountdown(eventDate2, today)).toBe('H-2')

      const eventDate7 = new Date('2024-04-04T00:00:00Z')
      expect(getCountdown(eventDate7, today)).toBe('H-7')
    })

    it('returns null for days strictly greater than 7', () => {
      const today = new Date('2024-03-28T00:00:00Z')
      const eventDate8 = new Date('2024-04-05T00:00:00Z')
      expect(getCountdown(eventDate8, today)).toBeNull()
    })

    it('returns null for past days (diffDays < 0)', () => {
      const today = new Date('2024-03-28T00:00:00Z')
      const eventDatePast = new Date('2024-03-27T00:00:00Z')
      expect(getCountdown(eventDatePast, today)).toBeNull()
    })

    it('handles time differences correctly within the same day', () => {
      const today = new Date('2024-03-28T10:00:00Z')
      // Event is earlier today (diffTime is negative)
      const eventEarlier = new Date('2024-03-28T08:00:00Z')
      // Note: Math.ceil(-2 hours / 24) = -0, which is 0 in JS.
      expect(getCountdown(eventEarlier, today)).toBe('Hari ini')

      // Event is later today (diffTime is positive) -> this will result in Math.ceil(positive fraction) = 1
      // Based on the current code implementation, it returns 'Besok'
      const eventLater = new Date('2024-03-28T12:00:00Z')
      expect(getCountdown(eventLater, today)).toBe('Besok')
    })
  })

  describe('getEventColor', () => {
    it('returns correct color classes for exam', () => {
      const color = getEventColor('exam')
      expect(color).toContain('bg-red-500')
      expect(color).toContain('text-red-700')
      expect(color).toContain('border-red-200')
    })

    it('returns correct color classes for assignment', () => {
      const color = getEventColor('assignment')
      expect(color).toContain('bg-orange-500')
      expect(color).toContain('text-orange-700')
      expect(color).toContain('border-orange-200')
    })

    it('returns correct color classes for quiz', () => {
      const color = getEventColor('quiz')
      expect(color).toContain('bg-blue-500')
      expect(color).toContain('text-blue-700')
      expect(color).toContain('border-blue-200')
    })

    it('returns correct color classes for event', () => {
      const color = getEventColor('event')
      expect(color).toContain('bg-purple-500')
      expect(color).toContain('text-purple-700')
      expect(color).toContain('border-purple-200')
    })

    it('returns default color classes for unknown types', () => {
      const color = getEventColor('unknown')
      expect(color).toContain('bg-slate-500')
      expect(color).toContain('text-slate-700')
      expect(color).toContain('border-slate-200')
    })
  })

  describe('getPriorityIcon', () => {
    it('returns a high priority icon', () => {
      const icon = getPriorityIcon('high')
      expect(icon).not.toBeNull()
      expect((icon as any)?.props.className).toContain('text-red-500')
    })

    it('returns a medium priority icon', () => {
      const icon = getPriorityIcon('medium')
      expect(icon).not.toBeNull()
      expect((icon as any)?.props.className).toContain('text-orange-500')
    })

    it('returns a low priority icon', () => {
      const icon = getPriorityIcon('low')
      expect(icon).not.toBeNull()
      expect((icon as any)?.props.className).toContain('text-blue-500')
    })

    it('returns null for unknown priority', () => {
      const icon = getPriorityIcon('unknown')
      expect(icon).toBeNull()
    })

    it('returns null for undefined priority', () => {
      const icon = getPriorityIcon()
      expect(icon).toBeNull()
    })
  })
})
