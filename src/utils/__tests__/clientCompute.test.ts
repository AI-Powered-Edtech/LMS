import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest'

import {
  calculateStreak,
  computeLevel,
  computeXPToNextLevel,
  rankLeaderboard,
} from '@/utils/clientCompute'

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('returns level 1 for 0 XP', () => {
      expect(computeLevel(0)).toBe(1)
    })

    it('returns level 1 for 50 XP', () => {
      expect(computeLevel(50)).toBe(1)
    })

    it('returns level 2 for 100 XP', () => {
      expect(computeLevel(100)).toBe(2)
    })

    it('returns level 3 for 499 XP', () => {
      expect(computeLevel(499)).toBe(3)
    })

    it('returns level 10 for 12500 XP', () => {
      expect(computeLevel(12500)).toBe(10)
    })
  })

  describe('computeXPToNextLevel', () => {
    it('calculates metrics for 0 XP', () => {
      expect(computeXPToNextLevel(0)).toEqual({
        current: 0,
        needed: 100,
        pct: 0,
      })
    })

    it('calculates metrics for 50 XP', () => {
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50,
      })
    })

    it('calculates metrics for 100 XP', () => {
      expect(computeXPToNextLevel(100)).toEqual({
        current: 0,
        needed: 150,
        pct: 0,
      })
    })

    it('calculates metrics for 12500 XP (max level)', () => {
      expect(computeXPToNextLevel(12500)).toEqual({
        current: 500,
        needed: 0,
        pct: 100,
      })
    })
  })

  describe('calculateStreak', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2023-10-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns 0s for an empty array', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
    })

    it('returns 1 for a single recent completion', () => {
      expect(calculateStreak([{ completed_at: '2023-10-15T10:00:00Z' }])).toEqual({
        current: 1,
        longest: 1,
      })
    })

    it('returns 3 for three consecutive completions', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T10:00:00Z' },
          { completed_at: '2023-10-14T10:00:00Z' },
          { completed_at: '2023-10-13T10:00:00Z' },
        ])
      ).toEqual({ current: 3, longest: 3 })
    })

    it('calculates current and longest streaks correctly with a break', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-15T10:00:00Z' },
          { completed_at: '2023-10-13T10:00:00Z' },
          { completed_at: '2023-10-12T10:00:00Z' },
        ])
      ).toEqual({ current: 1, longest: 2 })
    })

    it('returns 0 for current streak if no recent completion, but calculates longest streak', () => {
      expect(
        calculateStreak([
          { completed_at: '2023-10-10T10:00:00Z' },
          { completed_at: '2023-10-09T10:00:00Z' },
        ])
      ).toEqual({ current: 0, longest: 2 })
    })
  })

  describe('rankLeaderboard', () => {
    it('sorts by xp descending by default and adds rank', () => {
      const students = [
        { id: '1', total_xp: 10 },
        { id: '2', total_xp: 50 },
      ]
      expect(rankLeaderboard(students)).toEqual([
        { id: '2', total_xp: 50, rank: 1 },
        { id: '1', total_xp: 10, rank: 2 },
      ])
    })

    it('sorts by streak descending and adds rank', () => {
      const students = [
        { id: '1', streak_current: 5 },
        { id: '2', streak_current: 2 },
      ]
      expect(rankLeaderboard(students, 'streak')).toEqual([
        { id: '1', streak_current: 5, rank: 1 },
        { id: '2', streak_current: 2, rank: 2 },
      ])
    })

    it('handles missing values gracefully', () => {
        const students = [
            { id: '1' },
            { id: '2', total_xp: 10 }
        ]
        expect(rankLeaderboard(students)).toEqual([
            { id: '2', total_xp: 10, rank: 1 },
            { id: '1', rank: 2 }
        ])
    })
  })
})
