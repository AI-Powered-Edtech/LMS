import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard
} from '../clientCompute'

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('returns level 1 for < 100 XP', () => {
      expect(computeLevel(0)).toBe(1)
      expect(computeLevel(99)).toBe(1)
    })

    it('returns correct levels for exact thresholds', () => {
      expect(computeLevel(100)).toBe(2)
      expect(computeLevel(250)).toBe(3)
      expect(computeLevel(500)).toBe(4)
      expect(computeLevel(1000)).toBe(5)
      expect(computeLevel(2000)).toBe(6)
      expect(computeLevel(3500)).toBe(7)
      expect(computeLevel(5500)).toBe(8)
      expect(computeLevel(8000)).toBe(9)
      expect(computeLevel(12000)).toBe(10)
    })

    it('returns max level (10) for >= 12000 XP', () => {
      expect(computeLevel(12001)).toBe(10)
      expect(computeLevel(50000)).toBe(10)
    })
  })

  describe('computeXPToNextLevel', () => {
    it('returns correct values for level 1', () => {
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50
      })
    })

    it('handles exact threshold values', () => {
      expect(computeXPToNextLevel(100)).toEqual({
        current: 0,
        needed: 150, // 250 - 100
        pct: 0
      })
    })

    it('handles values between thresholds', () => {
      expect(computeXPToNextLevel(200)).toEqual({
        current: 100,
        needed: 150, // 250 - 100
        pct: 67 // Math.round((100 / 150) * 100) = 67
      })
    })

    it('returns needed: 0 and pct: 100 for max level (>= 12000)', () => {
      expect(computeXPToNextLevel(12000)).toEqual({
        current: 0, // 12000 - 12000
        needed: 0,
        pct: 100
      })
      expect(computeXPToNextLevel(15000)).toEqual({
        current: 3000,
        needed: 0,
        pct: 100
      })
    })
  })

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-10T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 0 for empty array', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
    })

    it('returns 1 if most recent completion is today', () => {
      expect(calculateStreak([{ completed_at: '2024-01-10T08:00:00Z' }])).toEqual({ current: 1, longest: 1 })
    })

    it('returns 1 if most recent completion is yesterday', () => {
      expect(calculateStreak([{ completed_at: '2024-01-09T08:00:00Z' }])).toEqual({ current: 1, longest: 1 })
    })

    it('returns 0 current streak if most recent completion is older than yesterday', () => {
      expect(calculateStreak([
        { completed_at: '2024-01-08T08:00:00Z' },
        { completed_at: '2024-01-07T08:00:00Z' }
      ])).toEqual({ current: 0, longest: 2 })
    })

    it('calculates streaks correctly with consecutive days', () => {
      expect(calculateStreak([
        { completed_at: '2024-01-10T08:00:00Z' },
        { completed_at: '2024-01-09T08:00:00Z' },
        { completed_at: '2024-01-08T08:00:00Z' }
      ])).toEqual({ current: 3, longest: 3 })
    })

    it('ignores multiple completions on the same day', () => {
      expect(calculateStreak([
        { completed_at: '2024-01-10T08:00:00Z' },
        { completed_at: '2024-01-10T09:00:00Z' },
        { completed_at: '2024-01-09T08:00:00Z' }
      ])).toEqual({ current: 2, longest: 2 })
    })

    it('calculates longest streak correctly with gap days', () => {
      expect(calculateStreak([
        { completed_at: '2024-01-10T08:00:00Z' }, // current = 1
        { completed_at: '2024-01-08T08:00:00Z' }, // gap
        { completed_at: '2024-01-07T08:00:00Z' }, // run = 2
        { completed_at: '2024-01-06T08:00:00Z' }, // run = 3
        { completed_at: '2024-01-04T08:00:00Z' }  // gap
      ])).toEqual({ current: 1, longest: 3 })
    })

    it('handles unsorted input dates correctly', () => {
      expect(calculateStreak([
        { completed_at: '2024-01-09T08:00:00Z' },
        { completed_at: '2024-01-10T08:00:00Z' },
        { completed_at: '2024-01-08T08:00:00Z' }
      ])).toEqual({ current: 3, longest: 3 })
    })
  })

  describe('rankLeaderboard', () => {
    it('sorts by xp descending by default', () => {
      const students = [
        { id: '1', total_xp: 100 },
        { id: '2', total_xp: 500 },
        { id: '3', total_xp: 250 }
      ]

      const ranked = rankLeaderboard(students)
      expect(ranked).toEqual([
        { id: '2', total_xp: 500, rank: 1 },
        { id: '3', total_xp: 250, rank: 2 },
        { id: '1', total_xp: 100, rank: 3 }
      ])
    })

    it('sorts by streak descending when specified', () => {
      const students = [
        { id: '1', streak_current: 5 },
        { id: '2', streak_current: 2 },
        { id: '3', streak_current: 10 }
      ]

      const ranked = rankLeaderboard(students, 'streak')
      expect(ranked).toEqual([
        { id: '3', streak_current: 10, rank: 1 },
        { id: '1', streak_current: 5, rank: 2 },
        { id: '2', streak_current: 2, rank: 3 }
      ])
    })

    it('handles missing values (treated as 0)', () => {
      const students = [
        { id: '1', total_xp: 100 },
        { id: '2' }, // missing total_xp
        { id: '3', total_xp: 50 }
      ]

      const ranked = rankLeaderboard(students)
      expect(ranked).toEqual([
        { id: '1', total_xp: 100, rank: 1 },
        { id: '3', total_xp: 50, rank: 2 },
        { id: '2', rank: 3 } // treated as 0
      ])
    })
  })
})
