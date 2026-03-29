import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatPct,
  formatTime,
  pctBgColor,
  pctColor,
  relativeTime,
  struggleColor,
} from '../formatters'

describe('formatters', () => {
  describe('formatTime', () => {
    it('formats seconds less than 60', () => {
      expect(formatTime(0)).toBe('0d')
      expect(formatTime(45)).toBe('45d')
      expect(formatTime(59)).toBe('59d')
    })

    it('formats minutes and seconds less than an hour', () => {
      expect(formatTime(60)).toBe('1m')
      expect(formatTime(65)).toBe('1m 5d')
      expect(formatTime(119)).toBe('1m 59d')
      expect(formatTime(3599)).toBe('59m 59d')
    })

    it('formats hours and minutes', () => {
      expect(formatTime(3600)).toBe('1j')
      expect(formatTime(3660)).toBe('1j 1m')
      expect(formatTime(7200)).toBe('2j')
      expect(formatTime(7380)).toBe('2j 3m')
      expect(formatTime(86400)).toBe('24j')
    })
  })

  describe('formatPct', () => {
    it('returns "-" for null or undefined', () => {
      expect(formatPct(null)).toBe('-')
      expect(formatPct(undefined)).toBe('-')
    })

    it('formats numbers to percentages rounded to 1 decimal place', () => {
      expect(formatPct(0)).toBe('0%')
      expect(formatPct(50)).toBe('50%')
      expect(formatPct(100)).toBe('100%')
      expect(formatPct(33.333)).toBe('33.3%')
      expect(formatPct(66.666)).toBe('66.7%')
      expect(formatPct(99.99)).toBe('100%')
    })
  })

  describe('relativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      // Set a fixed 'now' time
      vi.setSystemTime(new Date('2023-10-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns "-" for falsy inputs', () => {
      expect(relativeTime(null)).toBe('-')
      expect(relativeTime('')).toBe('-')
    })

    it('formats times less than a minute ago as "Baru saja"', () => {
      const then = new Date('2023-10-15T11:59:30Z') // 30 seconds ago
      expect(relativeTime(then.toISOString())).toBe('Baru saja')
    })

    it('formats times less than an hour ago in minutes', () => {
      const then1 = new Date('2023-10-15T11:59:00Z') // 1 min ago
      const then45 = new Date('2023-10-15T11:15:00Z') // 45 mins ago
      expect(relativeTime(then1.toISOString())).toBe('1 menit lalu')
      expect(relativeTime(then45.toISOString())).toBe('45 menit lalu')
    })

    it('formats times less than a day ago in hours', () => {
      const then1 = new Date('2023-10-15T11:00:00Z') // 1 hour ago
      const then23 = new Date('2023-10-14T13:00:00Z') // 23 hours ago
      expect(relativeTime(then1.toISOString())).toBe('1 jam lalu')
      expect(relativeTime(then23.toISOString())).toBe('23 jam lalu')
    })

    it('formats times less than a week ago in days', () => {
      const then1 = new Date('2023-10-14T12:00:00Z') // 1 day ago
      const then6 = new Date('2023-10-09T12:00:00Z') // 6 days ago
      expect(relativeTime(then1.toISOString())).toBe('1 hari lalu')
      expect(relativeTime(then6.toISOString())).toBe('6 hari lalu')
    })

    it('formats older times as localized dates', () => {
      const then7 = new Date('2023-10-08T12:00:00Z') // 7 days ago
      const thenMonth = new Date('2023-09-15T12:00:00Z') // 1 month ago
      // Localized depending on system, testing exact format depends on ID locale output.
      // Often looks like "8 Okt" or "15 Sep" depending on exact ID formatting
      const expected7 = then7.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      const expectedMonth = thenMonth.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      })

      expect(relativeTime(then7.toISOString())).toBe(expected7)
      expect(relativeTime(thenMonth.toISOString())).toBe(expectedMonth)
    })
  })

  describe('pctColor', () => {
    it('returns green colors for values >= 80', () => {
      expect(pctColor(80)).toBe('text-emerald-600 dark:text-emerald-400')
      expect(pctColor(100)).toBe('text-emerald-600 dark:text-emerald-400')
    })

    it('returns amber colors for values >= 50 and < 80', () => {
      expect(pctColor(50)).toBe('text-amber-600 dark:text-amber-400')
      expect(pctColor(79.9)).toBe('text-amber-600 dark:text-amber-400')
    })

    it('returns red colors for values < 50', () => {
      expect(pctColor(49.9)).toBe('text-red-600 dark:text-red-400')
      expect(pctColor(0)).toBe('text-red-600 dark:text-red-400')
      expect(pctColor(-10)).toBe('text-red-600 dark:text-red-400')
    })
  })

  describe('pctBgColor', () => {
    it('returns green background for values >= 80', () => {
      expect(pctBgColor(80)).toBe('bg-emerald-500')
      expect(pctBgColor(100)).toBe('bg-emerald-500')
    })

    it('returns amber background for values >= 50 and < 80', () => {
      expect(pctBgColor(50)).toBe('bg-amber-500')
      expect(pctBgColor(79.9)).toBe('bg-amber-500')
    })

    it('returns red background for values < 50', () => {
      expect(pctBgColor(49.9)).toBe('bg-red-500')
      expect(pctBgColor(0)).toBe('bg-red-500')
      expect(pctBgColor(-10)).toBe('bg-red-500')
    })
  })

  describe('struggleColor', () => {
    it('returns High Risk (Risiko Tinggi) formatting for scores >= 5', () => {
      const result5 = struggleColor(5)
      expect(result5).toEqual({
        text: 'text-red-700 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
        label: 'Risiko Tinggi',
      })

      const result10 = struggleColor(10)
      expect(result10.label).toBe('Risiko Tinggi')
    })

    it('returns Struggling (Kesulitan) formatting for scores >= 3 and < 5', () => {
      const result3 = struggleColor(3)
      expect(result3).toEqual({
        text: 'text-amber-700 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        label: 'Kesulitan',
      })

      const result4_9 = struggleColor(4.9)
      expect(result4_9.label).toBe('Kesulitan')
    })

    it('returns Normal formatting for scores < 3', () => {
      const result2_9 = struggleColor(2.9)
      expect(result2_9).toEqual({
        text: 'text-emerald-700 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        label: 'Normal',
      })

      const result0 = struggleColor(0)
      expect(result0.label).toBe('Normal')

      const resultNegative = struggleColor(-1)
      expect(resultNegative.label).toBe('Normal')
    })
  })
})
