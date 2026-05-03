import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest'

import { calculateStreak, computeLevel, computeXPToNextLevel, rankLeaderboard } from '../clientCompute'

describe('clientCompute', () => {
  describe('computeLevel', () => {
    it('should return correct levels based on XP thresholds', () => {
      expect(computeLevel(0)).toBe(1)
      expect(computeLevel(99)).toBe(1)
      expect(computeLevel(100)).toBe(2)
      expect(computeLevel(249)).toBe(2)
      expect(computeLevel(250)).toBe(3)
      expect(computeLevel(499)).toBe(3)
      expect(computeLevel(500)).toBe(4)
      expect(computeLevel(999)).toBe(4)
      expect(computeLevel(1000)).toBe(5)
      expect(computeLevel(1999)).toBe(5)
      expect(computeLevel(2000)).toBe(6)
      expect(computeLevel(3499)).toBe(6)
      expect(computeLevel(3500)).toBe(7)
      expect(computeLevel(5499)).toBe(7)
      expect(computeLevel(5500)).toBe(8)
      expect(computeLevel(7999)).toBe(8)
      expect(computeLevel(8000)).toBe(9)
      expect(computeLevel(11999)).toBe(9)
      expect(computeLevel(12000)).toBe(10)
      expect(computeLevel(50000)).toBe(10)
    })
  })

  describe('computeXPToNextLevel', () => {
    it('should calculate current, needed, and pct for Level 1', () => {
      expect(computeXPToNextLevel(50)).toEqual({
        current: 50,
        needed: 100,
        pct: 50
      })
    })

    it('should calculate correctly for higher levels', () => {
      expect(computeXPToNextLevel(350)).toEqual({
        current: 100,
        needed: 250,
        pct: 40
      })
    })

    it('should handle exactly on a threshold', () => {
      expect(computeXPToNextLevel(100)).toEqual({
        current: 0,
        needed: 150,
        pct: 0
      })
    })

    it('should handle max level', () => {
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
      vi.setSystemTime(new Date('2024-03-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return 0 streak for empty completions', () => {
      expect(calculateStreak([])).toEqual({ current: 0, longest: 0 })
    })

    it('should return current 0 if most recent is older than yesterday', () => {
      const completions = [{ completed_at: '2024-03-13T10:00:00Z' }]
      expect(calculateStreak(completions)).toEqual({ current: 0, longest: 1 })
    })

    it('should return current 1 if completed today', () => {
      const completions = [{ completed_at: '2024-03-15T10:00:00Z' }]
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 1 })
    })

    it('should return current 1 if completed yesterday', () => {
      const completions = [{ completed_at: '2024-03-14T10:00:00Z' }]
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 1 })
    })

    it('should calculate multi-day current streak', () => {
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-14T10:00:00Z' },
        { completed_at: '2024-03-13T10:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 3, longest: 3 })
    })

    it('should skip duplicates and compute correctly', () => {
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-15T08:00:00Z' },
        { completed_at: '2024-03-14T10:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 2 })
    })

    it('should calculate longest streak correctly when current is broken', () => {
      const completions = [
        { completed_at: '2024-03-12T10:00:00Z' },
        { completed_at: '2024-03-11T10:00:00Z' },
        { completed_at: '2024-03-10T10:00:00Z' },
        { completed_at: '2024-03-15T10:00:00Z' } // today
      ]
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 3 })
    })

    it('should calculate streaks where all records are the same date', () => {
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-15T09:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 1 })
    })

    it('should hit edge case where longest streak resets and multiple longest runs exist', () => {
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-14T10:00:00Z' },
        { completed_at: '2024-03-12T10:00:00Z' },
        { completed_at: '2024-03-11T10:00:00Z' },
        { completed_at: '2024-03-10T10:00:00Z' }, // Run of 3 here
        { completed_at: '2024-03-05T10:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 2, longest: 3 })
    })

    it('should compute correctly if all items happen in the past', () => {
      const completions = [
        { completed_at: '2024-03-10T10:00:00Z' },
        { completed_at: '2024-03-09T10:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 0, longest: 2 })
    })

    it('should hit edge case where streak is updated but not the last item in the array', () => {
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-14T10:00:00Z' },
        { completed_at: '2024-03-13T10:00:00Z' },
        { completed_at: '2024-03-11T10:00:00Z' } // Breaks the streak here, so `i !== dates.length - 1` condition triggers updates
      ]
      expect(calculateStreak(completions)).toEqual({ current: 3, longest: 3 })
    })

    it('should hit edge case where streak condition is false but previous iterations made streak > current', () => {
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-14T10:00:00Z' },
        { completed_at: '2024-03-13T10:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 3, longest: 3 })
    })

    it('should hit inner coverage for consecutive dates ending early', () => {
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-13T10:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 1, longest: 1 })
    })

    it('should cover streak not being greater than current', () => {
      // We want to enter the if (diffDays === 1) block.
      // We want `i === dates.length - 1` to be false, AND `streak > current` to be false.
      // Because `current = streak` at the end of the loop, this is practically impossible to hit in the current loop structure unless `current` was artificially inflated outside the loop.
      // But we can just provide a test that explicitly checks we don't break logic.
      const completions = [
        { completed_at: '2024-03-15T10:00:00Z' },
        { completed_at: '2024-03-14T10:00:00Z' },
        { completed_at: '2024-03-13T10:00:00Z' },
        { completed_at: '2024-03-12T10:00:00Z' },
        { completed_at: '2024-03-11T10:00:00Z' },
        { completed_at: '2024-03-09T10:00:00Z' }
      ]
      expect(calculateStreak(completions)).toEqual({ current: 5, longest: 5 })
    })
  })

  describe('rankLeaderboard', () => {
    it('should sort by xp and assign ranks by default', () => {
      const students = [
        { id: '1', total_xp: 100 },
        { id: '2', total_xp: 500 },
        { id: '3', total_xp: 50 }
      ]

      const ranked = rankLeaderboard(students)
      expect(ranked[0].id).toBe('2')
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].id).toBe('1')
      expect(ranked[1].rank).toBe(2)
      expect(ranked[2].id).toBe('3')
      expect(ranked[2].rank).toBe(3)
    })

    it('should sort by streak when specified', () => {
      const students = [
        { id: '1', streak_current: 2 },
        { id: '2', streak_current: 5 },
        { id: '3', streak_current: 1 }
      ]

      const ranked = rankLeaderboard(students, 'streak')
      expect(ranked[0].id).toBe('2')
      expect(ranked[0].rank).toBe(1)
      expect(ranked[1].id).toBe('1')
      expect(ranked[1].rank).toBe(2)
      expect(ranked[2].id).toBe('3')
      expect(ranked[2].rank).toBe(3)
    })

    it('should handle missing values safely by treating them as 0', () => {
      const students = [
        { id: '1' },
        { id: '2', total_xp: 10 },
        { id: '3', streak_current: 5 }
      ]

      const rankedXp = rankLeaderboard(students, 'xp')
      expect(rankedXp[0].id).toBe('2') // total_xp: 10
      expect(rankedXp[1].id).toBe('1') // total_xp: 0
      expect(rankedXp[2].id).toBe('3') // total_xp: 0

      const rankedStreak = rankLeaderboard(students, 'streak')
      expect(rankedStreak[0].id).toBe('3') // streak_current: 5
      expect(rankedStreak[1].id).toBe('1') // streak_current: 0
      expect(rankedStreak[2].id).toBe('2') // streak_current: 0
    })
  })
})
